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
    'img-src': ["'self'", 'data:', 'https:', "http:", "https://pagead2.googlesyndication.com", "https://adservice.google.com", "https://www.googletagmanager.com", "https://www.google-analytics.com"],
    'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://pagead2.googlesyndication.com", "https://adservice.google.com", "https://www.googletagmanager.com", "https://partner.googleadservices.com", "https://tpc.googlesyndication.com", "https://www.google-analytics.com"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'font-src': ["'self'", 'data:', 'https:', "http:"],
    'frame-src': ["'self'", "https://googleads.g.doubleclick.net", "https://tpc.googlesyndication.com", "https://www.google.com"],
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
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

@app.after_request
def add_cors_headers(response):
    origin = request.headers.get('Origin')
    # Always add CORS headers regardless of origin
    if origin:
        response.headers['Access-Control-Allow-Origin'] = origin
    else:
        response.headers['Access-Control-Allow-Origin'] = '*'
    
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, Accept, Origin, X-Requested-With'
    response.headers['Access-Control-Max-Age'] = '3600'
    response.headers['Access-Control-Expose-Headers'] = 'Content-Type, Authorization'
    
    # Add security headers
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    
    # Handle OPTIONS requests explicitly
    if request.method == 'OPTIONS':
        return response
        
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
        return redirect('https://fxalert.co.uk')
    
    # Local development redirects
    return redirect('https://localhost')

@app.route("/timezone", methods=["POST", "OPTIONS"])
@limiter.limit("30 per minute")  # Rate limit for timezone updates
def set_timezone():
    """Handle timezone setting requests"""
    if request.method == "OPTIONS":
        return "", 204
    response, status_code = handle_timezone_request()
    return response, status_code

@app.route("/api/timezone", methods=["POST", "OPTIONS"])
@limiter.limit("30 per minute") 
def api_set_timezone():
    """Handle timezone setting requests from /api/timezone (for frontend compatibility)"""
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

# Payment endpoints
@app.route("/payment/create-paypal-order", methods=["POST", "OPTIONS"])
@limiter.limit("20 per minute")
def create_paypal_order():
    """Handle PayPal order creation"""
    if request.method == "OPTIONS":
        return "", 204
    
    try:
        data = request.get_json()
        if not data or 'amount' not in data:
            return {"error": "Missing amount parameter"}, 400
        
        amount = data['amount']
        
        # Validate the amount
        try:
            amount_float = float(amount)
            if amount_float <= 0:
                return {"error": "Invalid amount. Amount must be greater than 0."}, 400
        except (ValueError, TypeError):
            return {"error": "Invalid amount. Please provide a valid number."}, 400
        
        # Check if PayPal credentials are defined
        paypal_client_id = os.environ.get('PAYPAL_CLIENT_ID')
        paypal_client_secret = os.environ.get('PAYPAL_CLIENT_SECRET')
        paypal_api_url = os.environ.get('PAYPAL_API_URL', 'https://api-m.paypal.com')
        
        if not paypal_client_id or not paypal_client_secret:
            logger.error("PayPal credentials are not defined in environment variables")
            return {"error": "Payment configuration error"}, 500
        
        # Create PayPal order
        import base64
        import requests
        
        auth = base64.b64encode(f"{paypal_client_id}:{paypal_client_secret}".encode()).decode()
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Basic {auth}"
        }
        
        payload = {
            "intent": "CAPTURE",
            "purchase_units": [
                {
                    "amount": {
                        "currency_code": "USD",
                        "value": str(float(amount))
                    },
                    "description": "Donation to Forex News Notifier"
                }
            ]
        }
        
        response = requests.post(
            f"{paypal_api_url}/v2/checkout/orders",
            headers=headers,
            json=payload
        )
        
        if response.status_code not in [200, 201]:
            logger.error(f"PayPal API error: {response.status_code}, {response.text}")
            return {"error": "Failed to create PayPal order"}, 500
        
        order_data = response.json()
        logger.info(f"PayPal order created: {order_data['id']} for amount: ${amount}")
        
        return order_data, 200
        
    except Exception as e:
        logger.exception(f"Error creating PayPal order: {str(e)}")
        return {"error": str(e)}, 500

@app.route("/payment/capture-paypal-order", methods=["POST", "OPTIONS"])
@limiter.limit("20 per minute")
def capture_paypal_order():
    """Handle PayPal order capture"""
    if request.method == "OPTIONS":
        return "", 204
    
    try:
        data = request.get_json()
        if not data or 'orderId' not in data:
            return {"error": "Missing orderId parameter"}, 400
        
        order_id = data['orderId']
        
        # Check if PayPal credentials are defined
        paypal_client_id = os.environ.get('PAYPAL_CLIENT_ID')
        paypal_client_secret = os.environ.get('PAYPAL_CLIENT_SECRET')
        paypal_api_url = os.environ.get('PAYPAL_API_URL', 'https://api-m.paypal.com')
        
        if not paypal_client_id or not paypal_client_secret:
            logger.error("PayPal credentials are not defined in environment variables")
            return {"error": "Payment configuration error"}, 500
        
        # Capture PayPal order
        import base64
        import requests
        
        auth = base64.b64encode(f"{paypal_client_id}:{paypal_client_secret}".encode()).decode()
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Basic {auth}"
        }
        
        response = requests.post(
            f"{paypal_api_url}/v2/checkout/orders/{order_id}/capture",
            headers=headers
        )
        
        if response.status_code not in [200, 201]:
            logger.error(f"PayPal API error: {response.status_code}, {response.text}")
            return {"error": "Failed to capture PayPal payment"}, 500
        
        capture_data = response.json()
        logger.info(f"PayPal payment captured: {order_id}")
        
        return capture_data, 200
        
    except Exception as e:
        logger.exception(f"Error capturing PayPal payment: {str(e)}")
        return {"error": str(e)}, 500

# Contact form endpoint
@app.route("/contact", methods=["POST", "OPTIONS"])
@limiter.limit("10 per hour")  # Rate limit contact submissions
def handle_contact_form():
    """Process contact form submissions"""
    if request.method == "OPTIONS":
        return "", 204
    
    try:
        data = request.get_json()
        if not data:
            return {"error": "No data provided"}, 400
            
        # Validate required fields
        required_fields = ['name', 'email', 'message']
        for field in required_fields:
            if field not in data or not data[field].strip():
                return {"error": f"Missing required field: {field}"}, 400
        
        # Extract form data
        name = data.get('name')
        email = data.get('email')
        subject = data.get('subject', 'Contact Form Submission')
        message = data.get('message')
        
        # Basic email validation
        import re
        email_regex = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')
        if not email_regex.match(email):
            return {"error": "Invalid email address"}, 400
            
        # Create email content
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        import smtplib
        
        # Get SMTP settings
        smtp_host = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
        smtp_port = int(os.environ.get('SMTP_PORT', 587))
        smtp_user = os.environ.get('SMTP_USER')
        smtp_password = os.environ.get('SMTP_PASSWORD')
        
        if not all([smtp_host, smtp_user, smtp_password]):
            logger.error("Missing SMTP configuration for contact form")
            return {"error": "Server configuration error"}, 500
            
        # Create email
        recipient_email = "athamer736@gmail.com"  # Updated recipient email
        
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f"FXALERT Contact: {subject}"
        msg['From'] = smtp_user
        msg['To'] = recipient_email
        
        html_content = f"""
        <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; }}
                    h1 {{ color: #2196F3; }}
                    .field {{ margin-bottom: 20px; }}
                    .label {{ font-weight: bold; }}
                    .value {{ margin-top: 5px; }}
                    .footer {{ margin-top: 30px; font-size: 12px; color: #777; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>Contact Form Submission</h1>
                    
                    <div class="field">
                        <div class="label">Name:</div>
                        <div class="value">{name}</div>
                    </div>
                    
                    <div class="field">
                        <div class="label">Email:</div>
                        <div class="value">{email}</div>
                    </div>
                    
                    <div class="field">
                        <div class="label">Subject:</div>
                        <div class="value">{subject}</div>
                    </div>
                    
                    <div class="field">
                        <div class="label">Message:</div>
                        <div class="value">{message}</div>
                    </div>
                    
                    <div class="footer">
                        This email was sent from the FXALERT contact form.
                    </div>
                </div>
            </body>
        </html>
        """
        
        html_part = MIMEText(html_content, 'html')
        msg.attach(html_part)
        
        # Send email
        try:
            server = smtplib.SMTP(smtp_host, smtp_port)
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)
            server.quit()
            
            logger.info(f"Contact form submission from {email} successfully processed")
            return {"success": True, "message": "Your message has been sent successfully!"}, 200
            
        except Exception as e:
            logger.error(f"Error sending contact form email: {str(e)}")
            return {"error": "Failed to send email, please try again later"}, 500
        
    except Exception as e:
        logger.exception(f"Error processing contact form: {str(e)}")
        return {"error": "Server error processing your request"}, 500

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
    try:
        app.run(
            host="0.0.0.0",
            port=5000,
            debug=False
        )
    except Exception as e:
        logger.error(f"Failed to start server: {str(e)}")
        logger.error("Error details:", exc_info=True)
        sys.exit(1)
    
    
    
    
    
    