from datetime import datetime, timedelta
import pytz
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session
from typing import List, Dict

from ..models.user_preferences import UserEmailPreferences
from .email_service import EmailService
from ..database import get_events_for_date_range

class NotificationScheduler:
    def __init__(self, db_session: Session, email_service: EmailService):
        self.scheduler = BackgroundScheduler()
        self.db_session = db_session
        self.email_service = email_service

    def start(self):
        """Start the scheduler"""
        # Schedule checking for notifications every minute
        self.scheduler.add_job(
            self.check_notifications,
            'interval',
            minutes=1,
            id='notification_checker'
        )
        
        # Schedule weekly notifications check every Sunday at midnight UTC
        self.scheduler.add_job(
            self.send_weekly_notifications,
            CronTrigger(day_of_week='sun', hour=0, minute=0),
            id='weekly_notifications'
        )
        
        self.scheduler.start()

    def stop(self):
        """Stop the scheduler"""
        self.scheduler.shutdown()

    def check_notifications(self):
        """Check and send notifications for all users based on their preferences"""
        users = self.db_session.query(UserEmailPreferences).all()
        current_utc = datetime.now(pytz.UTC)

        for user in users:
            if not user.daily_notifications_enabled or not user.daily_notification_time:
                continue

            user_tz = pytz.timezone(user.timezone)
            user_time = current_utc.astimezone(user_tz)
            notification_time = datetime.strptime(
                user.daily_notification_time.strftime('%H:%M'),
                '%H:%M'
            ).time()

            # Check if it's time to send notification in user's timezone
            if (user_time.hour == notification_time.hour and 
                user_time.minute == notification_time.minute):
                self.send_daily_notification(user)

    def send_daily_notification(self, user: UserEmailPreferences):
        """Send daily notification to a specific user"""
        try:
            # Get events for the next 24 hours
            start_time = datetime.now(pytz.UTC)
            end_time = start_time + timedelta(days=1)
            
            events = get_events_for_date_range(
                self.db_session,
                start_time,
                end_time,
                user.selected_currencies,
                user.selected_impact_levels
            )

            if events:
                self.email_service.send_daily_notification(
                    user.email,
                    events,
                    user.timezone
                )
        except Exception as e:
            print(f"Error sending daily notification to {user.email}: {str(e)}")

    def send_weekly_notifications(self):
        """Send weekly notifications to all subscribed users"""
        users = self.db_session.query(UserEmailPreferences).filter(
            UserEmailPreferences.weekly_notifications_enabled == True
        ).all()

        for user in users:
            try:
                user_tz = pytz.timezone(user.timezone)
                current_time = datetime.now(user_tz)
                
                # Get events for the next week
                start_time = current_time
                end_time = start_time + timedelta(days=7)
                
                events = get_events_for_date_range(
                    self.db_session,
                    start_time,
                    end_time,
                    user.selected_currencies,
                    user.selected_impact_levels
                )

                if events:
                    self.email_service.send_weekly_notification(
                        user.email,
                        events,
                        user.timezone
                    )
            except Exception as e:
                print(f"Error sending weekly notification to {user.email}: {str(e)}")

    def add_user_notification(self, user_id: str, notification_time: str, timezone: str):
        """Add or update a user's notification preferences"""
        try:
            time_obj = datetime.strptime(notification_time, '%H:%M').time()
            user = self.db_session.query(UserEmailPreferences).filter_by(
                user_id=user_id
            ).first()
            
            if user:
                user.daily_notification_time = time_obj
                user.daily_notifications_enabled = True
                user.timezone = timezone
            
            self.db_session.commit()
            return True
        except Exception as e:
            print(f"Error setting notification for user {user_id}: {str(e)}")
            return False 