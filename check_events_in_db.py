import os
import sys
import logging
from datetime import datetime, timedelta
import pytz
import pymysql

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Add the current directory to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def check_previous_week_events():
    """Test retrieving events for the previous week using direct database connection"""
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
        
        # Connect directly to the database
        conn = pymysql.connect(
            host='141.95.123.145',
            user='forex_user',
            password='UltraFX#736',
            db='forex_db',
            charset='utf8mb4',
            connect_timeout=60
        )
        
        logger.info("Database connection established successfully")
        
        # Create a cursor and execute the query
        with conn.cursor(pymysql.cursors.DictCursor) as cursor:
            # Format the date strings for SQL
            start_str = start_time.strftime('%Y-%m-%d %H:%M:%S')
            end_str = end_time.strftime('%Y-%m-%d %H:%M:%S')
            
            # Execute the query directly with SQL
            query = """
            SELECT id, event_title, currency, impact, time, forecast, previous, actual
            FROM forex_events 
            WHERE time BETWEEN %s AND %s
            ORDER BY time
            """
            
            cursor.execute(query, (start_str, end_str))
            events = cursor.fetchall()
            
            # Check results
            if events:
                logger.info(f"Found {len(events)} events for previous week")
                # Print first few events
                for i, event in enumerate(events[:5]):
                    logger.info(f"Event {i+1}: {event['event_title']} at {event['time']}")
                return events
            else:
                logger.warning("No events found for previous week")
                return []
                
    except Exception as e:
        logger.error(f"Error testing previous week query: {str(e)}")
        logger.exception("Exception details:")
        return []

if __name__ == "__main__":
    events = check_previous_week_events()
    logger.info(f"Total events found: {len(events)}") 