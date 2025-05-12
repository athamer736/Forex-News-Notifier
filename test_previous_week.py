import os
import sys
import logging
from datetime import datetime, timedelta
import pytz

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Add the current directory to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import database functions
from backend.database import get_filtered_events, db_session

def test_previous_week_query():
    """Test retrieving events for the previous week"""
    try:
        # Get current time in UTC
        now = datetime.now(pytz.UTC)
        logger.info(f"Current time (UTC): {now.isoformat()}")
        
        # Calculate previous week date range
        if now.weekday() == 6:  # If today is Sunday
            days_to_start = -7  # Go back one week
        else:
            days_to_start = -(now.weekday() + 1) - 7  # Go back to previous Sunday
        
        week_start = now + timedelta(days=days_to_start)
        start_time = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
        
        # End on Saturday of previous week
        week_end = week_start + timedelta(days=6)  # Saturday
        end_time = week_end.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        logger.info(f"Previous week date range: {start_time.strftime('%Y-%m-%d')} to {end_time.strftime('%Y-%m-%d')}")
        logger.info(f"Query time range: {start_time.isoformat()} to {end_time.isoformat()}")
        
        # Execute database query
        events = get_filtered_events(
            start_time=start_time,
            end_time=end_time
        )
        
        # Check results
        if events:
            logger.info(f"Found {len(events)} events for previous week")
            # Print first few events
            for i, event in enumerate(events[:5]):
                logger.info(f"Event {i+1}: {event['event_title']} at {event['time']}")
        else:
            logger.warning("No events found for previous week")
            
            # Testing broader date range to see if data exists
            broader_start = start_time - timedelta(days=7)
            broader_end = end_time + timedelta(days=7)
            logger.info(f"Testing broader date range: {broader_start.strftime('%Y-%m-%d')} to {broader_end.strftime('%Y-%m-%d')}")
            
            broader_events = get_filtered_events(
                start_time=broader_start,
                end_time=broader_end
            )
            
            if broader_events:
                logger.info(f"Found {len(broader_events)} events in broader date range")
                for i, event in enumerate(broader_events[:5]):
                    logger.info(f"Broader Event {i+1}: {event['event_title']} at {event['time']}")
            else:
                logger.warning("No events found in broader date range either")
                
                # Check if any events exist in the database
                from models.forex_event import ForexEvent
                sample_query = db_session.query(ForexEvent).order_by(ForexEvent.time).limit(5)
                sample_events = sample_query.all()
                
                if sample_events:
                    logger.info(f"Database contains events. Sample of {len(sample_events)} events:")
                    for i, event in enumerate(sample_events):
                        logger.info(f"Sample {i+1}: {event.event_title} at {event.time}")
                else:
                    logger.error("Database appears to be empty!")
        
    except Exception as e:
        logger.error(f"Error testing previous week query: {str(e)}")
        logger.exception("Exception details:")

if __name__ == "__main__":
    test_previous_week_query() 