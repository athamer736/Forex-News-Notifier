import sys
from pathlib import Path
import time
import logging
import os
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

# Add the project root directory to Python path
project_root = str(Path(__file__).parent.parent)
sys.path.append(project_root)

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
                time.sleep(60)  # Sleep for 1 minute
        except (KeyboardInterrupt, SystemExit):
            logger.info("Shutting down scheduler...")
            scheduler.shutdown()
            
    except Exception as e:
        logger.error(f"Error in scheduler: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main() 