from sqlalchemy import Column, Integer, String, Boolean, Time, JSON, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base

class UserEmailPreferences(Base):
    __tablename__ = 'user_email_preferences'

    id = Column(Integer, primary_key=True)
    user_id = Column(String, unique=True, nullable=False)
    email = Column(String, nullable=False)
    
    # Daily notification preferences
    daily_notifications_enabled = Column(Boolean, default=False)
    daily_notification_time = Column(Time, nullable=True)  # User's local time for daily notifications
    selected_currencies = Column(JSON, default=list)  # List of currency codes
    selected_impact_levels = Column(JSON, default=list)  # List of impact levels
    
    # Weekly notification preferences
    weekly_notifications_enabled = Column(Boolean, default=False)
    weekly_notification_time = Column(Time, nullable=True)  # Time for Sunday notifications
    timezone = Column(String, nullable=False)  # User's timezone for scheduling

    def to_dict(self):
        return {
            'user_id': self.user_id,
            'email': self.email,
            'daily_notifications_enabled': self.daily_notifications_enabled,
            'daily_notification_time': self.daily_notification_time.strftime('%H:%M') if self.daily_notification_time else None,
            'selected_currencies': self.selected_currencies,
            'selected_impact_levels': self.selected_impact_levels,
            'weekly_notifications_enabled': self.weekly_notifications_enabled,
            'weekly_notification_time': self.weekly_notification_time.strftime('%H:%M') if self.weekly_notification_time else None,
            'timezone': self.timezone
        } 