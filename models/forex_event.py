from sqlalchemy import Column, Integer, String, DateTime, Boolean
from config.database import Base

class ForexEvent(Base):
    __tablename__ = 'forex_events'

    id = Column(Integer, primary_key=True)
    time = Column(DateTime, nullable=False, index=True)
    currency = Column(String(10), nullable=False, index=True)
    impact = Column(String(20), nullable=False, index=True)
    event_title = Column(String(255), nullable=False)
    forecast = Column(String(50))
    previous = Column(String(50))
    actual = Column(String(50))
    url = Column(String(255))
    source = Column(String(50))  # e.g., 'forexfactory'
    created_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=False)
    is_updated = Column(Boolean, default=False)

    def to_dict(self):
        return {
            'id': self.id,
            'time': self.time.isoformat() if self.time else None,
            'currency': self.currency,
            'impact': self.impact,
            'event_title': self.event_title,
            'forecast': self.forecast,
            'previous': self.previous,
            'actual': self.actual,
            'url': self.url,
            'source': self.source,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'is_updated': self.is_updated
        } 