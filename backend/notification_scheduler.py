from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime, timedelta
import pytz
import logging
from backend.services.email_service import send_daily_updates
from scripts.generate_summaries import generate_missing_summaries, refresh_old_summaries

logger = logging.getLogger(__name__)

def initialize_scheduler():
    scheduler = BackgroundScheduler()
    
    # Schedule daily email updates
    scheduler.add_job(
        send_daily_updates,
        CronTrigger(hour=0, minute=5),  # Run at 00:05 UTC
        name='daily_email_updates',
        max_instances=1,
        coalesce=True
    )
    
    # Schedule AI summary generation for new events
    scheduler.add_job(
        generate_missing_summaries,
        CronTrigger(minute=0),  # Run every hour at minute 0
        name='generate_ai_summaries',
        max_instances=1,
        coalesce=True
    )
    
    # Schedule weekly refresh of old summaries
    scheduler.add_job(
        refresh_old_summaries,
        CronTrigger(day_of_week='mon', hour=1),  # Run at 1 AM UTC on Mondays
        name='refresh_ai_summaries',
        max_instances=1,
        coalesce=True
    )
    
    scheduler.start()
    logger.info("Scheduler initialized with email updates and AI summary generation jobs") 