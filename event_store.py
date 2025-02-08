from datetime import datetime, timedelta
import pytz
import logging
from typing import List, Dict

logger = logging.getLogger(__name__)

# In-memory store for events
event_store = {
    'events': [],
    'last_updated': None
}

def store_events(events: List[Dict]) -> None:
    """Store events in memory with UTC timestamps"""
    if not events:
        logger.warning("Attempted to store empty events list")
        return
    
    # Store events and update timestamp
    event_store['events'] = events
    event_store['last_updated'] = datetime.now(pytz.UTC)
    logger.info(f"Stored {len(events)} events in memory")

def convert_to_user_timezone(event: Dict, user_tz: pytz.timezone) -> Dict:
    """Convert a single event's time to user's timezone"""
    try:
        # Parse the UTC time
        utc_time = datetime.fromisoformat(event['time'])
        if utc_time.tzinfo is None:
            utc_time = pytz.UTC.localize(utc_time)
        
        # Convert to user's timezone
        local_time = utc_time.astimezone(user_tz)
        
        # Create a copy with the converted time
        event_copy = event.copy()
        event_copy['time'] = local_time.strftime('%Y-%m-%d %H:%M')
        return event_copy
    except Exception as e:
        logger.error(f"Error converting event time: {event}")
        logger.exception(e)
        return event

def get_filtered_events(time_range: str, user_timezone: str) -> List[Dict]:
    """
    Filter stored events based on time range and user's timezone
    
    Args:
        time_range: One of '1h', '4h', '8h', '12h', '24h', 'today', 'tomorrow', 'week'
        user_timezone: User's timezone (e.g., 'America/New_York')
    """
    if not event_store['events']:
        logger.warning("No events in store")
        return []

    try:
        # Get user's timezone
        user_tz = pytz.timezone(user_timezone)
        current_time = datetime.now(pytz.UTC)  # Keep in UTC for initial comparison
        logger.debug(f"Filtering events for {time_range} from {current_time} (UTC)")

        # Calculate filter time range in UTC
        if time_range.endswith('h'):
            hours = int(time_range[:-1])
            start_time = current_time
            end_time = current_time + timedelta(hours=hours)
        elif time_range == 'today':
            local_now = current_time.astimezone(user_tz)
            start_time = local_now.replace(hour=0, minute=0, second=0, microsecond=0).astimezone(pytz.UTC)
            end_time = local_now.replace(hour=23, minute=59, second=59, microsecond=999999).astimezone(pytz.UTC)
        elif time_range == 'tomorrow':
            local_tomorrow = (current_time + timedelta(days=1)).astimezone(user_tz)
            start_time = local_tomorrow.replace(hour=0, minute=0, second=0, microsecond=0).astimezone(pytz.UTC)
            end_time = local_tomorrow.replace(hour=23, minute=59, second=59, microsecond=999999).astimezone(pytz.UTC)
        elif time_range == 'week':
            start_time = current_time
            end_time = current_time + timedelta(days=7)
        else:
            logger.error(f"Invalid time range: {time_range}")
            return []

        logger.debug(f"Filtering events between {start_time} and {end_time} (UTC)")
        filtered_events = []
        
        for event in event_store['events']:
            try:
                # Parse the UTC time
                event_time = datetime.fromisoformat(event['time'])
                if event_time.tzinfo is None:
                    event_time = pytz.UTC.localize(event_time)
                
                # First filter in UTC
                if start_time <= event_time <= end_time:
                    # Convert to user's timezone for display
                    converted_event = convert_to_user_timezone(event, user_tz)
                    filtered_events.append(converted_event)
                    logger.debug(f"Including event: {converted_event['event_title']} at {converted_event['time']}")
                else:
                    logger.debug(f"Excluding event: {event['event_title']} at {event_time}")
            except Exception as e:
                logger.error(f"Error processing event: {event}")
                logger.exception(e)
                continue

        # Sort by time
        filtered_events.sort(key=lambda x: datetime.strptime(x['time'], '%Y-%m-%d %H:%M'))
        logger.info(f"Returning {len(filtered_events)} filtered events")
        
        # Log all events for debugging
        if not filtered_events:
            logger.warning("No events found in the specified range")
            logger.debug("Available events in store:")
            for event in event_store['events']:
                logger.debug(f"Stored event: {event['event_title']} at {event['time']}")
        
        return filtered_events

    except Exception as e:
        logger.error(f"Error filtering events: {str(e)}")
        logger.exception(e)
        return [] 