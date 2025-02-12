import os
from sqlalchemy import create_engine, and_
from sqlalchemy.orm import sessionmaker, scoped_session
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy_utils import database_exists, create_database
from datetime import datetime, timedelta
from typing import List, Optional
import pytz
import pymysql
import time
from sqlalchemy import text

# Database configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', '141.95.123.145'),  # Always use IP address
    'port': int(os.getenv('DB_PORT', 3306)),
    'user': os.getenv('DB_USER', 'forex_user'),
    'password': os.getenv('DB_PASSWORD', 'UltraFX#736'),
    'database': os.getenv('DB_NAME', 'forex_db')
}

# Create database URL using PyMySQL
DATABASE_URL = (
    f"mysql+pymysql://{DB_CONFIG['user']}:{DB_CONFIG['password']}"
    f"@{DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}"
    "?charset=utf8mb4"
)

# Create engine with security settings
engine = create_engine(
    DATABASE_URL,
    pool_size=20,  # Larger pool size
    max_overflow=30,  # Larger overflow
    pool_timeout=60,  # Longer pool timeout
    pool_recycle=300,  # Recycle connections every 5 minutes to stay fresh
    pool_pre_ping=True,  # Enable automatic reconnection
    connect_args={
        'connect_timeout': 60,
        'read_timeout': 3600,  # 1 hour read timeout
        'write_timeout': 3600,  # 1 hour write timeout
        'keepalive': True,
        'keepalive_interval': 60,  # Send keepalive every 60 seconds
        'init_command': 'SET SESSION wait_timeout=28800',  # 8 hour server-side timeout
        'client_flag': pymysql.constants.CLIENT.MULTI_STATEMENTS | 
                     pymysql.constants.CLIENT.REMEMBER_OPTIONS |
                     pymysql.constants.CLIENT.CONNECT_WITH_DB,
        'reconnect': True,  # Enable auto-reconnect
        'autocommit': True,  # Enable autocommit for session
        'charset': 'utf8mb4'
    },
    echo=False,
    future=True
)

# Create session factory with engine bind and configure session
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False
)

# Create scoped session with automatic cleanup
db_session = scoped_session(
    SessionLocal,
    scopefunc=None
)

# Create base class for models
Base = declarative_base()
Base.query = db_session.query_property()

# Create database if it doesn't exist with retry logic
def init_db():
    max_retries = 5
    retry_delay = 5  # seconds
    
    for attempt in range(max_retries):
        try:
            if not database_exists(engine.url):
                create_database(engine.url)
            Base.metadata.create_all(bind=engine)
            
            # Set session variables for all new connections
            with engine.connect() as conn:
                conn.execute(text("SET SESSION wait_timeout=28800"))  # 8 hours
                conn.execute(text("SET SESSION interactive_timeout=28800"))  # 8 hours
            break
        except Exception as e:
            if attempt < max_retries - 1:
                print(f"Database initialization attempt {attempt + 1} failed, retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
                continue
            else:
                raise

def get_filtered_events(
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    currencies: Optional[List[str]] = None,
    impact_levels: Optional[List[str]] = None,
    time_range: str = '24h',
    limit: Optional[int] = None
) -> List[dict]:
    """
    Get filtered forex events from the database.
    
    Args:
        start_time: Start datetime for event range
        end_time: End datetime for event range
        currencies: List of currency codes to filter by
        impact_levels: List of impact levels to filter by
        time_range: Predefined time range ('24h', 'today', 'tomorrow', 'week', etc.)
        limit: Maximum number of events to return
        
    Returns:
        List of event dictionaries
    """
    from models.forex_event import ForexEvent
    
    try:
        # Start with base query
        query = db_session.query(ForexEvent)
        
        # Handle time range if no explicit start/end times provided
        if not start_time and not end_time:
            now = datetime.now(pytz.UTC)
            
            if time_range == '24h':
                start_time = now
                end_time = now + timedelta(days=1)
            elif time_range == 'today':
                start_time = now.replace(hour=0, minute=0, second=0, microsecond=0)
                end_time = start_time + timedelta(days=1)
            elif time_range == 'tomorrow':
                start_time = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
                end_time = start_time + timedelta(days=1)
            elif time_range == 'week':
                start_time = now
                end_time = now + timedelta(days=7)
            elif time_range == 'next_week':
                start_time = (now + timedelta(days=7)).replace(hour=0, minute=0, second=0, microsecond=0)
                end_time = start_time + timedelta(days=7)
            else:
                start_time = now
                end_time = now + timedelta(days=1)
        
        # Apply time filter
        if start_time:
            query = query.filter(ForexEvent.time >= start_time)
        if end_time:
            query = query.filter(ForexEvent.time <= end_time)
        
        # Apply currency filter
        if currencies:
            query = query.filter(ForexEvent.currency.in_(currencies))
        
        # Apply impact filter
        if impact_levels:
            query = query.filter(ForexEvent.impact.in_(impact_levels))
        
        # Order by time
        query = query.order_by(ForexEvent.time)
        
        # Apply limit if specified
        if limit:
            query = query.limit(limit)
        
        # Execute query and convert to dictionaries
        events = query.all()
        return [event.to_dict() for event in events]
        
    except Exception as e:
        print(f"Error getting filtered events: {str(e)}")
        return []

def get_events_by_date(date: datetime) -> List[dict]:
    """
    Get all events for a specific date.
    
    Args:
        date: The date to get events for
        
    Returns:
        List of event dictionaries
    """
    start_time = date.replace(hour=0, minute=0, second=0, microsecond=0)
    end_time = start_time + timedelta(days=1)
    return get_filtered_events(start_time=start_time, end_time=end_time)

def get_high_impact_events(days: int = 1) -> List[dict]:
    """
    Get high impact events for the next N days.
    
    Args:
        days: Number of days to look ahead
        
    Returns:
        List of high impact event dictionaries
    """
    now = datetime.now(pytz.UTC)
    end_time = now + timedelta(days=days)
    return get_filtered_events(
        start_time=now,
        end_time=end_time,
        impact_levels=['High']
    )

def get_currency_events(
    currency: str,
    days: int = 7,
    impact_levels: Optional[List[str]] = None
) -> List[dict]:
    """
    Get events for a specific currency.
    
    Args:
        currency: Currency code to filter by
        days: Number of days to look ahead
        impact_levels: Optional list of impact levels to filter by
        
    Returns:
        List of event dictionaries
    """
    now = datetime.now(pytz.UTC)
    end_time = now + timedelta(days=days)
    return get_filtered_events(
        start_time=now,
        end_time=end_time,
        currencies=[currency],
        impact_levels=impact_levels
    ) 