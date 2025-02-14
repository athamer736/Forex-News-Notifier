import os
import sys
from waitress import serve
from app import app
from paste.translogger import TransLogger
import ssl
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/waitress.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger('waitress')

def create_ssl_context():
    """Create SSL context for HTTPS"""
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain(
        certfile='C:/Certbot/live/fxalert.co.uk/fullchain.pem',
        keyfile='C:/Certbot/live/fxalert.co.uk/privkey.pem'
    )
    return context

if __name__ == '__main__':
    try:
        # Wrap the application in a logging middleware
        app_with_logging = TransLogger(app, setup_console_handler=True)
        
        logger.info('Starting Waitress server...')
        serve(
            app_with_logging,
            host='0.0.0.0',
            port=5000,
            url_scheme='https',
            threads=4,
            connection_limit=1000,
            channel_timeout=30,
            cleanup_interval=30,
            ssl_context=create_ssl_context()
        )
    except Exception as e:
        logger.error(f'Failed to start server: {str(e)}')
        sys.exit(1) 