import sys
from pathlib import Path
import time
import logging
import os
import gc
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

# Track memory usage
def log_memory_usage():
    """Log current memory usage"""
    try:
        import psutil
        process = psutil.Process(os.getpid())
        mem_info = process.memory_info()
        
        # Convert bytes to MB for better readability
        mem_usage_mb = mem_info.rss / 1024 / 1024
        logger.info(f"Memory usage: {mem_usage_mb:.2f} MB")
    except ImportError:
        logger.warning("psutil not installed, cannot log memory usage")
    except Exception as e:
        logger.error(f"Error logging memory usage: {str(e)}")

# Track connection
db_connection = None

def test_db_connection():
    """Test the database connection before starting the scheduler."""
    global db_connection
    
    try:
        # Get database configuration from environment variables
        db_host = os.getenv('DB_HOST', 'fxalert.co.uk')
        db_port = int(os.getenv('DB_PORT', '3306'))
        db_user = os.getenv('DB_USER', 'forex_user')
        db_password = os.getenv('DB_PASSWORD', 'your_password_here')
        db_name = os.getenv('DB_NAME', 'forex_db')

        # Log connection attempt to database
        logger.info(f"Testing connection to MySQL database at {db_host}:{db_port}")
        
        # Execute SHOW GRANTS to check user permissions
        try:
            # Close existing connection if it exists
            if db_connection and db_connection.open:
                db_connection.close()
                logger.info("Closed existing database connection")
                
            # Create a new connection
            db_connection = pymysql.connect(
                host=db_host,
                port=db_port,
                user=db_user,
                password=db_password,
                database=db_name,
                charset='utf8mb4',
                connect_timeout=10,
                cursorclass=pymysql.cursors.DictCursor
            )
            
            logger.info("Successfully connected to the database")
            
            # Check permissions
            with db_connection.cursor() as cursor:
                cursor.execute("SHOW GRANTS")
                grants = cursor.fetchall()
                logger.info(f"User permissions: {grants}")
                
            return True
        except pymysql.err.OperationalError as e:
            error_code, error_message = e.args
            
            # Handle different error codes
            if error_code == 1045:  # Access denied
                logger.error(f"Database access denied: {error_message}")
            elif error_code == 2003:  # Cannot connect
                logger.error(f"Cannot connect to database: {error_message}")
            else:
                logger.error(f"Database operational error: {error_code} - {error_message}")
                
            return False
        except Exception as e:
            logger.error(f"Unexpected database error: {str(e)}")
            return False
            
    except Exception as e:
        logger.error(f"Error testing database connection: {str(e)}")
        return False

def cleanup_resources():
    """Clean up database connections and run garbage collection"""
    global db_connection
    
    try:
        # Close database connection if it exists
        if db_connection and db_connection.open:
            db_connection.close()
            logger.info("Closed database connection during cleanup")
            db_connection = None
        
        # Run garbage collection
        gc.collect()
        logger.info("Garbage collection performed")
        
        # Log memory usage
        log_memory_usage()
    except Exception as e:
        logger.error(f"Error during resource cleanup: {str(e)}")

def run_update():
    """Run the update_events.py script with resource cleanup."""
    try:
        logger.info("Starting scheduled forex events update")
        
        # Import and run the update script
        from scripts.update_events import main
        main()
        
        logger.info("Completed scheduled forex events update")
        
        # Clean up resources after update
        cleanup_resources()
    except Exception as e:
        logger.error(f"Error during scheduled update: {str(e)}")
        # Try to clean up even on error
        cleanup_resources()

def main():
    try:
        logger.info("Starting the forex events scheduler")
        
        # Test database connection before starting
        if not test_db_connection():
            logger.error("Failed to connect to database. Please check your database configuration.")
            logger.error("The scheduler will continue running but updates may fail.")
        
        # Create and configure the scheduler
        scheduler = BackgroundScheduler(
            job_defaults={
                'coalesce': True,
                'max_instances': 1,
                'misfire_grace_time': 3600  # 1 hour grace time for misfires
            }
        )
        
        # Schedule the job to run every hour at minute 0
        scheduler.add_job(
            run_update,
            CronTrigger(minute=0),  # Run at the start of every hour
            id='forex_update',
            name='Forex Calendar Update'
        )
        
        # Add memory cleanup job to run every 3 hours
        scheduler.add_job(
            cleanup_resources,
            CronTrigger(hour='*/3'),  # Run every 3 hours
            id='memory_cleanup',
            name='Memory and Resources Cleanup'
        )
        
        # Start the scheduler
        scheduler.start()
        logger.info("Scheduler started successfully")
        
        # Run the first update immediately
        run_update()
        
        # Log initial memory usage
        log_memory_usage()
        
        # Keep the script running
        try:
            while True:
                time.sleep(300)  # Sleep for 5 minutes
                # Log memory usage periodically
                log_memory_usage()
        except (KeyboardInterrupt, SystemExit):
            logger.info("Shutting down scheduler...")
            scheduler.shutdown()
            cleanup_resources()
    except Exception as e:
        logger.error(f"Error in scheduler: {str(e)}")
        cleanup_resources()

if __name__ == "__main__":
    main() 