import os
from dotenv import load_dotenv
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    # Get the absolute path of the current script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    env_path = os.path.join(script_dir, '.env')
    
    logger.info(f"Looking for .env file at: {env_path}")
    logger.info(f"File exists: {os.path.exists(env_path)}")
    
    # Load environment variables
    load_dotenv(env_path)
    
    # Check database configuration
    db_vars = {
        'DB_HOST': os.getenv('DB_HOST'),
        'DB_PORT': os.getenv('DB_PORT'),
        'DB_NAME': os.getenv('DB_NAME'),
        'DB_USER': os.getenv('DB_USER'),
        'DB_PASSWORD': os.getenv('DB_PASSWORD')
    }
    
    logger.info("Database configuration:")
    for key, value in db_vars.items():
        # Mask the password
        if key == 'DB_PASSWORD':
            value = '*' * len(value) if value else None
        logger.info(f"{key}: {value}")

if __name__ == "__main__":
    main() 