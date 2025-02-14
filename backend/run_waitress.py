import os
import sys
import ssl
from waitress import serve
from paste.translogger import TransLogger
import logging
from logging.handlers import RotatingFileHandler

# Configure logging
log_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'logs')
os.makedirs(log_dir, exist_ok=True)

log_file = os.path.join(log_dir, 'waitress.log')
logger = logging.getLogger('waitress')
logger.setLevel(logging.INFO)

# Create rotating file handler
file_handler = RotatingFileHandler(log_file, maxBytes=1024*1024, backupCount=5)
file_handler.setLevel(logging.INFO)

# Create console handler
console_handler = logging.StreamHandler(sys.stdout)
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

# Import our Flask app
from app import app

def create_ssl_context():
    """Create SSL context for HTTPS"""
    try:
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.load_cert_chain(
            certfile='C:/Certbot/live/fxalert.co.uk/fullchain.pem',
            keyfile='C:/Certbot/live/fxalert.co.uk/privkey.pem'
        )
        return context
    except Exception as e:
        logger.error(f"Failed to create SSL context: {str(e)}")
        return None

if __name__ == '__main__':
    try:
        # Log startup information
        logger.info('Starting Waitress server...')
        logger.info(f'Current working directory: {os.getcwd()}')
        
        # Wrap the Flask app with TransLogger for request logging
        app_with_logging = TransLogger(
            app,
            setup_console_handler=False,
            logger_name='waitress'
        )
        
        # Create SSL context
        ssl_context = create_ssl_context()
        if not ssl_context:
            logger.error("Failed to create SSL context. Exiting.")
            sys.exit(1)
        
        logger.info("Starting Waitress server with SSL...")
        serve(
            app_with_logging,
            host='0.0.0.0',
            port=5000,
            threads=4,
            url_scheme='https',
            channel_timeout=30,
            cleanup_interval=30,
            _ssl_context=ssl_context
        )
    except Exception as e:
        logger.error(f'Failed to start server: {str(e)}')
        logger.error('Exception details:', exc_info=True)
        sys.exit(1) 