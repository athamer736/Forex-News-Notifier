from sqlalchemy import Column, Integer, String, Boolean, Time, JSON, DateTime
from config.database import Base
from datetime import datetime

class UserEmailPreferences(Base):
    __tablename__ = 'user_email_preferences'

    id = Column(Integer, primary_key=True)
    user_id = Column(String(50), unique=True, nullable=False)
    email = Column(String(255), nullable=False)
    
    # Daily notification preferences
    daily_notifications_enabled = Column(Boolean, default=False)
    daily_notification_time = Column(Time)  # User's local time for daily notifications
    
    # Weekly notification preferences
    weekly_notifications_enabled = Column(Boolean, default=False)
    weekly_notification_day = Column(Integer)  # 0=Monday, 6=Sunday
    weekly_notification_time = Column(Time)
    
    # Filter preferences
    selected_currencies = Column(JSON)  # List of currency codes
    selected_impact_levels = Column(JSON)  # List of impact levels
    
    # User settings
    timezone = Column(String(50), nullable=False)
    last_notification_sent = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'user_id': self.user_id,
            'email': self.email,
            'daily_notifications_enabled': self.daily_notifications_enabled,
            'daily_notification_time': self.daily_notification_time.strftime('%H:%M') if self.daily_notification_time else None,
            'weekly_notifications_enabled': self.weekly_notifications_enabled,
            'weekly_notification_day': self.weekly_notification_day,
            'weekly_notification_time': self.weekly_notification_time.strftime('%H:%M') if self.weekly_notification_time else None,
            'selected_currencies': self.selected_currencies,
            'selected_impact_levels': self.selected_impact_levels,
            'timezone': self.timezone,
            'last_notification_sent': self.last_notification_sent.isoformat() if self.last_notification_sent else None
        } 