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

from backend.main import (
    get_local_ip,
    get_server_ip,
    build_allowed_origins,
    get_appropriate_origin,
    get_cors_headers,
    start_background_tasks,
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
    force_https=True,  # Force HTTPS
    strict_transport_security=True,
    session_cookie_secure=True,
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
SERVER_IP = get_server_ip() or "141.95.123.145"  # Fallback to known server IP
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
    "https://141.95.123.145:3000",
    "https://141.95.123.145:5000"
]

# Simple CORS configuration
CORS(app, 
    resources={
        r"/*": {
            "origins": ALLOWED_ORIGINS,
            "methods": ["GET", "POST", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization", "Accept", "Origin"],
            "supports_credentials": True,
            "expose_headers": ["Content-Type", "Authorization"],
            "max_age": 600
        }
    },
    supports_credentials=True
)

@app.after_request
def add_cors_headers(response):
    origin = request.headers.get('Origin')
    if origin in ALLOWED_ORIGINS:
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, Accept, Origin'
        response.headers['Access-Control-Max-Age'] = '600'
        response.headers['Access-Control-Expose-Headers'] = 'Content-Type, Authorization'
    return response

@app.before_request
def initialize_app():
    """Initialize the application on first request"""
    if not hasattr(app, '_got_first_request'):
        start_background_tasks()
        app._got_first_request = True

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

if __name__ == "__main__":
    cert_path = r"C:\Certbot\live\fxalert.co.uk\fullchain.pem"
    key_path = r"C:\Certbot\live\fxalert.co.uk\privkey.pem"
    
    try:
        # Check if certificate files exist and are readable
        if not os.path.exists(cert_path):
            logger.error(f"Certificate file not found: {cert_path}")
            sys.exit(1)
        if not os.path.exists(key_path):
            logger.error(f"Private key file not found: {key_path}")
            sys.exit(1)
            
        # Try to read the files to verify permissions
        with open(cert_path, 'rb') as f:
            f.read()
        with open(key_path, 'rb') as f:
            f.read()
            
        ssl_context = (cert_path, key_path)
        logger.info("SSL certificates loaded successfully")
        
        # Try to start on port 443 first
        try:
            logger.info("Starting Flask backend on port 443 (HTTPS)...")
            app.run(
                host="0.0.0.0",
                port=443,
                debug=False,
                ssl_context=ssl_context
            )
        except PermissionError:
            # If permission denied on 443, try 5000
            logger.info("Permission denied on port 443, falling back to port 5000...")
            logger.info("Note: Frontend will still run on port 3000")
            app.run(
                host="0.0.0.0",
                port=5000,
                debug=False,
                ssl_context=ssl_context
            )
            
    except Exception as e:
        logger.error(f"Failed to start server: {str(e)}")
        logger.error("Error details:", exc_info=True)
        sys.exit(1)
    
    
    
    
    