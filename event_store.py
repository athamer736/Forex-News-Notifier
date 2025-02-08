from datetime import datetime, timedelta
import pytz
import logging
from typing import List, Dict
import json
import os

logger = logging.getLogger(__name__)

# In-memory store for events
event_store = {
    'events': [],
    'last_updated': None,
    'cache_status': 'uninitialized'  # possible values: uninitialized, updating, ready, error
}

def store_events(events: List[Dict]) -> None:
    """Store events in memory with UTC timestamps"""
    if not events:
        logger.warning("Attempted to store empty events list")
        return
    
    try:
        event_store['cache_status'] = 'updating'
        
        # Store events and update timestamp
        event_store['events'] = events
        event_store['last_updated'] = datetime.now(pytz.UTC)
        event_store['cache_status'] = 'ready'
        
        logger.info(f"Stored {len(events)} events in memory")
        
        # Also save to disk as backup
        try:
            backup_dir = 'cache'
            os.makedirs(backup_dir, exist_ok=True)
            
            backup_file = os.path.join(backup_dir, 'events_cache.json')
            backup_data = {
                'events': events,
                'last_updated': event_store['last_updated'].isoformat()
            }
            
            with open(backup_file, 'w', encoding='utf-8') as f:
                json.dump(backup_data, f, indent=2, ensure_ascii=False)
            logger.info(f"Saved cache backup to {backup_file}")
            
        except Exception as e:
            logger.error(f"Error saving cache backup: {str(e)}")
            
    except Exception as e:
        event_store['cache_status'] = 'error'
        logger.error(f"Error storing events: {str(e)}")

def load_cached_events() -> bool:
    """Load events from disk cache if available"""
    try:
        backup_file = os.path.join('cache', 'events_cache.json')
        if os.path.exists(backup_file):
            with open(backup_file, 'r', encoding='utf-8') as f:
                backup_data = json.load(f)
            
            event_store['events'] = backup_data['events']
            event_store['last_updated'] = datetime.fromisoformat(backup_data['last_updated'])
            event_store['cache_status'] = 'ready'
            
            logger.info(f"Loaded {len(event_store['events'])} events from cache backup")
            return True
    except Exception as e:
        logger.error(f"Error loading cache backup: {str(e)}")
        event_store['cache_status'] = 'error'
    return False

def get_cache_status() -> Dict:
    """Get current status of the event cache"""
    return {
        'status': event_store['cache_status'],
        'last_updated': event_store['last_updated'].isoformat() if event_store['last_updated'] else None,
        'event_count': len(event_store['events']),
        'next_update': (event_store['last_updated'] + timedelta(hours=1)).isoformat() if event_store['last_updated'] else None
    }

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

def get_filtered_events(time_range: str, user_timezone: str, selected_currencies: List[str] = None, selected_impacts: List[str] = None) -> List[Dict]:
    """
    Filter stored events based on time range, user's timezone, currencies, and impact levels
    
    Args:
        time_range: One of '24h', 'today', 'tomorrow', 'week', 'remaining_week'
        user_timezone: User's timezone (e.g., 'America/New_York')
        selected_currencies: List of currency codes to filter by (e.g., ['USD', 'GBP'])
        selected_impacts: List of impact levels to filter by (e.g., ['High', 'Medium'])
    """
    if not event_store['events']:
        logger.warning("No events in store")
        return []

    try:
        # Get user's timezone
        user_tz = pytz.timezone(user_timezone)
        current_time = datetime.now(pytz.UTC)
        local_now = current_time.astimezone(user_tz)
        logger.debug(f"Filtering events for {time_range} from {current_time} (UTC)")

        # Calculate filter time range in UTC
        if time_range.endswith('h'):
            hours = int(time_range[:-1])
            start_time = current_time
            end_time = current_time + timedelta(hours=hours)
        elif time_range == 'today':
            start_time = local_now.replace(hour=0, minute=0, second=0, microsecond=0).astimezone(pytz.UTC)
            end_time = local_now.replace(hour=23, minute=59, second=59, microsecond=999999).astimezone(pytz.UTC)
        elif time_range == 'tomorrow':
            tomorrow = local_now + timedelta(days=1)
            start_time = tomorrow.replace(hour=0, minute=0, second=0, microsecond=0).astimezone(pytz.UTC)
            end_time = tomorrow.replace(hour=23, minute=59, second=59, microsecond=999999).astimezone(pytz.UTC)
        elif time_range == 'week':
            # Get the start of the current week (Monday)
            monday = local_now - timedelta(days=local_now.weekday())
            start_time = monday.replace(hour=0, minute=0, second=0, microsecond=0).astimezone(pytz.UTC)
            # Get the end of the week (Sunday)
            sunday = monday + timedelta(days=6)
            end_time = sunday.replace(hour=23, minute=59, second=59, microsecond=999999).astimezone(pytz.UTC)
        elif time_range == 'remaining_week':
            # Start from current time
            start_time = current_time
            # Get the end of the current week (Sunday)
            days_until_sunday = 6 - local_now.weekday()
            sunday = local_now + timedelta(days=days_until_sunday)
            end_time = sunday.replace(hour=23, minute=59, second=59, microsecond=999999).astimezone(pytz.UTC)
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
                
                # First filter by time range
                if start_time <= event_time <= end_time:
                    # Then filter by currency if specified
                    event_currency = event['currency'].upper()
                    if selected_currencies and event_currency not in selected_currencies:
                        logger.debug(f"Excluding event due to currency filter: {event['event_title']} ({event_currency})")
                        continue
                        
                    # Filter by impact if specified
                    event_impact = event['impact'].lower()
                    if selected_impacts:
                        if 'non-economic' in [imp.lower() for imp in selected_impacts]:
                            # Include both non-economic events and events matching other selected impacts
                            if event_impact not in ['high', 'medium', 'low'] and event_impact != 'non-economic':
                                event_impact = 'non-economic'
                            if event_impact not in [imp.lower() for imp in selected_impacts]:
                                logger.debug(f"Excluding event due to impact filter: {event['event_title']} ({event_impact})")
                                continue
                        elif event_impact not in [imp.lower() for imp in selected_impacts]:
                            logger.debug(f"Excluding event due to impact filter: {event['event_title']} ({event_impact})")
                            continue
                        
                    # Convert to user's timezone for display
                    converted_event = convert_to_user_timezone(event, user_tz)
                    filtered_events.append(converted_event)
                    logger.debug(f"Including event: {converted_event['event_title']} at {converted_event['time']}")
                else:
                    logger.debug(f"Excluding event due to time range: {event['event_title']} at {event_time}")
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