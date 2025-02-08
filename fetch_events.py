import requests
from datetime import datetime, timedelta
import time
import logging
import pytz
from event_store import store_events, event_store

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Headers for the API request
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9'
}

def should_fetch_data():
    """Check if we should fetch new data based on last update time"""
    if not event_store['last_updated']:
        return True
        
    # Get time since last update
    time_since_update = (datetime.now(pytz.UTC) - event_store['last_updated']).total_seconds() / 3600
    
    # Only fetch if it's been more than 1 hour since last update
    return time_since_update >= 1

def fetch_and_store_events():
    """Fetch events from the API and store them"""
    try:
        # Check if we need to fetch new data
        if not should_fetch_data():
            logger.info("Using cached data - next update in {} minutes".format(
                int(60 - ((datetime.now(pytz.UTC) - event_store['last_updated']).total_seconds() / 60))
            ))
            return True
            
        logger.info("Fetching new data from API")
        
        # Try to fetch this week's data
        url = "https://nfs.faireconomy.media/ff_calendar_thisweek.json"
        response = requests.get(url, headers=HEADERS, timeout=15)
        
        if response.status_code == 429:
            logger.warning("Rate limit hit. The API updates once per hour.")
            if event_store['events']:
                logger.info("Using cached data")
                return True
            return False
            
        response.raise_for_status()
        events = response.json()
        logger.info(f"Successfully fetched {len(events)} events")
        
        # Convert times to UTC and format events
        formatted_events = []
        et_tz = pytz.timezone('America/New_York')  # API times are in ET
        current_utc = datetime.now(pytz.UTC)
        
        for event in events:
            try:
                # Parse the date string (in ET)
                date_str = event['date'].replace('Z', '').replace('+00:00', '')
                et_time = datetime.fromisoformat(date_str)
                
                # Make sure it's timezone aware
                if et_time.tzinfo is None:
                    et_time = et_tz.localize(et_time)
                
                # Convert to UTC
                utc_time = et_time.astimezone(pytz.UTC)
                
                # Only include events that haven't happened yet or are very recent
                time_diff = (utc_time - current_utc).total_seconds() / 3600
                if time_diff > -1:  # Include events from the last hour
                    formatted_event = {
                        'time': utc_time.isoformat(),
                        'currency': event['country'],
                        'impact': event['impact'],
                        'event_title': event['title'],
                        'forecast': event.get('forecast', 'N/A'),
                        'previous': event.get('previous', 'N/A')
                    }
                    formatted_events.append(formatted_event)
                    logger.debug(f"Added event: {formatted_event['event_title']} at {formatted_event['time']}")
            
            except Exception as e:
                logger.error(f"Error processing event: {event}")
                logger.exception(e)
                continue
        
        if not formatted_events:
            logger.warning("No valid events found after processing")
            return False
        
        # Sort events by time
        formatted_events.sort(key=lambda x: x['time'])
        
        # Store the events
        store_events(formatted_events)
        logger.info(f"Successfully processed and stored {len(formatted_events)} events")
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