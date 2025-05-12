import os
import sys
import logging
from datetime import datetime, timedelta
import pytz
import pymysql
import json
from pathlib import Path

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Add the current directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Directory to store weekly event files
WEEKLY_STORAGE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'weekly_events')
os.makedirs(WEEKLY_STORAGE_DIR, exist_ok=True)

def get_week_filename(date: datetime) -> str:
    """
    Generate filename for a specific week's events
    Week starts on Sunday (weekday 6) and ends on Saturday (weekday 5)
    """
    # Get the current weekday (0 = Monday, 6 = Sunday)
    current_weekday = date.weekday()
    
    # Calculate days to the start of the week (Sunday)
    if current_weekday == 6:  # If today is Sunday
        days_to_start = 0
    else:
        days_to_start = -(current_weekday + 1)  # Go back to previous Sunday
    
    # Get Sunday (start of week)
    week_start = date + timedelta(days=days_to_start)
    # Get Saturday (end of week)
    week_end = week_start + timedelta(days=6)
    
    return f"week_{week_start.strftime('%Y%m%d')}_to_{week_end.strftime('%Y%m%d')}.json"

def fetch_events_for_week(week_offset: int = 0) -> list:
    """
    Fetch events for a specific week from the database
    week_offset: 0 for current week, -1 for previous week, 1 for next week, etc.
    """
    try:
        # Get current time in UTC
        now = datetime.now(pytz.UTC)
        
        # Calculate target week based on offset
        if now.weekday() == 6:  # If today is Sunday
            days_to_start = 0 + (week_offset * 7)  # Current Sunday + offset
        else:
            days_to_start = -(now.weekday() + 1) + (week_offset * 7)  # Go back to previous Sunday + offset
        
        week_start = now + timedelta(days=days_to_start)
        start_time = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
        
        # End on Saturday of target week
        week_end = week_start + timedelta(days=6)  # Saturday
        end_time = week_end.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        logger.info(f"Fetching events for week: {start_time.strftime('%Y-%m-%d')} to {end_time.strftime('%Y-%m-%d')}")
        
        # Connect directly to the database
        conn = pymysql.connect(
            host='141.95.123.145',
            user='forex_user',
            password='UltraFX#736',
            db='forex_db',
            charset='utf8mb4',
            connect_timeout=60
        )
        
        # Create a cursor and execute the query
        with conn.cursor(pymysql.cursors.DictCursor) as cursor:
            # Format the date strings for SQL
            start_str = start_time.strftime('%Y-%m-%d %H:%M:%S')
            end_str = end_time.strftime('%Y-%m-%d %H:%M:%S')
            
            # Execute the query directly with SQL
            query = """
            SELECT id, event_title, currency, impact, time, forecast, previous, actual, 
                   source, url, ai_summary, created_at, updated_at
            FROM forex_events 
            WHERE time BETWEEN %s AND %s
            ORDER BY time
            """
            
            cursor.execute(query, (start_str, end_str))
            events = cursor.fetchall()
            
            # Convert datetime objects to strings for JSON serialization
            formatted_events = []
            for event in events:
                # Format the event for JSON storage
                formatted_event = {
                    'id': event['id'],
                    'time': event['time'].isoformat() if event['time'] else None,
                    'currency': event['currency'],
                    'impact': event['impact'],
                    'event_title': event['event_title'],
                    'forecast': event['forecast'],
                    'previous': event['previous'],
                    'actual': event['actual'],
                    'source': event['source'],
                    'url': event['url'],
                    'ai_summary': event['ai_summary'],
                    'created_at': event['created_at'].isoformat() if event['created_at'] else None,
                    'updated_at': event['updated_at'].isoformat() if event['updated_at'] else None
                }
                formatted_events.append(formatted_event)
            
            # Close the connection
            conn.close()
            
            logger.info(f"Found {len(formatted_events)} events for the week")
            return {
                'events': formatted_events,
                'week_start': start_time.isoformat(),
                'week_end': end_time.isoformat(),
                'last_updated': now.isoformat()
            }
                
    except Exception as e:
        logger.error(f"Error fetching events for week: {str(e)}")
        logger.exception("Exception details:")
        return {'events': [], 'error': str(e)}

def store_weekly_events(week_data: dict, week_offset: int = 0) -> bool:
    """Store events in a weekly file"""
    try:
        # Get current time and calculate the target week date
        now = datetime.now(pytz.UTC)
        target_date = now + timedelta(weeks=week_offset)
        
        # Generate filename for the week
        filename = get_week_filename(target_date)
        filepath = os.path.join(WEEKLY_STORAGE_DIR, filename)
        
        # Write data to JSON file
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(week_data, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Successfully stored {len(week_data['events'])} events in {filepath}")
        return True
        
    except Exception as e:
        logger.error(f"Error storing weekly events: {str(e)}")
        logger.exception("Exception details:")
        return False

def process_weeks(start_offset: int = -4, end_offset: int = 4) -> None:
    """
    Process a range of weeks and store their events
    start_offset: negative number for past weeks
    end_offset: positive number for future weeks
    """
    logger.info(f"Processing weeks from offset {start_offset} to {end_offset}")
    
    for offset in range(start_offset, end_offset + 1):
        logger.info(f"Processing week with offset {offset}")
        week_data = fetch_events_for_week(offset)
        
        if week_data and 'events' in week_data and week_data['events']:
            success = store_weekly_events(week_data, offset)
            if success:
                logger.info(f"Successfully processed week with offset {offset}")
            else:
                logger.error(f"Failed to store events for week with offset {offset}")
        else:
            logger.warning(f"No events found for week with offset {offset}")

def main():
    try:
        # Process a range of weeks: from 4 weeks ago to 4 weeks in the future
        process_weeks(start_offset=-4, end_offset=4)
        logger.info("Weekly events processing completed successfully")
    except Exception as e:
        logger.error(f"Error in main function: {str(e)}")
        logger.exception("Exception details:")

if __name__ == "__main__":
    main() 