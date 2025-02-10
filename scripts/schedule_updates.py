import sys
from pathlib import Path
import time
from datetime import datetime
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

# Add the project root directory to Python path
project_root = str(Path(__file__).parent.parent)
sys.path.append(project_root)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/scheduler.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def run_update():
    """Run the update script."""
    try:
        logger.info("Starting scheduled update...")
        
        # Import and run the update script
        from scripts.update_events import main as update_main
        update_main()
        
        logger.info("Scheduled update completed")
        
    except Exception as e:
        logger.error(f"Error in scheduled update: {str(e)}")

def main():
    try:
        # Create logs directory if it doesn't exist
        Path('logs').mkdir(exist_ok=True)
        
        # Create scheduler
        scheduler = BackgroundScheduler()
        
        # Schedule the update to run every hour
        scheduler.add_job(
            run_update,
            trigger=IntervalTrigger(hours=1),
            id='forex_update',
            name='Forex Calendar Update',
            next_run_time=datetime.now()  # Run immediately on start
        )
        
        # Start the scheduler
        scheduler.start()
        logger.info("Scheduler started. Updates will run every hour.")
        
        # Keep the script running
        try:
            while True:
                time.sleep(60)
        except (KeyboardInterrupt, SystemExit):
            scheduler.shutdown()
            logger.info("Scheduler stopped.")
            
    except Exception as e:
        logger.error(f"Error in scheduler: {str(e)}")

if __name__ == "__main__":
    main() 