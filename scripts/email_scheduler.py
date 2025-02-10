import sys
from pathlib import Path
import logging
from datetime import datetime, timedelta
import pytz
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
import os

# Add the project root directory to Python path
project_root = str(Path(__file__).parent.parent)
sys.path.append(project_root)

from backend.database import db_session
from models.email_subscription import EmailSubscription
from backend.main.email_service import send_daily_update, send_weekly_update

# Configure logging
log_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'logs')
os.makedirs(log_dir, exist_ok=True)

log_file = os.path.join(log_dir, 'scheduler.log')
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

def send_daily_updates():
    """Send daily updates to subscribed users."""
    try:
        now = datetime.now(pytz.UTC)
        logger.info("Starting daily email updates")
        
        # Get all verified subscriptions that want daily updates
        subscriptions = EmailSubscription.query.filter(
            EmailSubscription.is_verified == True,
            (EmailSubscription.frequency == 'daily') | (EmailSubscription.frequency == 'both')
        ).all()
        
        for subscription in subscriptions:
            try:
                # Convert current time to user's timezone
                user_tz = pytz.timezone(subscription.timezone)
                user_time = now.astimezone(user_tz)
                
                # Check if it's the right time to send for this user
                target_time = datetime.strptime(subscription.daily_time, '%H:%M').time()
                if user_time.time().hour == target_time.hour and user_time.time().minute == target_time.minute:
                    logger.info(f"Sending daily update to {subscription.email}")
                    send_daily_update(subscription)
                
            except Exception as e:
                logger.error(f"Error sending daily update to {subscription.email}: {str(e)}")
                continue
        
        logger.info("Completed daily email updates")
        
    except Exception as e:
        logger.error(f"Error in daily update job: {str(e)}")

def send_weekly_updates():
    """Send weekly updates to subscribed users."""
    try:
        now = datetime.now(pytz.UTC)
        logger.info("Starting weekly email updates")
        
        # Get all verified subscriptions that want weekly updates
        subscriptions = EmailSubscription.query.filter(
            EmailSubscription.is_verified == True,
            (EmailSubscription.frequency == 'weekly') | (EmailSubscription.frequency == 'both')
        ).all()
        
        for subscription in subscriptions:
            try:
                # Check if today is the user's preferred day
                if subscription.weekly_day.lower() == now.strftime('%A').lower():
                    logger.info(f"Sending weekly update to {subscription.email}")
                    send_weekly_update(subscription)
                
            except Exception as e:
                logger.error(f"Error sending weekly update to {subscription.email}: {str(e)}")
                continue
        
        logger.info("Completed weekly email updates")
        
    except Exception as e:
        logger.error(f"Error in weekly update job: {str(e)}")

def start_email_scheduler():
    """Start the email scheduler."""
    try:
        scheduler = BackgroundScheduler()
        
        # Schedule daily updates to run every minute
        # (The function will check if it's the right time for each user)
        scheduler.add_job(
            send_daily_updates,
            trigger=CronTrigger(minute='*'),  # Every minute
            id='daily_updates',
            name='Send daily forex updates',
            replace_existing=True
        )
        
        # Schedule weekly updates to run daily at midnight UTC
        # (The function will check if it's the right day for each user)
        scheduler.add_job(
            send_weekly_updates,
            trigger=CronTrigger(hour=0, minute=0),  # Daily at midnight UTC
            id='weekly_updates',
            name='Send weekly forex summaries',
            replace_existing=True
        )
        
        scheduler.start()
        logger.info("Email scheduler started successfully")
        
        return scheduler
        
    except Exception as e:
        logger.error(f"Error starting email scheduler: {str(e)}")
        raise

if __name__ == "__main__":
    scheduler = start_email_scheduler()
    try:
        # Keep the script running
        while True:
            pass
    except (KeyboardInterrupt, SystemExit):
        scheduler.shutdown() 