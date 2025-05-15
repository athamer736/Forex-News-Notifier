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
            
            # Convert to the correct format for JSON serialization
            formatted_events = []
            for event in events:
                # Format the event according to the required JSON structure
                formatted_event = {
                    'time': event['time'].strftime('%Y-%m-%dT%H:%M:%S+00:00') if event['time'] else None,
                    'currency': event['currency'],
                    'impact': event['impact'],
                    'event_title': event['event_title'],
                    'forecast': event['forecast'],
                    'previous': event['previous'],
                    'source': event['source'] if event['source'] else 'forexfactory'
                }
                formatted_events.append(formatted_event)
            
            # Close the connection
            conn.close()
            
            logger.info(f"Found {len(formatted_events)} events for the week")
            return formatted_events
                
    except Exception as e:
        logger.error(f"Error fetching events for week: {str(e)}")
        logger.exception("Exception details:")
        return []

def fetch_all_weeks_from_database() -> dict:
    """
    Fetch all events from the database and organize them by week
    Returns a dictionary with ISO week keys and event lists as values
    """
    try:
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
            # Query all events, not just limited to specific dates
            query = """
            SELECT id, event_title, currency, impact, time, forecast, previous, actual, 
                   source, url, ai_summary, created_at, updated_at
            FROM forex_events 
            ORDER BY time
            """
            
            cursor.execute(query)
            all_events = cursor.fetchall()
            
            # Close the connection
            conn.close()
            
            logger.info(f"Fetched {len(all_events)} events from database")
            
            # Organize events by week
            events_by_week = {}
            for event in all_events:
                # Get event time
                event_time = event['time']
                if not event_time:
                    continue
                
                # Determine the week of the event
                # Calculate days to the start of the week (Sunday)
                current_weekday = event_time.weekday()
                if current_weekday == 6:  # If Sunday
                    days_to_start = 0
                else:
                    days_to_start = -(current_weekday + 1)  # Go back to previous Sunday
                
                # Get the week start date (Sunday)
                week_start = event_time + timedelta(days=days_to_start)
                week_key = week_start.strftime('%Y%m%d')
                
                # Initialize the week if it doesn't exist
                if week_key not in events_by_week:
                    events_by_week[week_key] = []
                
                # Format the event for JSON storage in the correct format
                formatted_event = {
                    'time': event_time.strftime('%Y-%m-%dT%H:%M:%S+00:00'),
                    'currency': event['currency'],
                    'impact': event['impact'],
                    'event_title': event['event_title'],
                    'forecast': event['forecast'] or '',
                    'previous': event['previous'] or '',
                    'source': event['source'] or 'forexfactory'
                }
                
                events_by_week[week_key].append(formatted_event)
            
            logger.info(f"Organized events into {len(events_by_week)} weeks")
            return events_by_week
                
    except Exception as e:
        logger.error(f"Error fetching events from database: {str(e)}")
        logger.exception("Exception details:")
        return {}

def store_weekly_events(events: list, week_offset: int = 0) -> bool:
    """Store events in a weekly file with the correct format"""
    try:
        # Get current time and calculate the target week date
        now = datetime.now(pytz.UTC)
        target_date = now + timedelta(weeks=week_offset)
        
        # Generate filename for the week
        filename = get_week_filename(target_date)
        filepath = os.path.join(WEEKLY_STORAGE_DIR, filename)
        
        # Write events directly as an array to JSON file
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(events, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Successfully stored {len(events)} events in {filepath}")
        return True
        
    except Exception as e:
        logger.error(f"Error storing weekly events: {str(e)}")
        logger.exception("Exception details:")
        return False

def generate_all_event_files(events_by_week: dict) -> None:
    """
    Generate JSON event files for each week
    """
    try:
        file_count = 0
        event_count = 0
        
        for week_key, events in events_by_week.items():
            # Skip weeks with no events
            if not events:
                continue
                
            # Parse the week start date
            week_start = datetime.strptime(week_key, '%Y%m%d')
            
            # Create a timezone-aware datetime
            week_start = pytz.UTC.localize(week_start)
            
            # Calculate the week end date (Saturday)
            week_end = week_start + timedelta(days=6)
            
            # Generate the filename
            filename = f"week_{week_start.strftime('%Y%m%d')}_to_{week_end.strftime('%Y%m%d')}.json"
            filepath = os.path.join(WEEKLY_STORAGE_DIR, filename)
            
            # Write events to file in the new format (direct array)
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(events, f, indent=2, ensure_ascii=False)
            
            file_count += 1
            event_count += len(events)
            logger.info(f"Generated file {filename} with {len(events)} events")
        
        logger.info(f"Generated {file_count} weekly event files with {event_count} total events")
        
    except Exception as e:
        logger.error(f"Error generating event files: {str(e)}")
        logger.exception("Exception details:")

def process_weeks(start_offset: int = -4, end_offset: int = 4) -> None:
    """
    Process a range of weeks and store their events
    start_offset: negative number for past weeks
    end_offset: positive number for future weeks
    """
    logger.info(f"Processing weeks from offset {start_offset} to {end_offset}")
    
    for offset in range(start_offset, end_offset + 1):
        logger.info(f"Processing week with offset {offset}")
        events = fetch_events_for_week(offset)
        
        if events:
            success = store_weekly_events(events, offset)
            if success:
                logger.info(f"Successfully processed week with offset {offset}")
            else:
                logger.error(f"Failed to store events for week with offset {offset}")
        else:
            logger.warning(f"No events found for week with offset {offset}")

def process_all_weeks() -> None:
    """
    Process all weeks from the database and generate JSON files
    This is a more comprehensive approach that ensures all events are stored
    """
    logger.info("Processing all weeks from database")
    
    # Fetch all events and organize by week
    events_by_week = fetch_all_weeks_from_database()
    
    # Generate JSON files for each week
    generate_all_event_files(events_by_week)
    
    logger.info("All weeks processed successfully")

def main():
    try:
        # Process all weeks from the database (more comprehensive)
        process_all_weeks()
        
        # Also process specific range of weeks as backup
        process_weeks(start_offset=-8, end_offset=8)
        
        logger.info("Weekly events processing completed successfully")
    except Exception as e:
        logger.error(f"Error in main function: {str(e)}")
        logger.exception("Exception details:")

if __name__ == "__main__":
    main() 