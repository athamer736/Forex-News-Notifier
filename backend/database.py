import os
from sqlalchemy import create_engine, and_, or_
from sqlalchemy.orm import sessionmaker, scoped_session, declarative_base
from sqlalchemy_utils import database_exists, create_database
from datetime import datetime, timedelta
from typing import List, Optional
import pytz
import logging
from dotenv import load_dotenv

# Load environment variables from the project root
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(project_root, '.env')
load_dotenv(env_path)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database configuration
DB_HOST = "141.95.123.145"  # Server IP
DB_PORT = int(os.getenv('DB_PORT', '3306'))
DB_NAME = "forex_db"
DB_USER = "forex_user"
DB_PASSWORD = "UltraFX#736"

# Create database URL using PyMySQL
DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Log the connection details (without password)
logger.info(f"Connecting to database at {DB_HOST}:{DB_PORT}/{DB_NAME} as {DB_USER}")

try:
    # Create engine with PyMySQL
    engine = create_engine(
        DATABASE_URL,
        pool_size=5,
        max_overflow=10,
        pool_timeout=30,
        pool_recycle=1800
    )
    
    # Create database if it doesn't exist
    if not database_exists(engine.url):
        create_database(engine.url)
        logger.info(f"Created database: {DB_NAME}")
    
    # Create session factory
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    # Create scoped session
    db_session = scoped_session(SessionLocal)
    
    # Create base class for models
    Base = declarative_base()
    Base.query = db_session.query_property()

except Exception as e:
    logger.error(f"Error configuring database: {str(e)}")
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