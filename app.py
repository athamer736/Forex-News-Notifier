from flask import Flask, render_template, request
from flask_cors import CORS
import logging

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
    handle_cache_refresh_request
)

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Get IP addresses and build allowed origins
LOCAL_IPS = get_local_ip()
SERVER_IP = get_server_ip() or "141.95.123.145"  # Fallback to known server IP
ALLOWED_ORIGINS = build_allowed_origins(LOCAL_IPS, SERVER_IP)

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
        appropriate_origin = get_appropriate_origin(origin, request.remote_addr, LOCAL_IPS, ALLOWED_ORIGINS, SERVER_IP)
        
        if appropriate_origin:
            headers = get_cors_headers(appropriate_origin)
            for key, value in headers.items():
                response.headers[key] = value
            logger.debug(f"Preflight approved for: {appropriate_origin}")
        else:
            logger.warning(f"Preflight denied for: {origin}")
            
        return response

@app.after_request
def after_request(response):
    """Add CORS headers to all responses"""
    if request.method != 'OPTIONS':
        origin = request.headers.get('Origin')
        appropriate_origin = get_appropriate_origin(origin, request.remote_addr, LOCAL_IPS, ALLOWED_ORIGINS, SERVER_IP)
        
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

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/timezone", methods=["POST", "OPTIONS"])
def set_timezone():
    """Handle timezone setting requests"""
    if request.method == "OPTIONS":
        return "", 204
    response, status_code = handle_timezone_request()
    return response, status_code

@app.route("/events", methods=["GET", "OPTIONS"])
def get_events():
    """Handle event retrieval requests"""
    if request.method == "OPTIONS":
        return "", 204
    response, status_code = handle_events_request()
    return response, status_code

@app.route("/cache/status")
def cache_status():
    """Get the current status of the event cache"""
    response, status_code = handle_cache_status_request()
    return response, status_code

@app.route("/cache/refresh", methods=["POST"])
def refresh_cache():
    """Force a refresh of the event cache"""
    response, status_code = handle_cache_refresh_request()
    return response, status_code

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )
    
    
    
    
    