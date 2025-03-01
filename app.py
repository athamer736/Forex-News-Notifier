from flask import Flask, render_template, request, redirect
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_talisman import Talisman
import logging
import redis
from redis.exceptions import ConnectionError as RedisConnectionError, TimeoutError as RedisTimeoutError
import os
import sys
import gc
import threading
import time
import psutil
import atexit

from backend.main import (
    get_local_ip,
    get_server_ip,
    build_allowed_origins,
    get_appropriate_origin,
    get_cors_headers,
    start_background_tasks,
    stop_background_tasks,
    handle_timezone_request,
    handle_events_request,
    handle_cache_status_request,
    handle_cache_refresh_request,
    handle_subscription_request,
    handle_verification_request,
    handle_unsubscribe_request
)

# Configure logging
log_dir = os.path.join(os.path.dirname(__file__), 'logs')
os.makedirs(log_dir, exist_ok=True)

log_file = os.path.join(log_dir, 'app.log')
logger = logging.getLogger('FlaskApp')

# Create file handler
file_handler = logging.FileHandler(log_file)
file_handler.setLevel(logging.INFO)

# Create console handler
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)

# Create formatter
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                            datefmt='%Y-%m-%d %H:%M:%S')

# Add formatter to handlers
file_handler.setFormatter(formatter)
console_handler.setFormatter(formatter)

# Add handlers to logger
logger.addHandler(file_handler)
logger.addHandler(console_handler)
logger.setLevel(logging.INFO)

# Flag to track initialization
app_initialized = False

# Set up memory monitoring
memory_monitor_thread = None
memory_monitor_stop = threading.Event()

def monitor_memory_usage():
    """Background thread to monitor memory usage"""
    logger.info("Memory monitoring started")
    process = psutil.Process(os.getpid())
    
    while not memory_monitor_stop.is_set():
        try:
            # Get memory info
            mem_info = process.memory_info()
            mem_percent = process.memory_percent()
            
            # Log memory usage (MB)
            mem_usage_mb = mem_info.rss / 1024 / 1024
            logger.info(f"Memory usage: {mem_usage_mb:.2f} MB ({mem_percent:.1f}%)")
            
            # If memory usage is too high, force garbage collection
            if mem_percent > 70:
                logger.warning(f"High memory usage detected: {mem_percent:.1f}%. Running garbage collection.")
                gc.collect()
                
                # Log memory after collection
                mem_info = process.memory_info()
                mem_percent = process.memory_percent()
                mem_usage_mb = mem_info.rss / 1024 / 1024
                logger.info(f"Memory after GC: {mem_usage_mb:.2f} MB ({mem_percent:.1f}%)")
        except Exception as e:
            logger.error(f"Error in memory monitoring: {str(e)}")
        
        # Sleep for 5 minutes
        for _ in range(300):
            if memory_monitor_stop.is_set():
                break
            time.sleep(1)

app = Flask(__name__)

# Basic security headers with HTTPS
csp = {
    'default-src': ["'self'", "https:", "http:"],
    'img-src': ["'self'", 'data:', 'https:', "http:"],
    'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'font-src': ["'self'", 'data:', 'https:', "http:"],
    'frame-ancestors': "'none'",
    'form-action': "'self'",
    'connect-src': ["'self'", "https:", "http:", "*"]
}

# Enable HTTPS and security features
Talisman(app,
    force_https=False,  # Don't force HTTPS
    strict_transport_security=False,
    session_cookie_secure=False,
    session_cookie_http_only=True,
    feature_policy={
        'geolocation': "'none'",
        'microphone': "'none'",
        'camera': "'none'",
        'payment': "'none'",
        'usb': "'none'"
    },
    content_security_policy=csp,
    content_security_policy_nonce_in=['script-src']
)

# Try to use Redis for rate limiting, fall back to memory if Redis is not available
storage_uri = "memory://"  # Default to memory storage
try:
    if os.getenv('USE_REDIS', 'false').lower() == 'true':
        redis_client = redis.Redis(
            host=os.getenv('REDIS_HOST', 'localhost'),
            port=int(os.getenv('REDIS_PORT', 6379)),
            db=0,
            socket_timeout=2,
            decode_responses=True
        )
        redis_client.ping()  # Test connection
        storage_uri = f"redis://{os.getenv('REDIS_HOST', 'localhost')}:{os.getenv('REDIS_PORT', 6379)}/0"
        logger.info("Using Redis for rate limiting")
except (RedisConnectionError, RedisTimeoutError, ConnectionRefusedError) as e:
    logger.warning(f"Redis not available, using memory storage: {str(e)}")

# Rate Limiting
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri=storage_uri,
    strategy="fixed-window"
)

# Get IP addresses and build allowed origins
LOCAL_IPS = get_local_ip()
SERVER_IP = get_server_ip() or "fxalert.co.uk"  # Fallback to domain name
DOMAIN = "fxalert.co.uk"
ALLOWED_ORIGINS = [
    "https://localhost:3000",
    "https://localhost:5000",
    "https://127.0.0.1:3000",
    "https://127.0.0.1:5000",
    "https://192.168.0.144:3000",
    "https://192.168.0.144:5000",
    "https://fxalert.co.uk",
    "https://www.fxalert.co.uk",
    "https://fxalert.co.uk:3000",
    "https://fxalert.co.uk:5000",
    "https://141.95.123.145:3000",
    "https://141.95.123.145:5000"
]

# Configure CORS
CORS(app, resources={r"/*": {"origins": [
    "https://fxalert.co.uk",
    "https://fxalert.co.uk:3000",
    "https://fxalert.co.uk:5000"
]}}, supports_credentials=True)

@app.after_request
def add_cors_headers(response):
    origin = request.headers.get('Origin')
    if origin in ALLOWED_ORIGINS:
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, Accept, Origin, X-Requested-With'
        response.headers['Access-Control-Max-Age'] = '3600'
        response.headers['Access-Control-Expose-Headers'] = 'Content-Type, Authorization'
        # Add security headers
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
    return response

@app.before_request
def initialize_app():
    """Initialize the application on first request"""
    global app_initialized, memory_monitor_thread
    if not app_initialized:
        logger.info("Initializing application on first request")
        # Start background tasks for event processing
        start_background_tasks()
        
        # Start memory monitoring
        memory_monitor_stop.clear()
        memory_monitor_thread = threading.Thread(target=monitor_memory_usage, daemon=True)
        memory_monitor_thread.start()
        
        # Force garbage collection after initialization
        gc.collect()
        
        app_initialized = True
        logger.info("Application initialization complete")

@app.route("/")
@limiter.limit("60 per minute")
def home():
    """Redirect to frontend application"""
    host = request.headers.get('Host', '')
    
    # Production domain redirects
    if 'fxalert.co.uk' in host:
        return redirect('https://fxalert.co.uk:3000')
    
    # Local development redirects - always use HTTPS since we have SSL
    return redirect('https://localhost:3000')

@app.route("/timezone", methods=["POST", "OPTIONS"])
@limiter.limit("30 per minute")  # Rate limit for timezone updates
def set_timezone():
    """Handle timezone setting requests"""
    if request.method == "OPTIONS":
        return "", 204
    response, status_code = handle_timezone_request()
    return response, status_code

@app.route("/events", methods=["GET", "OPTIONS"])
@limiter.limit("120 per minute")  # Rate limit for event fetching
def get_events():
    """Handle event retrieval requests"""
    if request.method == "OPTIONS":
        return "", 204
    response, status_code = handle_events_request()
    return response, status_code

@app.route("/cache/status")
@limiter.limit("30 per minute")  # Rate limit for cache status checks
def cache_status():
    """Get the current status of the event cache"""
    response, status_code = handle_cache_status_request()
    return response, status_code

@app.route("/cache/refresh", methods=["POST"])
@limiter.limit("10 per minute")  # Strict rate limit for cache refresh
def refresh_cache():
    """Force a refresh of the event cache"""
    response, status_code = handle_cache_refresh_request()
    return response, status_code

@app.route("/subscribe", methods=["POST", "OPTIONS"])
@limiter.limit("10 per hour")  # Strict rate limit for subscriptions
def subscribe():
    """Handle email subscription requests"""
    if request.method == "OPTIONS":
        return "", 204
    response, status_code = handle_subscription_request()
    return response, status_code

@app.route("/verify/<token>")
def verify_subscription(token):
    """Handle subscription verification"""
    response, status_code = handle_verification_request(token)
    return response, status_code

@app.route("/unsubscribe/<token>")
def unsubscribe(token):
    """Handle unsubscribe requests"""
    response, status_code = handle_unsubscribe_request(token)
    return response, status_code

@app.route("/memory-status")
def memory_status():
    """Get the current memory status"""
    try:
        process = psutil.Process(os.getpid())
        mem_info = process.memory_info()
        mem_usage_mb = mem_info.rss / 1024 / 1024
        mem_percent = process.memory_percent()
        
        cpu_percent = process.cpu_percent(interval=0.1)
        
        status = {
            "memory_usage_mb": round(mem_usage_mb, 2),
            "memory_percent": round(mem_percent, 2),
            "cpu_percent": round(cpu_percent, 2),
            "gc_stats": {
                "collections": gc.get_count(),
                "garbage_objects": len(gc.garbage)
            },
            "uptime_seconds": time.time() - process.create_time()
        }
        
        return status, 200
    except Exception as e:
        logger.error(f"Error getting memory status: {str(e)}")
        return {"error": str(e)}, 500

# Error handlers
@app.errorhandler(429)
def ratelimit_handler(e):
    return {"error": "Rate limit exceeded. Please try again later."}, 429

@app.errorhandler(500)
def internal_error(e):
    logger.error(f"Internal server error: {str(e)}")
    return {"error": "Internal server error. Please try again later."}, 500

@app.errorhandler(404)
def not_found(e):
    return {"error": "Resource not found."}, 404

# Clean up function to run on application shutdown
def cleanup_resources():
    """Clean up resources on application shutdown"""
    logger.info("Application shutting down, cleaning up resources...")
    
    # Stop memory monitoring
    memory_monitor_stop.set()
    if memory_monitor_thread and memory_monitor_thread.is_alive():
        memory_monitor_thread.join(timeout=2)
    
    # Stop background tasks
    stop_background_tasks()
    
    # Run garbage collection
    gc.collect()
    
    logger.info("Cleanup complete, goodbye!")

# Register the cleanup function to run on exit
atexit.register(cleanup_resources)

if __name__ == "__main__":
    try:
        # Run garbage collection before starting
        gc.collect()
        logger.info("Starting application server...")
        
        app.run(
            host="0.0.0.0",
            port=5000,
            debug=False
        )
    except Exception as e:
        logger.error(f"Failed to start server: {str(e)}")
        logger.error("Error details:", exc_info=True)
        sys.exit(1)
    
    
    
    
    