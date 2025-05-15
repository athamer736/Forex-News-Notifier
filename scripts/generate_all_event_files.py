#!/usr/bin/env python
"""
This script directly fetches all events from the database and generates JSON files.
It ensures that events from all time periods (past, present, future) are properly stored
in the weekly event files, fixing issues with the previous week display.
"""
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

# Add the project root to path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
sys.path.append(project_root)

# Directory to store weekly event files
WEEKLY_STORAGE_DIR = os.path.join(project_root, 'weekly_events')
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

def fetch_all_events_from_database() -> dict:
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

def generate_event_files(events_by_week: dict) -> None:
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

def main():
    try:
        logger.info("Starting database event extraction")
        
        # Fetch all events from database and organize by week
        events_by_week = fetch_all_events_from_database()
        
        # Generate JSON files for each week
        generate_event_files(events_by_week)
        
        logger.info("Event extraction and file generation completed successfully")
    except Exception as e:
        logger.error(f"Error in main function: {str(e)}")
        logger.exception("Exception details:")

if __name__ == "__main__":
    main() 