import sys
from pathlib import Path
import time
import logging
import os
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
import pymysql
from dotenv import load_dotenv

# Add the project root directory to Python path
project_root = str(Path(__file__).parent.parent)
sys.path.append(project_root)

# Load environment variables
load_dotenv(os.path.join(project_root, '.env'))

# Configure logging
log_dir = os.path.join(project_root, 'logs')
os.makedirs(log_dir, exist_ok=True)

log_file = os.path.join(log_dir, 'event_scheduler.log')
logger = logging.getLogger('EventScheduler')

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

def test_db_connection():
    """Test the database connection before starting the scheduler."""
    try:
        # Get database configuration from environment variables
        host = os.getenv('DB_HOST', '141.95.123.145')
        port = int(os.getenv('DB_PORT', '3306'))
        user = os.getenv('DB_USER', 'forex_user')
        password = os.getenv('DB_PASSWORD', 'your_password_here')
        database = os.getenv('DB_NAME', 'forex_db')
        
        logger.info(f"Testing database connection to {host}:{port} as {user}")
        
        # Try to connect
        connection = pymysql.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            database=database,
            connect_timeout=10,
            charset='utf8mb4'
        )
        
        # Test the connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT VERSION()")
            version = cursor.fetchone()
            logger.info(f"Successfully connected to MySQL version: {version[0]}")
            
            # Test if we have the necessary permissions
            cursor.execute("SHOW GRANTS")
            grants = cursor.fetchall()
            logger.info("User permissions:")
            for grant in grants:
                logger.info(grant[0])
        
        connection.close()
        return True
        
    except pymysql.Error as e:
        error_code = e.args[0]
        error_message = e.args[1] if len(e.args) > 1 else str(e)
        logger.error(f"MySQL Error [{error_code}]: {error_message}")
        
        if error_code == 1045:  # Access denied for user
            logger.error("Authentication failed - Please check username and password")
        elif error_code == 2003:  # Can't connect to server
            logger.error("Cannot connect to the server - Please check if MySQL is running and the host is correct")
        elif error_code == 1049:  # Unknown database
            logger.error("Database does not exist - Please check the database name")
        return False
    except Exception as e:
        logger.error(f"Unexpected error during database connection test: {str(e)}")
        return False

def run_update():
    """Run the update_events.py script."""
    try:
        logger.info("Starting scheduled forex events update")
        
        # Import and run the update script
        from scripts.update_events import main
        main()
        
        logger.info("Completed scheduled forex events update")
    except Exception as e:
        logger.error(f"Error during scheduled update: {str(e)}")

def main():
    try:
        logger.info("Starting the forex events scheduler")
        
        # Test database connection before starting
        if not test_db_connection():
            logger.error("Failed to connect to database. Please check your database configuration.")
            logger.error("The scheduler will continue running but updates may fail.")
        
        # Create and configure the scheduler
        scheduler = BackgroundScheduler()
        
        # Schedule the job to run every hour at minute 0
        scheduler.add_job(
            run_update,
            CronTrigger(minute=0),  # Run at the start of every hour
            id='forex_update',
            name='Forex Calendar Update',
            max_instances=1,
            coalesce=True  # If multiple instances are about to run, only run once
        )
        
        # Start the scheduler
        scheduler.start()
        logger.info("Scheduler started successfully")
        
        # Run the first update immediately
        run_update()
        
        # Keep the script running
        try:
            while True:
                # Sleep for a minute between checks - keeps the process alive
                # without consuming too much CPU
                time.sleep(60)
                logger.debug("Scheduler heartbeat - still running")
        except (KeyboardInterrupt, SystemExit):
            logger.info("Shutting down scheduler...")
            scheduler.shutdown()
            
    except Exception as e:
        logger.error(f"Error in scheduler: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main() 