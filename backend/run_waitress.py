import os
import sys
from waitress import serve
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

# Import our Flask app
from app import app

if __name__ == '__main__':
    try:
        # Log startup information
        logger.info('Starting Waitress server...')
        logger.info(f'Current working directory: {os.getcwd()}')
        
        # Start Waitress server
        serve(
            app,
            host='0.0.0.0',
            port=5000,
            threads=4,  # Number of threads to handle requests
            url_scheme='https',
            channel_timeout=30,
            cleanup_interval=30,
        )
    except Exception as e:
        logger.error(f'Failed to start server: {str(e)}')
        logger.error('Exception details:', exc_info=True)
        sys.exit(1) 