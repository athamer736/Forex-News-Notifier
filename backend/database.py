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

def is_server_ip(ip_addresses):
    """Check if any of the IP addresses match the server IP."""
    return 'fxalert.co.uk' in ip_addresses or any(ip == get_server_ip() for ip in ip_addresses)

# Database configuration
db_config = {
    'user': os.getenv('DB_USER', 'forex_user'),
    'password': os.getenv('DB_PASSWORD', 'your_password_here'),
    'host': os.getenv('DB_HOST', 'fxalert.co.uk'),  # Use domain name as default
    'database': os.getenv('DB_NAME', 'forex_db'),
    'port': int(os.getenv('DB_PORT', '3306')),  # Added port with default value
    'raise_on_warnings': True
}

# Create database URL using PyMySQL
DATABASE_URL = (
    f"mysql+pymysql://{db_config['user']}:{db_config['password']}"
    f"@{db_config['host']}:{db_config['port']}/{db_config['database']}"
    "?charset=utf8mb4"
)

# Log the connection details (without password)
logger.info(f"Connecting to database at {db_config['host']}:{db_config['port']}/{db_config['database']} as {db_config['user']}")

try:
    # Create engine with PyMySQL and additional settings
    engine = create_engine(
        DATABASE_URL,
        pool_size=20,  # Larger pool size
        max_overflow=30,  # Larger overflow
        pool_timeout=60,  # Longer pool timeout
        pool_recycle=300,  # Recycle connections every 5 minutes
        pool_pre_ping=True,  # Enable automatic reconnection
        connect_args={
            'connect_timeout': 60,
            'read_timeout': 3600,  # 1 hour read timeout
            'write_timeout': 3600,  # 1 hour write timeout
            'init_command': 'SET SESSION wait_timeout=28800',  # 8 hour server-side timeout
            'client_flag': pymysql.constants.CLIENT.MULTI_STATEMENTS |
                         pymysql.constants.CLIENT.CONNECT_WITH_DB,
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
        logger.info(f"Created database: {db_config['database']}")
    
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
    logger.error(f"Database URL (without password): mysql+pymysql://{db_config['user']}:***@{db_config['host']}:{db_config['port']}/{db_config['database']}")
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
        logger.info(f"Building database query with filters: start_time={start_time}, end_time={end_time}")
        
        # Apply time filter
        if start_time:
            query = query.filter(ForexEvent.time >= start_time)
            logger.info(f"Added filter: ForexEvent.time >= {start_time}")
        if end_time:
            query = query.filter(ForexEvent.time <= end_time)
            logger.info(f"Added filter: ForexEvent.time <= {end_time}")
        
        # Apply currency filter
        if currencies:
            # Convert both the database values and input to uppercase for comparison
            normalized_currencies = [c.strip().upper() for c in currencies if c.strip()]
            query = query.filter(ForexEvent.currency.in_(normalized_currencies))
            logger.info(f"Added filter: ForexEvent.currency in {normalized_currencies}")
        
        # Apply impact filter
        if impact_levels:
            # Handle non-economic events specially and normalize case
            normalized_impacts = [imp.strip().title() for imp in impact_levels if imp.strip()]
            logger.info(f"Normalized impact levels: {normalized_impacts}")
            
            if 'Non-Economic' in normalized_impacts:
                # Create a list of all other impact levels
                other_impacts = [imp for imp in normalized_impacts if imp != 'Non-Economic']
                
                # Build an OR condition for non-economic events and other selected impacts
                conditions = []
                if other_impacts:
                    conditions.append(ForexEvent.impact.in_(other_impacts))
                conditions.append(~ForexEvent.impact.in_(['High', 'Medium', 'Low']))
                
                query = query.filter(or_(*conditions))
                logger.info(f"Added complex filter for Non-Economic and {other_impacts}")
            else:
                query = query.filter(ForexEvent.impact.in_(normalized_impacts))
                logger.info(f"Added filter: ForexEvent.impact in {normalized_impacts}")
        
        # Order by time
        query = query.order_by(ForexEvent.time)
        
        # Apply limit if specified
        if limit:
            query = query.limit(limit)
            logger.info(f"Added result limit: {limit}")
        
        # Execute query
        events = query.all()
        logger.info(f"Database query returned {len(events)} events")
        
        # Debug output for first few events if available
        if events:
            logger.info(f"First event time: {events[0].time}, Last event time: {events[-1].time}")
            for i, event in enumerate(events[:3]):  # Log first 3 events
                logger.info(f"Event {i+1}: {event.event_title} at {event.time}")
        
        # Convert to dictionaries
        return [event.to_dict() for event in events]
        
    except Exception as e:
        logger.error(f"Error in get_filtered_events: {str(e)}")
        logger.error("Error details:", exc_info=True)
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

def cleanup_db_resources():
    """Clean up database resources by removing the session and closing connections."""
    try:
        # Remove the session
        if db_session:
            db_session.remove()
            logger.info("Database session removed")
        
        # Dispose of the engine connections
        if engine:
            engine.dispose()
            logger.info("Database engine connections disposed")
            
    except Exception as e:
        logger.error(f"Error during database cleanup: {str(e)}") 