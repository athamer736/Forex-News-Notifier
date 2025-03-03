import os
import sys
import logging
from logging.handlers import RotatingFileHandler
from cheroot.wsgi import Server as WSGIServer
from cheroot.ssl.builtin import BuiltinSSLAdapter
from paste.translogger import TransLogger

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
logger.info('Starting server initialization')
logger.info(f'Python version: {sys.version}')
logger.info(f'Current working directory: {os.getcwd()}')
logger.info(f'Root directory: {root_dir}')
logger.info(f'Log file location: {log_file}')
logger.info('='*50)

try:
    # Import Flask app
    logger.info('Importing Flask application...')
    from app import app
    
    # Verify CORS configuration
    if 'flask_cors' not in [m.__name__ for m in app.extensions.values()]:
        logger.warning('CORS extension not detected in Flask app. Manually adding CORS support...')
        from flask_cors import CORS
        CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)
    else:
        logger.info('CORS extension detected in Flask app')
    
    logger.info('Flask application imported successfully')
except Exception as e:
    logger.error('Failed to import Flask application', exc_info=True)
    sys.exit(1)

def create_ssl_adapter():
    """Create SSL adapter for HTTPS"""
    try:
        logger.info('Creating SSL adapter...')
        cert_file = 'C:/Certbot/live/fxalert.co.uk/fullchain.pem'
        key_file = 'C:/Certbot/live/fxalert.co.uk/privkey.pem'
        
        # Check if certificate files exist
        if not os.path.exists(cert_file):
            raise FileNotFoundError(f'Certificate file not found: {cert_file}')
        if not os.path.exists(key_file):
            raise FileNotFoundError(f'Key file not found: {key_file}')
            
        ssl_adapter = BuiltinSSLAdapter(
            cert_file,
            key_file,
            certificate_chain=cert_file
        )
        logger.info('SSL adapter created successfully')
        return ssl_adapter
    except Exception as e:
        logger.error('Failed to create SSL adapter', exc_info=True)
        return None

if __name__ == '__main__':
    try:
        # Set environment variables
        os.environ['FLASK_ENV'] = 'production'
        os.environ['FLASK_DEBUG'] = '0'
        
        # Wrap the Flask app with TransLogger
        logger.info('Configuring request logging...')
        app_with_logging = TransLogger(
            app,
            setup_console_handler=False,
            logger_name='waitress.requests'
        )
        
        # Create and configure the WSGI server
        logger.info('Creating WSGI server...')
        server = WSGIServer(
            ('0.0.0.0', 5000),
            app_with_logging,
            numthreads=4,
            request_queue_size=100,
            timeout=30
        )
        
        # Set up SSL
        ssl_adapter = create_ssl_adapter()
        if ssl_adapter:
            server.ssl_adapter = ssl_adapter
            logger.info('SSL configured successfully')
            logger.info('Server will be available at https://0.0.0.0:5000')
        else:
            logger.error("Failed to configure SSL. Exiting.")
            sys.exit(1)
        
        # Start the server
        logger.info('Starting server...')
        server.safe_start()
        
    except Exception as e:
        logger.error('Failed to start server', exc_info=True)
        sys.exit(1) 