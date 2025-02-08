import requests
from datetime import datetime, timedelta
import time
import logging
import pytz
from event_store import store_events, event_store

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# API Configuration
FOREXFACTORY_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9'
}

# API Endpoints
FF_ENDPOINTS = {
    'this_week': "https://nfs.faireconomy.media/ff_calendar_thisweek.json"
}

def should_fetch_data():
    """Check if we should fetch new data based on last update time"""
    if not event_store['last_updated']:
        return True
        
    # Get time since last update
    time_since_update = (datetime.now(pytz.UTC) - event_store['last_updated']).total_seconds() / 3600
    
    # Only fetch if it's been more than 1 hour since last update
    return time_since_update >= 1

def fetch_forexfactory_events():
    """Fetch events from ForexFactory feeds"""
    all_events = []
    
    try:
        for period, url in FF_ENDPOINTS.items():
            logger.info(f"Fetching {period} events from ForexFactory")
            response = requests.get(url, headers=FOREXFACTORY_HEADERS, timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    all_events.extend(data)
                    logger.info(f"Successfully fetched {len(data)} events from ForexFactory {period}")
                    
                    # Store raw events locally for backup
                    try:
                        import json
                        import os
                        from datetime import datetime
                        
                        # Create a directory for storing events if it doesn't exist
                        os.makedirs('event_data', exist_ok=True)
                        
                        # Store with timestamp
                        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                        filename = f'event_data/forexfactory_events_{timestamp}.json'
                        
                        with open(filename, 'w', encoding='utf-8') as f:
                            json.dump(data, f, indent=2, ensure_ascii=False)
                        logger.info(f"Stored {len(data)} raw events to {filename}")
                        
                        # Keep only the last 5 backup files
                        backup_files = sorted([f for f in os.listdir('event_data') 
                                            if f.startswith('forexfactory_events_')])
                        for old_file in backup_files[:-5]:  # Keep last 5 files
                            os.remove(os.path.join('event_data', old_file))
                            logger.debug(f"Removed old backup file: {old_file}")
                    except Exception as e:
                        logger.error(f"Error storing raw events locally: {str(e)}")
                        
            elif response.status_code == 429:
                logger.warning(f"Rate limit hit for ForexFactory {period}")
            else:
                logger.warning(f"Failed to fetch ForexFactory {period} events: {response.status_code}")
                
    except Exception as e:
        logger.error(f"Error fetching ForexFactory events: {str(e)}")
    
    return all_events

def format_event(event):
    """Format event data into a standardized structure"""
    try:
        # Format ForexFactory event
        try:
            date_str = event['date'].replace('Z', '').replace('+00:00', '')
            et_time = datetime.fromisoformat(date_str)
        except (ValueError, KeyError):
            try:
                # Try alternative format
                date_str = event.get('date', '')
                time_str = event.get('time', '')
                if not date_str or not time_str:
                    logger.warning(f"Skipping ForexFactory event with empty date/time: {event}")
                    return None
                datetime_str = f"{date_str} {time_str}"
                et_time = datetime.strptime(datetime_str, '%Y-%m-%d %H:%M:%S')
            except ValueError:
                logger.error(f"Could not parse ForexFactory date: {event.get('date', '')}")
                return None
        
        # Convert to UTC
        et_tz = pytz.timezone('America/New_York')
        if et_time.tzinfo is None:
            et_time = et_tz.localize(et_time)
        utc_time = et_time.astimezone(pytz.UTC)
        
        return {
            'time': utc_time.isoformat(),
            'currency': event.get('country', event.get('currency', '')),
            'impact': event.get('impact', 'Low'),
            'event_title': event.get('title', ''),
            'forecast': event.get('forecast', 'N/A'),
            'previous': event.get('previous', 'N/A'),
            'source': 'forexfactory'
        }
    except Exception as e:
        logger.error(f"Error formatting event: {str(e)}")
        return None

def fetch_and_store_events():
    """Fetch events from ForexFactory and store them"""
    try:
        if not should_fetch_data():
            logger.info("Using cached data - next update in {} minutes".format(
                int(60 - ((datetime.now(pytz.UTC) - event_store['last_updated']).total_seconds() / 60))
            ))
            return True
            
        logger.info("Fetching new data from ForexFactory")
        
        # Fetch events
        forexfactory_events = fetch_forexfactory_events()
        
        # Format events
        formatted_events = []
        current_utc = datetime.now(pytz.UTC)
        
        # Process ForexFactory events
        for event in forexfactory_events:
            formatted_event = format_event(event)
            if formatted_event:
                formatted_events.append(formatted_event)
        
        if not formatted_events:
            logger.warning("No valid events found after processing")
            return False
        
        # Remove duplicates (based on time and title)
        unique_events = {f"{e['time']}-{e['event_title']}": e for e in formatted_events}.values()
        final_events = list(unique_events)
        
        # Sort events by time
        final_events.sort(key=lambda x: x['time'])
        
        # Store the events
        store_events(final_events)
        logger.info(f"Successfully processed and stored {len(final_events)} events")
        return True
        
    except Exception as e:
        logger.error(f"Error in fetch_and_store_events: {str(e)}")
        if event_store['events']:
            logger.info("Using cached data after error")
            return True
        return False

def fetch_events():
    """Main function to fetch events"""
    try:
        return fetch_and_store_events()
    except Exception as e:
        logger.error(f"Error in fetch_events: {str(e)}")
        return False 