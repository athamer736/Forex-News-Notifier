import requests
from datetime import datetime, timedelta
import time
import logging
import pytz
from event_store import store_events, event_store
from mt5_calendar import MT5Calendar

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Headers for the API request
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9'
}

# Initialize MT5 Calendar
mt5_calendar = MT5Calendar()

def should_fetch_data():
    """Check if we should fetch new data based on last update time"""
    if not event_store['last_updated']:
        return True
        
    # Get time since last update
    time_since_update = (datetime.now(pytz.UTC) - event_store['last_updated']).total_seconds() / 3600
    
    # Only fetch if it's been more than 1 hour since last update
    return time_since_update >= 1

def fetch_calendar_data(url):
    """Fetch data from a specific calendar URL"""
    try:
        response = requests.get(url, headers=HEADERS, timeout=15)
        
        if response.status_code == 429:
            logger.warning(f"Rate limit hit for {url}. The API updates once per hour.")
            return None
            
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logger.error(f"Error fetching data from {url}: {str(e)}")
        return None

def fetch_and_store_events():
    """Fetch events from ForexFactory and MT5, then store them"""
    try:
        # Check if we need to fetch new data
        if not should_fetch_data():
            logger.info("Using cached data - next update in {} minutes".format(
                int(60 - ((datetime.now(pytz.UTC) - event_store['last_updated']).total_seconds() / 60))
            ))
            return True
            
        logger.info("Fetching new data from sources")
        
        # URLs for different time periods from ForexFactory
        ff_urls = {
            'last_week': "https://nfs.faireconomy.media/ff_calendar_lastweek.json",
            'this_week': "https://nfs.faireconomy.media/ff_calendar_thisweek.json",
            'next_week': "https://nfs.faireconomy.media/ff_calendar_nextweek.json"
        }
        
        all_events = []
        
        # Fetch from ForexFactory
        for period, url in ff_urls.items():
            logger.info(f"Fetching {period} data from ForexFactory")
            events = fetch_calendar_data(url)
            if events:
                for event in events:
                    event['source'] = 'forexfactory'
                all_events.extend(events)
                logger.info(f"Added {len(events)} events from ForexFactory {period}")
            else:
                logger.warning(f"No data retrieved from ForexFactory for {period}")
                
        # Fetch from MT5
        logger.info("Fetching data from MetaTrader 5")
        mt5_events = mt5_calendar.fetch_calendar_events()
        if mt5_events:
            all_events.extend(mt5_events)
            logger.info(f"Added {len(mt5_events)} events from MT5")
        else:
            logger.warning("No data retrieved from MT5")
        
        if not all_events:
            logger.warning("No events fetched from any source")
            if event_store['events']:
                logger.info("Using cached data")
                return True
            return False
            
        logger.info(f"Successfully fetched {len(all_events)} total events")
        
        # Convert times to UTC and format events
        formatted_events = []
        et_tz = pytz.timezone('America/New_York')  # ForexFactory times are in ET
        current_utc = datetime.now(pytz.UTC)
        
        for event in all_events:
            try:
                if event['source'] == 'forexfactory':
                    # Parse the date string (in ET)
                    date_str = event['date'].replace('Z', '').replace('+00:00', '')
                    et_time = datetime.fromisoformat(date_str)
                    if et_time.tzinfo is None:
                        et_time = et_tz.localize(et_time)
                    utc_time = et_time.astimezone(pytz.UTC)
                    
                    # Format event data
                    formatted_event = {
                        'time': utc_time.isoformat(),
                        'currency': event['country'],
                        'impact': event['impact'],
                        'event_title': event['title'],
                        'forecast': event.get('forecast', 'N/A'),
                        'previous': event.get('previous', 'N/A'),
                        'actual': event.get('actual', 'N/A'),
                        'source': event['source']
                    }
                else:  # MT5 events are already formatted
                    formatted_event = event
                    
                formatted_events.append(formatted_event)
                logger.debug(f"Added event: {formatted_event['event_title']} at {formatted_event['time']} from {formatted_event['source']}")
            
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