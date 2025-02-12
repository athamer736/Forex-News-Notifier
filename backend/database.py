import os
from sqlalchemy import create_engine, and_, or_, text
from sqlalchemy.orm import sessionmaker, scoped_session, declarative_base
from sqlalchemy_utils import database_exists, create_database
from datetime import datetime, timedelta
from typing import List, Optional
import pytz
import logging
from dotenv import load_dotenv
import socket
import time
import pymysql

# Load environment variables from the project root
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(project_root, '.env')
load_dotenv(env_path)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Determine if we're running on the server
def is_running_on_server():
    try:
        # Get all network interfaces
        hostname = socket.gethostname()
        ip_addresses = socket.gethostbyname_ex(hostname)[2]
        # Check if the server IP is in any of our network interfaces
        return '141.95.123.145' in ip_addresses
    except Exception as e:
        logger.error(f"Error detecting server status: {str(e)}")
        return False

# Database configuration
DB_HOST = '141.95.123.145'  # Always use the IP address
logger.info(f"Using database host: {DB_HOST}")

DB_PORT = int(os.getenv('DB_PORT', '3306'))
DB_NAME = os.getenv('DB_NAME', 'forex_db')
DB_USER = os.getenv('DB_USER', 'forex_user')
DB_PASSWORD = os.getenv('DB_PASSWORD', 'UltraFX#736')

# Create database URL using PyMySQL
DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Log the connection details (without password)
logger.info(f"Connecting to database at {DB_HOST}:{DB_PORT}/{DB_NAME} as {DB_USER}")

try:
    # Create engine with PyMySQL and additional settings
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
        }
    )
    
    # Test connection with retry logic
    max_retries = 5
    retry_delay = 5  # seconds
    
    for attempt in range(max_retries):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
                # Set session variables for this connection
                conn.execute(text("SET SESSION wait_timeout=28800"))  # 8 hours
                conn.execute(text("SET SESSION interactive_timeout=28800"))  # 8 hours
                logger.info("Database connection test successful")
                break
        except Exception as e:
            if attempt < max_retries - 1:
                logger.warning(f"Connection attempt {attempt + 1} failed, retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
                continue
            else:
                raise
    
    # Create database if it doesn't exist
    if not database_exists(engine.url):
        create_database(engine.url)
        logger.info(f"Created database: {DB_NAME}")
    
    # Create session factory with improved settings
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

except Exception as e:
    logger.error(f"Error configuring database: {str(e)}")
    logger.error(f"Database URL (without password): mysql+pymysql://{DB_USER}:***@{DB_HOST}:{DB_PORT}/{DB_NAME}")
    raise

def get_filtered_events(
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    currencies: Optional[List[str]] = None,
    impact_levels: Optional[List[str]] = None,
    limit: Optional[int] = None
) -> List[dict]:
    """
    Get filtered forex events from the database.
    
    Args:
        start_time: Start datetime for event range (UTC)
        end_time: End datetime for event range (UTC)
        currencies: List of currency codes to filter by
        impact_levels: List of impact levels to filter by
        limit: Maximum number of events to return
        
    Returns:
        List of event dictionaries
    """
    from models.forex_event import ForexEvent
    
    try:
        # Start with base query
        query = db_session.query(ForexEvent)
        
        # Apply time filter
        if start_time:
            query = query.filter(ForexEvent.time >= start_time)
        if end_time:
            query = query.filter(ForexEvent.time <= end_time)
        
        # Apply currency filter
        if currencies:
            query = query.filter(ForexEvent.currency.in_([c.upper() for c in currencies]))
        
        # Apply impact filter
        if impact_levels:
            # Handle non-economic events specially
            if 'Non-Economic' in impact_levels:
                # Create a list of all other impact levels
                other_impacts = [imp for imp in impact_levels if imp != 'Non-Economic']
                
                # Build an OR condition for non-economic events and other selected impacts
                conditions = []
                if other_impacts:
                    conditions.append(ForexEvent.impact.in_(other_impacts))
                conditions.append(~ForexEvent.impact.in_(['High', 'Medium', 'Low']))
                
                query = query.filter(or_(*conditions))
            else:
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
        logger.error(f"Error getting filtered events: {str(e)}")
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

def get_db():
    """
    Get database session.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """
    Initialize database tables.
    """
    Base.metadata.create_all(bind=engine)
    logger.info("Initialized database tables") 