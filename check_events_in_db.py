import sys
from datetime import datetime, timedelta
import pytz
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Import database and models
sys.path.append('.')
from config.database import db_session
from models.forex_event import ForexEvent

def check_previous_week_events():
    """Check if there are events for the previous week in the database"""
    # Calculate previous week date range (same logic as in route_handler.py)
    now = datetime.now(pytz.UTC)
    
    # Calculate days to previous Sunday, then go back one more week
    if now.weekday() == 6:  # If today is Sunday
        days_to_start = -7  # Go back one week
    else:
        days_to_start = -(now.weekday() + 1) - 7  # Go back to previous Sunday
    
    week_start = now + timedelta(days=days_to_start)
    start_time = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # End on Saturday of previous week
    week_end = week_start + timedelta(days=6)  # Saturday
    end_time = week_end.replace(hour=23, minute=59, second=59, microsecond=999999)
    
    logger.info(f"Checking for events between {start_time.strftime('%Y-%m-%d')} and {end_time.strftime('%Y-%m-%d')}")
    
    # Query the database
    events = db_session.query(ForexEvent).filter(
        ForexEvent.time >= start_time,
        ForexEvent.time <= end_time
    ).order_by(ForexEvent.time).all()
    
    if events:
        logger.info(f"Found {len(events)} events in the previous week")
        logger.info(f"First event: {events[0].time} - {events[0].event_title}")
        logger.info(f"Last event: {events[-1].time} - {events[-1].event_title}")
    else:
        logger.warning("No events found for the previous week")
    
    # Check total number of events in DB
    total_events = db_session.query(ForexEvent).count()
    logger.info(f"Total events in database: {total_events}")
    
    # Check earliest and latest event dates
    if total_events > 0:
        earliest = db_session.query(ForexEvent).order_by(ForexEvent.time.asc()).first()
        latest = db_session.query(ForexEvent).order_by(ForexEvent.time.desc()).first()
        logger.info(f"Earliest event in DB: {earliest.time} - {earliest.event_title}")
        logger.info(f"Latest event in DB: {latest.time} - {latest.event_title}")
    
    return events

if __name__ == "__main__":
    try:
        events = check_previous_week_events()
        
        # If no events found, let's check events from Feb 2025 which should exist
        if not events:
            logger.info("Checking for events in the standard test period (Feb 2-9, 2025)")
            
            # Fixed date range for testing
            start_test = datetime(2025, 2, 2, tzinfo=pytz.UTC)
            end_test = datetime(2025, 2, 9, tzinfo=pytz.UTC)
            
            test_events = db_session.query(ForexEvent).filter(
                ForexEvent.time >= start_test, 
                ForexEvent.time <= end_test
            ).all()
            
            if test_events:
                logger.info(f"Found {len(test_events)} events in Feb 2-9, 2025")
            else:
                logger.warning("No events found in the test period either!")
    
    finally:
        db_session.close() 