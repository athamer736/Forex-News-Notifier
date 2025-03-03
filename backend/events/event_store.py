from datetime import datetime, timedelta
import pytz
import logging
from typing import List, Dict
import json
import os
import gc

logger = logging.getLogger(__name__)

# In-memory store for events
event_store = {
    'events': [],
    'last_updated': None,
    'cache_status': 'uninitialized'  # possible values: uninitialized, updating, ready, error
}

# Add at the top with other constants
WEEKLY_STORAGE_DIR = 'weekly_events'

def get_week_filename(date: datetime) -> str:
    """
    Generate filename for a specific week's events
    Week starts on Sunday (weekday 6) and ends on Saturday (weekday 5)
    """
    # Get the current weekday (0 = Monday, 6 = Sunday)
    current_weekday = date.weekday()
    
    # Calculate days to previous Sunday (start of week)
    if current_weekday == 6:  # If today is Sunday
        days_to_start = 0
    else:
        days_to_start = -(current_weekday + 1)  # Go back to previous Sunday
    
    # Get Sunday (start of week)
    week_start = date + timedelta(days=days_to_start)
    # Get Saturday (end of week)
    week_end = week_start + timedelta(days=6)
    
    return f"week_{week_start.strftime('%Y%m%d')}_to_{week_end.strftime('%Y%m%d')}.json"

def store_weekly_events(events: List[Dict]) -> None:
    """Store events in a weekly file"""
    try:
        os.makedirs(WEEKLY_STORAGE_DIR, exist_ok=True)
        current_time = datetime.now(pytz.UTC)
        filename = get_week_filename(current_time)
        filepath = os.path.join(WEEKLY_STORAGE_DIR, filename)

        # Calculate week start (Sunday) and end (Saturday)
        current_weekday = current_time.weekday()
        if current_weekday == 6:  # If today is Sunday
            week_start = current_time
        else:
            days_to_start = -(current_weekday + 1)
            week_start = current_time + timedelta(days=days_to_start)
        week_end = week_start + timedelta(days=6)

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump({
                'events': events,
                'week_start': week_start.isoformat(),
                'week_end': week_end.isoformat(),
                'last_updated': current_time.isoformat()
            }, f, indent=2)
        logger.info(f"Stored weekly events in {filepath}")
    except Exception as e:
        logger.error(f"Error storing weekly events: {str(e)}")

def load_weekly_events(weeks_offset: int = 0) -> List[Dict]:
    """
    Load events for a specific week
    weeks_offset: 0 for current week, -1 for previous week, 1 for next week
    """
    try:
        current_time = datetime.now(pytz.UTC)
        target_date = current_time + timedelta(weeks=weeks_offset)
        filename = get_week_filename(target_date)
        filepath = os.path.join(WEEKLY_STORAGE_DIR, filename)

        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                raw_events = json.load(f)
                # Convert the raw events to our expected format
                formatted_events = []
                for event in raw_events:
                    formatted_event = {
                        'time': event['date'],  # The date field contains the ISO timestamp
                        'currency': event['country'],
                        'impact': event['impact'],
                        'event_title': event['title'],
                        'forecast': event['forecast'],
                        'previous': event['previous']
                    }
                    formatted_events.append(formatted_event)
                logger.info(f"Loaded {len(formatted_events)} events from {filename}")
                return formatted_events
        else:
            logger.warning(f"Weekly events file not found: {filename}")
        return []
    except Exception as e:
        logger.error(f"Error loading weekly events: {str(e)}")
        return []

def store_events(events: List[Dict]) -> None:
    """Store events in memory and in weekly file"""
    if not events:
        logger.warning("Attempted to store empty events list")
        return
    
    try:
        event_store['cache_status'] = 'updating'
        
        # Store events in memory
        event_store['events'] = events
        event_store['last_updated'] = datetime.now(pytz.UTC)
        event_store['cache_status'] = 'ready'
        
        # Store events in weekly file
        store_weekly_events(events)
        
        logger.info(f"Stored {len(events)} events in memory and weekly file")
        
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

def get_filtered_events(time_range: str, user_timezone: str, selected_currencies: List[str] = None, selected_impacts: List[str] = None, specific_date: str = None) -> List[Dict]:
    """
    Filter stored events based on time range, user's timezone, currencies, and impact levels
    
    Args:
        time_range: One of '24h', 'today', 'tomorrow', 'week', 'previous_week', 'next_week', 'specific_date'
        user_timezone: User's timezone (e.g., 'America/New_York')
        selected_currencies: List of currency codes to filter by (e.g., ['USD', 'GBP'])
        selected_impacts: List of impact levels to filter by (e.g., ['High', 'Medium'])
        specific_date: Date string in YYYY-MM-DD format for 'specific_date' time range
    """
    if not event_store['events'] and time_range not in ['previous_week', 'next_week', 'specific_date']:
        logger.warning("No events in store")
        return []

    try:
        # Get user's timezone
        user_tz = pytz.timezone(user_timezone)
        current_time = datetime.now(pytz.UTC)
        local_now = current_time.astimezone(user_tz)
        logger.debug(f"Filtering events for {time_range} from {current_time} (UTC)")

        # Load appropriate events based on time range
        events_to_filter = []
        if time_range == 'previous_week':
            events_to_filter = load_weekly_events(weeks_offset=-1)
        elif time_range == 'next_week':
            events_to_filter = load_weekly_events(weeks_offset=1)
        elif time_range == 'today' and local_now.weekday() == 6:  # If today is Sunday
            # Load both previous week's events (which contain Sunday) and current week's events
            prev_week_events = load_weekly_events(weeks_offset=-1)
            curr_week_events = event_store['events']
            events_to_filter = prev_week_events + curr_week_events
        elif time_range == 'specific_date':
            if not specific_date:
                logger.error("No date provided for specific_date time range")
                return []
                
            try:
                # Parse the specific date
                target_date = datetime.strptime(specific_date, '%Y-%m-%d')
                target_date = user_tz.localize(target_date)
                
                # Check if the date is too far in the past (before 02/02/2025)
                cutoff_date = datetime(2025, 2, 2, tzinfo=user_tz)
                if target_date.date() < cutoff_date.date():
                    logger.warning(f"Requested date {specific_date} is before the cutoff date")
                    raise ValueError("Sorry, we do not have data from before February 2, 2025")
                
                # Calculate which week the target date belongs to
                target_weekday = target_date.weekday()
                if target_weekday == 6:  # If target is Sunday
                    target_week_start = target_date
                else:
                    days_to_start = -(target_weekday + 1)  # Go back to previous Sunday
                    target_week_start = target_date + timedelta(days=days_to_start)
                
                # Calculate which week the current date belongs to
                current_weekday = local_now.weekday()
                if current_weekday == 6:  # If today is Sunday
                    current_week_start = local_now
                else:
                    days_to_start = -(current_weekday + 1)  # Go back to previous Sunday
                    current_week_start = local_now + timedelta(days=days_to_start)
                
                # If the target date is in the current week, include both weekly file and current events
                if target_week_start.date() == current_week_start.date():
                    logger.info("Target date is in current week, including both weekly and current events")
                    weekly_events = load_weekly_events(weeks_offset=0)
                    events_to_filter = weekly_events + event_store['events']
                else:
                    # Calculate weeks difference for other dates
                    weeks_diff = (target_date - local_now).days // 7
                    events_to_filter = load_weekly_events(weeks_offset=weeks_diff)
                    
            except ValueError as e:
                logger.error(f"Error with specific date: {str(e)}")
                raise
        else:
            events_to_filter = event_store['events']

        # Calculate filter time range in UTC
        if time_range == 'specific_date':
            # Set time range to the entire day of the specific date
            start_time = target_date.replace(hour=0, minute=0, second=0, microsecond=0).astimezone(pytz.UTC)
            end_time = target_date.replace(hour=23, minute=59, second=59, microsecond=999999).astimezone(pytz.UTC)
        elif time_range.endswith('h'):
            hours = int(time_range[:-1])
            start_time = current_time
            end_time = current_time + timedelta(hours=hours)
        elif time_range == 'today':
            start_time = local_now.replace(hour=0, minute=0, second=0, microsecond=0).astimezone(pytz.UTC)
            end_time = local_now.replace(hour=23, minute=59, second=59, microsecond=999999).astimezone(pytz.UTC)
        elif time_range == 'yesterday':
            yesterday = local_now - timedelta(days=1)
            start_time = yesterday.replace(hour=0, minute=0, second=0, microsecond=0).astimezone(pytz.UTC)
            end_time = yesterday.replace(hour=23, minute=59, second=59, microsecond=999999).astimezone(pytz.UTC)
        elif time_range == 'tomorrow':
            tomorrow = local_now + timedelta(days=1)
            start_time = tomorrow.replace(hour=0, minute=0, second=0, microsecond=0).astimezone(pytz.UTC)
            end_time = tomorrow.replace(hour=23, minute=59, second=59, microsecond=999999).astimezone(pytz.UTC)
        elif time_range == 'week':
            # Calculate days to previous Sunday for current week
            if local_now.weekday() == 6:  # If today is Sunday
                days_to_start = 0
            else:
                days_to_start = -(local_now.weekday() + 1)
            week_start = local_now + timedelta(days=days_to_start)
            start_time = week_start.replace(hour=0, minute=0, second=0, microsecond=0).astimezone(pytz.UTC)
            week_end = week_start + timedelta(days=6)  # Saturday
            end_time = week_end.replace(hour=23, minute=59, second=59, microsecond=999999).astimezone(pytz.UTC)
        elif time_range == 'previous_week':
            # Calculate days to previous Sunday, then go back one more week
            if local_now.weekday() == 6:  # If today is Sunday
                days_to_start = -7  # Go back one week
            else:
                days_to_start = -(local_now.weekday() + 1) - 7
            week_start = local_now + timedelta(days=days_to_start)
            start_time = week_start.replace(hour=0, minute=0, second=0, microsecond=0).astimezone(pytz.UTC)
            # Instead of ending on Saturday, extend to Sunday of next week
            week_end = week_start + timedelta(days=7)  # End on Sunday instead of Saturday
            end_time = week_end.replace(hour=23, minute=59, second=59, microsecond=999999).astimezone(pytz.UTC)
        elif time_range == 'next_week':
            # Calculate days to next Sunday
            if local_now.weekday() == 6:  # If today is Sunday
                days_to_start = 7  # Go forward one week
            else:
                days_to_start = 6 - local_now.weekday()  # Days until next Sunday
            week_start = local_now + timedelta(days=days_to_start)
            start_time = week_start.replace(hour=0, minute=0, second=0, microsecond=0).astimezone(pytz.UTC)
            week_end = week_start + timedelta(days=6)  # Saturday
            end_time = week_end.replace(hour=23, minute=59, second=59, microsecond=999999).astimezone(pytz.UTC)
        else:
            logger.error(f"Invalid time range: {time_range}")
            return []

        logger.debug(f"Filtering events between {start_time} and {end_time}")
        filtered_events = []
        
        for event in events_to_filter:
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
            for event in events_to_filter:
                logger.debug(f"Stored event: {event['event_title']} at {event['time']}")
        
        return filtered_events

    except ValueError as e:
        logger.error(f"ValueError in get_filtered_events: {str(e)}")
        raise  # Re-raise ValueError to be handled by the API endpoint
    except Exception as e:
        logger.error(f"Error filtering events: {str(e)}")
        logger.exception(e)
        return []

def clean_memory_cache():
    """Clean up the events cache to free memory."""
    logger = logging.getLogger(__name__)
    
    try:
        # Get the global variables in this module
        global_vars = globals()
        
        # Clear any cache variables if they exist
        if '_events_cache' in global_vars:
            logger.info("Clearing events cache")
            global_vars['_events_cache'] = {}
            
        # Force garbage collection
        collected = gc.collect()
        logger.info(f"Garbage collection completed, collected {collected} objects")
        return True
    except Exception as e:
        logger.error(f"Error cleaning memory cache: {str(e)}")
        return False

def save_events_to_cache(events):
    """Save events to the cache."""
    logger = logging.getLogger(__name__)
    try:
        global _events_cache
        _events_cache = events
        logger.info(f"Saved {len(events)} events to cache")
        return True
    except Exception as e:
        logger.error(f"Error saving events to cache: {str(e)}")
        return False

def get_cached_events():
    """Get events from the cache."""
    logger = logging.getLogger(__name__)
    try:
        global _events_cache
        if '_events_cache' in globals() and _events_cache:
            logger.info(f"Retrieved {len(_events_cache)} events from cache")
            return _events_cache
        logger.info("No events found in cache")
        return None
    except Exception as e:
        logger.error(f"Error getting cached events: {str(e)}")
        return None 