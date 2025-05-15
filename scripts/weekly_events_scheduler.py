import os
import sys
import time
import logging
import schedule
from datetime import datetime, timedelta
import traceback

# Set up logging
log_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'logs')
os.makedirs(log_dir, exist_ok=True)
log_file = os.path.join(log_dir, 'weekly_events_scheduler.log')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Add the project root to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the store_weekly_events script
from scripts.store_weekly_events import process_weeks

def update_weekly_events():
    """Update the weekly event JSON files"""
    try:
        logger.info("Starting weekly events update...")
        
        # Process weeks from 4 weeks ago to 4 weeks in the future
        process_weeks(start_offset=-4, end_offset=4)
        
        logger.info("Weekly events update completed successfully")
    except Exception as e:
        logger.error(f"Error updating weekly events: {str(e)}")
        logger.error(traceback.format_exc())

def run_scheduler():
    """Run the scheduler to update weekly events periodically"""
    logger.info("Starting weekly events scheduler...")
    
    # Run once on startup
    update_weekly_events()
    
    # Schedule to run every day at 1:00 AM
    schedule.every().day.at("01:00").do(update_weekly_events)
    
    # Schedule to run every week on Monday at 1:30 AM
    schedule.every().monday.at("01:30").do(update_weekly_events)
    
    logger.info("Scheduler set up successfully. Running continuously...")
    
    # Run the scheduler loop
    while True:
        try:
            schedule.run_pending()
            time.sleep(60)  # Sleep for 1 minute
        except KeyboardInterrupt:
            logger.info("Scheduler stopped by user")
            break
        except Exception as e:
            logger.error(f"Error in scheduler loop: {str(e)}")
            logger.error(traceback.format_exc())
            time.sleep(300)  # Sleep for 5 minutes on error

if __name__ == "__main__":
    run_scheduler() 