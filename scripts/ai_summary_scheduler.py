import sys
import os
import logging
import time
import traceback
from pathlib import Path
from datetime import datetime, timedelta

# Add the project root directory to Python path
project_root = str(Path(__file__).parent.parent)
sys.path.append(project_root)

# Configure logging
log_dir = os.path.join(project_root, 'logs')
os.makedirs(log_dir, exist_ok=True)

log_file = os.path.join(log_dir, 'ai_summary_scheduler.log')
logger = logging.getLogger('AISummaryScheduler')

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

def run_summary_generator():
    """Run the AI summary generator."""
    try:
        logger.info("Starting AI summary generation...")
        
        # Import and run the summary generation scripts
        from scripts.generate_summaries import generate_missing_summaries, refresh_old_summaries
        
        # Generate summaries for new events
        generate_missing_summaries()
        
        # Refresh old summaries on Mondays
        today = datetime.now()
        if today.weekday() == 0:  # Monday
            logger.info("It's Monday - running refresh of old summaries...")
            refresh_old_summaries()
        
        logger.info("AI summary generation completed.")
        return True
    except Exception as e:
        logger.error(f"Error running AI summary generator: {str(e)}")
        logger.error(traceback.format_exc())
        return False

def main():
    """Main function to run the AI summary generator in a loop."""
    logger.info("Starting AI Summary Generator Scheduler")
    
    try:
        while True:
            start_time = datetime.now()
            logger.info(f"Starting AI summary generation cycle at {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
            
            # Run the summary generator
            success = run_summary_generator()
            
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            logger.info(f"AI summary generation {'completed successfully' if success else 'failed'} in {duration:.2f} seconds")
            
            # Calculate next run time (1 hour from now)
            next_run = start_time + timedelta(seconds=3600)
            sleep_seconds = max(10, (next_run - datetime.now()).total_seconds())
            
            logger.info(f"Next run scheduled for {next_run.strftime('%Y-%m-%d %H:%M:%S')} (sleeping for {sleep_seconds:.2f} seconds)")
            
            # Sleep until next run time
            time.sleep(sleep_seconds)
            
    except KeyboardInterrupt:
        logger.info("AI Summary Generator Scheduler stopped by user")
    except Exception as e:
        logger.error(f"Unexpected error in AI Summary Generator Scheduler: {str(e)}")
        logger.error(traceback.format_exc())
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main()) 