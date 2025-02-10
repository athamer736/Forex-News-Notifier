from sqlalchemy import Column, Integer, String, JSON, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import pytz

from backend.database import Base

class EmailSubscription(Base):
    __tablename__ = 'email_subscriptions'
    
    id = Column(Integer, primary_key=True)
    email = Column(String(255), nullable=False, index=True)
    frequency = Column(String(10), nullable=False)  # 'daily', 'weekly', or 'both'
    currencies = Column(JSON, nullable=False)  # List of currency codes
    impact_levels = Column(JSON, nullable=False)  # List of impact levels
    daily_time = Column(String(5))  # HH:MM format
    weekly_day = Column(String(10))  # Day of week
    timezone = Column(String(50), nullable=False, default='UTC')
    is_verified = Column(Boolean, default=False)
    verification_token = Column(String(100))
    created_at = Column(DateTime, default=lambda: datetime.now(pytz.UTC))
    updated_at = Column(DateTime, default=lambda: datetime.now(pytz.UTC), onupdate=lambda: datetime.now(pytz.UTC))
    last_sent_at = Column(DateTime)
    
    def to_dict(self):
        """Convert subscription to dictionary."""
        return {
            'id': self.id,
            'email': self.email,
            'frequency': self.frequency,
            'currencies': self.currencies,
            'impact_levels': self.impact_levels,
            'daily_time': self.daily_time,
            'weekly_day': self.weekly_day,
            'timezone': self.timezone,
            'is_verified': self.is_verified,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'last_sent_at': self.last_sent_at.isoformat() if self.last_sent_at else None
        } 