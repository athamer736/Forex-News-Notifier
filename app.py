from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
import logging
import socket
import requests
import threading
import time
from datetime import datetime

from fetch_events import fetch_events
from timezone_handler import set_user_timezone, get_user_timezone, convert_to_local_time
from event_filter import filter_events_by_range, TimeRange
from event_store import get_filtered_events, event_store, get_cache_status, load_cached_events

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)

def update_cache():
    """Background task to update the event cache periodically"""
    while True:
        try:
            logger.info("Updating event cache...")
            fetch_events()
            logger.info(f"Cache updated successfully. Next update in 1 hour. Current cache size: {len(event_store['events'])} events")
            # Sleep for 1 hour
            time.sleep(3600)
        except Exception as e:
            logger.error(f"Error updating cache: {str(e)}")
            # If there's an error, wait 5 minutes before retrying
            time.sleep(300)

def start_background_tasks():
    """Start background tasks for the application"""
    # Try to load from cache first
    logger.info("Attempting to load events from cache...")
    if load_cached_events():
        logger.info("Successfully loaded events from cache")
    else:
        # Initial fetch of events if cache load fails
        logger.info("Cache load failed. Performing initial event fetch...")
        try:
            fetch_events()
            logger.info(f"Initial cache populated with {len(event_store['events'])} events")
        except Exception as e:
            logger.error(f"Error during initial event fetch: {str(e)}")

    # Start background thread for periodic updates
    update_thread = threading.Thread(target=update_cache, daemon=True)
    update_thread.start()
    logger.info("Background update thread started")

def get_local_ip():
    """Get the local IP address"""
    try:
        # Try to get the local IP by creating a socket
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))  # Doesn't actually send any data
        local_ip = s.getsockname()[0]
        s.close()
        
        # If we got a different local IP, add both
        if local_ip != "192.168.0.144":
            logger.info(f"Detected different local IP: {local_ip}")
            return [local_ip, "192.168.0.144"]
        return [local_ip]
    except Exception as e:
        logger.error(f"Error getting local IP: {e}")
        return ["192.168.0.144"]

def get_server_ip():
    """Get the server's public IP address"""
    try:
        response = requests.get('https://api.ipify.org')
        return response.text
    except Exception as e:
        logger.error(f"Error getting server IP: {e}")
        return None

# Get IP addresses
LOCAL_IPS = get_local_ip()  # Now returns a list
SERVER_IP = get_server_ip() or "141.95.123.145"  # Fallback to known server IP

logger.info(f"Local IPs: {LOCAL_IPS}")
logger.info(f"Server IP: {SERVER_IP}")

# Build allowed origins dynamically
ALLOWED_ORIGINS = [
    # Local development
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    # Explicit local network IP
    "http://192.168.0.144:3000",
    "http://192.168.0.144:5000"
]

# Add any additional detected local IPs
for ip in LOCAL_IPS:
    if ip != "192.168.0.144":  # Don't duplicate if it's already the known IP
        ALLOWED_ORIGINS.extend([
            f"http://{ip}:3000",
            f"http://{ip}:5000"
        ])

# Add server origins
ALLOWED_ORIGINS.extend([
    f"http://{SERVER_IP}:3000",
    f"http://{SERVER_IP}:5000"
])

logger.info(f"Allowed origins: {ALLOWED_ORIGINS}")

def is_local_request():
    """Check if the request is coming from the local network"""
    client_ip = request.remote_addr
    return (
        client_ip.startswith('127.') or 
        client_ip.startswith('192.168.') or 
        client_ip in LOCAL_IPS
    )

def get_appropriate_origin(request_origin):
    """Get the appropriate origin based on the request"""
    if not request_origin:
        return None

    # Log the incoming request details
    logger.debug(f"Request origin: {request_origin}")
    logger.debug(f"Remote addr: {request.remote_addr}")
    
    # If it's a local request, prioritize local origins
    if is_local_request():
        logger.debug("Local request detected")
        for origin in ALLOWED_ORIGINS:
            if LOCAL_IPS[0] in origin or 'localhost' in origin or '127.0.0.1' in origin:
                if origin == request_origin:
                    return origin
    else:
        logger.debug("Remote request detected")
        # For remote requests, try server IP first
        for origin in ALLOWED_ORIGINS:
            if SERVER_IP in origin:
                if origin == request_origin:
                    return origin

    # If no match found, check if the origin is in allowed list
    if request_origin in ALLOWED_ORIGINS:
        return request_origin
        
    logger.warning(f"No matching origin found for: {request_origin}")
    return None

# Enable CORS with security settings
CORS(app, 
    resources={r"/*": {
        "origins": ALLOWED_ORIGINS,
        "methods": ["GET", "POST", "OPTIONS", "HEAD"],
        "allow_headers": ["Content-Type", "Authorization", "Accept", "Origin"],
        "expose_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True,
        "max_age": 600
    }},
    supports_credentials=True
)

@app.before_request
def handle_preflight():
    """Handle preflight requests"""
    if request.method == "OPTIONS":
        response = app.make_default_options_response()
        origin = request.headers.get('Origin')
        appropriate_origin = get_appropriate_origin(origin)
        
        if appropriate_origin:
            response.headers['Access-Control-Allow-Origin'] = appropriate_origin
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS, HEAD'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, Accept, Origin'
            response.headers['Access-Control-Allow-Credentials'] = 'true'
            response.headers['Access-Control-Max-Age'] = '600'
            logger.debug(f"Preflight approved for: {appropriate_origin}")
        else:
            logger.warning(f"Preflight denied for: {origin}")
            
        return response

@app.after_request
def after_request(response):
    """Add CORS headers to all responses"""
    if request.method != 'OPTIONS':
        origin = request.headers.get('Origin')
        appropriate_origin = get_appropriate_origin(origin)
        
        if appropriate_origin:
            response.headers['Access-Control-Allow-Origin'] = appropriate_origin
            response.headers['Access-Control-Allow-Credentials'] = 'true'
            logger.debug(f"Response headers added for: {appropriate_origin}")
            
    return response

@app.before_request
def initialize_app():
    """Initialize the application on first request"""
    if not hasattr(app, '_got_first_request'):
        start_background_tasks()
        app._got_first_request = True

# Valid time ranges for filtering
VALID_TIME_RANGES = ['24h', 'today', 'tomorrow', 'week', 'remaining_week']

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/timezone", methods=["POST", "OPTIONS"])
def set_timezone():
    """Handle timezone setting requests"""
    if request.method == "OPTIONS":
        return "", 204  # No content needed for preflight response
        
    try:
        data = request.get_json()
        timezone = data.get('timezone')
        offset = data.get('offset')
        user_id = data.get('userId', 'default')
        
        preferences = set_user_timezone(timezone, offset, user_id)
        return jsonify({"message": "Timezone preference saved", "preferences": preferences}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.exception("Error setting timezone")
        return jsonify({"error": str(e)}), 500

@app.route("/events", methods=["GET", "OPTIONS"])
def get_events():
    """Handle event retrieval requests"""
    if request.method == "OPTIONS":
        return "", 204  # No content needed for preflight response
        
    try:
        # Get user's timezone and time range preference
        user_id = request.args.get('userId', 'default')
        time_range = request.args.get('range', '24h')
        currencies = request.args.get('currencies', '')  # Get currencies as comma-separated string
        
        # Parse currencies into a list
        selected_currencies = [c.strip().upper() for c in currencies.split(',')] if currencies else []
        
        # Validate time range
        if time_range not in VALID_TIME_RANGES:
            return jsonify({
                'error': f'Invalid time range. Must be one of: {", ".join(VALID_TIME_RANGES)}'
            }), 400

        # Get user's timezone from storage
        user_timezone = get_user_timezone(user_id)
        if not user_timezone:
            logger.warning(f"No timezone found for user {user_id}, defaulting to UTC")
            user_timezone = 'UTC'

        # Fetch fresh events if needed (this will update the store)
        try:
            fetch_events()
        except Exception as e:
            logger.error(f"Error fetching events: {str(e)}")
            # Continue with existing stored events if available

        # Get filtered events based on user's preferences
        filtered_events = get_filtered_events(time_range, user_timezone, selected_currencies)
        
        return jsonify(filtered_events)

    except Exception as e:
        logger.exception("Error processing events request")
        return jsonify({'error': str(e)}), 500

@app.route("/cache/status")
def cache_status():
    """Get the current status of the event cache"""
    return jsonify(get_cache_status())

@app.route("/cache/refresh", methods=["POST"])
def refresh_cache():
    """Force a refresh of the event cache"""
    try:
        fetch_events()
        return jsonify({
            "message": "Cache refresh successful",
            "status": get_cache_status()
        })
    except Exception as e:
        return jsonify({
            "error": str(e),
            "status": get_cache_status()
        }), 500

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )
    
    
    
    
    