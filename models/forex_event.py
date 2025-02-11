from sqlalchemy import Column, Integer, String, DateTime, Text
from backend.database import Base
import pytz
from datetime import datetime

class ForexEvent(Base):
    __tablename__ = 'forex_events'

    id = Column(Integer, primary_key=True)
    event_title = Column(String(255), nullable=False)
    currency = Column(String(3), nullable=False)
    impact = Column(String(10), nullable=False)
    forecast = Column(String(50))
    previous = Column(String(50))
    actual = Column(String(50))
    time = Column(DateTime(timezone=True), nullable=False)
    url = Column(String(255))
    source = Column(String(50))
    ai_summary = Column(Text)
    summary_generated_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)

    def __init__(self, event_title, currency, impact, time, forecast=None, previous=None, 
                 actual=None, url=None, source=None, ai_summary=None):
        self.event_title = event_title
        self.currency = currency
        self.impact = impact
        self.time = time
        self.forecast = forecast
        self.previous = previous
        self.actual = actual
        self.url = url
        self.source = source
        self.ai_summary = ai_summary
        self.created_at = datetime.now(pytz.UTC)
        self.updated_at = datetime.now(pytz.UTC)

    def to_dict(self):
        return {
            'id': self.id,
            'event_title': self.event_title,
            'currency': self.currency,
            'impact': self.impact,
            'forecast': self.forecast,
            'previous': self.previous,
            'actual': self.actual,
            'time': self.time.isoformat() if self.time else None,
            'url': self.url,
            'source': self.source,
            'ai_summary': self.ai_summary,
            'summary_generated_at': self.summary_generated_at.isoformat() if self.summary_generated_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        } 