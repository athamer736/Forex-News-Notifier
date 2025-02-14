import os
import sys
import ssl
from waitress import serve
from paste.translogger import TransLogger
import logging
from logging.handlers import RotatingFileHandler

# Add the project root to Python path
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, root_dir)

# Configure logging with both file and console output
log_dir = os.path.join(root_dir, 'logs')
os.makedirs(log_dir, exist_ok=True)

log_file = os.path.join(log_dir, 'waitress.log')

# Configure root logger
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

# Create logger
logger = logging.getLogger('waitress')
logger.setLevel(logging.INFO)

# Clear any existing handlers
logger.handlers = []

# Create rotating file handler
file_handler = RotatingFileHandler(
    log_file,
    maxBytes=10*1024*1024,  # 10MB
    backupCount=5,
    encoding='utf-8'
)
file_handler.setLevel(logging.INFO)

# Create console handler
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setLevel(logging.INFO)

# Create formatter
formatter = logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

# Add formatter to handlers
file_handler.setFormatter(formatter)
console_handler.setFormatter(formatter)

# Add handlers to logger
logger.addHandler(file_handler)
logger.addHandler(console_handler)

# Log initial startup message
logger.info('='*50)
logger.info('Starting Waitress server initialization')
logger.info(f'Python version: {sys.version}')
logger.info(f'Current working directory: {os.getcwd()}')
logger.info(f'Root directory: {root_dir}')
logger.info(f'Log file location: {log_file}')
logger.info('='*50)

try:
    # Import Flask app
    logger.info('Importing Flask application...')
    from app import app
    logger.info('Flask application imported successfully')
except Exception as e:
    logger.error('Failed to import Flask application', exc_info=True)
    sys.exit(1)

def create_ssl_context():
    """Create SSL context for HTTPS"""
    try:
        logger.info('Creating SSL context...')
        cert_file = 'C:/Certbot/live/fxalert.co.uk/fullchain.pem'
        key_file = 'C:/Certbot/live/fxalert.co.uk/privkey.pem'
        
        # Check if certificate files exist
        if not os.path.exists(cert_file):
            raise FileNotFoundError(f'Certificate file not found: {cert_file}')
        if not os.path.exists(key_file):
            raise FileNotFoundError(f'Key file not found: {key_file}')
            
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.load_cert_chain(
            certfile=cert_file,
            keyfile=key_file
        )
        logger.info('SSL context created successfully')
        return context
    except Exception as e:
        logger.error('Failed to create SSL context', exc_info=True)
        return None

if __name__ == '__main__':
    try:
        # Set environment variables
        os.environ['FLASK_ENV'] = 'production'
        os.environ['FLASK_DEBUG'] = '0'
        
        # Create SSL context
        ssl_context = create_ssl_context()
        if not ssl_context:
            logger.error("Failed to create SSL context. Exiting.")
            sys.exit(1)
        
        # Wrap the Flask app with TransLogger
        logger.info('Configuring request logging...')
        app_with_logging = TransLogger(
            app,
            setup_console_handler=False,
            logger_name='waitress.requests'
        )
        
        # Start the server
        logger.info('Starting Waitress server...')
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
        logger.error('Failed to start server', exc_info=True)
        sys.exit(1) 