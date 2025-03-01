import sys
from pathlib import Path
import logging
from datetime import datetime, timedelta
import pytz
import gc
import time
import os
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
import threading

# Add the project root directory to Python path
project_root = str(Path(__file__).parent.parent)
sys.path.append(project_root)

from config.database import db_session, cleanup_db_resources
from models.email_subscription import EmailSubscription
from backend.main.email_service import send_daily_update, send_weekly_update

# Configure logging
log_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'logs')
os.makedirs(log_dir, exist_ok=True)

log_file = os.path.join(log_dir, 'email_scheduler.log')
logger = logging.getLogger('EmailScheduler')

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

# Add threading lock for thread safety
processing_lock = threading.Lock()

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

def cleanup_resources():
    """Clean up database connections and run garbage collection"""
    try:
        # Clean up database session
        cleanup_db_resources()
        
        # Run garbage collection
        gc.collect()
        logger.info("Garbage collection performed")
        
        # Log memory usage
        log_memory_usage()
    except Exception as e:
        logger.error(f"Error during resource cleanup: {str(e)}")

def send_daily_updates():
    """Send daily updates to subscribed users with resource cleanup."""
    # Skip if another job is already processing
    if not processing_lock.acquire(blocking=False):
        logger.warning("Another email job is already running, skipping this run")
        return
    
    try:
        now = datetime.now(pytz.UTC)
        logger.info("Starting daily email updates")
        
        # Get all daily subscribers
        subscribers = db_session.query(EmailSubscription).filter(
            EmailSubscription.frequency == 'daily',
            EmailSubscription.verified == True,
            EmailSubscription.unsubscribed == False
        ).all()
        
        if not subscribers:
            logger.info("No daily subscribers found")
            return
            
        logger.info(f"Found {len(subscribers)} daily subscribers")
        
        for subscriber in subscribers:
            try:
                send_daily_update(subscriber)
                logger.info(f"Daily update sent to {subscriber.email}")
            except Exception as e:
                logger.error(f"Failed to send daily update to {subscriber.email}: {str(e)}")
                
        logger.info("Daily email updates completed")
        
    except Exception as e:
        logger.error(f"Error in daily email updates: {str(e)}")
    finally:
        # Always clean up resources and release lock
        cleanup_resources()
        processing_lock.release()

def send_weekly_updates():
    """Send weekly updates to subscribed users with resource cleanup."""
    # Skip if another job is already processing
    if not processing_lock.acquire(blocking=False):
        logger.warning("Another email job is already running, skipping this run")
        return
    
    try:
        now = datetime.now(pytz.UTC)
        logger.info("Starting weekly email updates")
        
        # Only send on Sundays
        if now.weekday() != 6:  # 6 = Sunday
            logger.info(f"Today is not Sunday (weekday={now.weekday()}), skipping weekly emails")
            return
            
        # Get all weekly subscribers
        subscribers = db_session.query(EmailSubscription).filter(
            EmailSubscription.frequency == 'weekly',
            EmailSubscription.verified == True,
            EmailSubscription.unsubscribed == False
        ).all()
        
        if not subscribers:
            logger.info("No weekly subscribers found")
            return
            
        logger.info(f"Found {len(subscribers)} weekly subscribers")
        
        for subscriber in subscribers:
            try:
                send_weekly_update(subscriber)
                logger.info(f"Weekly update sent to {subscriber.email}")
            except Exception as e:
                logger.error(f"Failed to send weekly update to {subscriber.email}: {str(e)}")
                
        logger.info("Weekly email updates completed")
        
    except Exception as e:
        logger.error(f"Error in weekly email updates: {str(e)}")
    finally:
        # Always clean up resources and release lock
        cleanup_resources()
        processing_lock.release()

def main():
    try:
        logger.info("Starting the email scheduler")
        
        # Create scheduler
        scheduler = BackgroundScheduler(
            job_defaults={
                'coalesce': True,
                'max_instances': 1,
                'misfire_grace_time': 3600
            }
        )
        
        # Schedule daily emails to run at 8:00 AM UTC (usually when markets are less active)
        scheduler.add_job(
            send_daily_updates,
            CronTrigger(hour=8, minute=0),
            id='daily_emails',
            name='Daily Email Updates'
        )
        
        # Schedule weekly emails to run on Sunday at 9:00 AM UTC
        scheduler.add_job(
            send_weekly_updates,
            CronTrigger(day_of_week='sun', hour=9, minute=0),
            id='weekly_emails',
            name='Weekly Email Updates'
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
        logger.info("Email scheduler started")
        
        # Log initial memory usage
        log_memory_usage()
        
        # Keep the script running
        try:
            while True:
                time.sleep(300)  # Sleep for 5 minutes
                # Log memory usage periodically
                log_memory_usage()
        except (KeyboardInterrupt, SystemExit):
            logger.info("Shutting down email scheduler...")
            scheduler.shutdown()
            cleanup_resources()
            
    except Exception as e:
        logger.error(f"Error in email scheduler: {str(e)}")
        cleanup_resources()

if __name__ == "__main__":
    main() 