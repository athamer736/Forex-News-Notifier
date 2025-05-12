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
    Load events for a specific week from JSON file
    weeks_offset: 0 for current week, -1 for previous week, 1 for next week
    """
    try:
        current_time = datetime.now(pytz.UTC)
        target_date = current_time + timedelta(weeks=weeks_offset)
        filename = get_week_filename(target_date)
        filepath = os.path.join(WEEKLY_STORAGE_DIR, filename)

        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
                events = data.get('events', [])
                
                logger.info(f"Loaded {len(events)} events from {filename}")
                return events
        else:
            logger.warning(f"Weekly events file not found: {filepath}")
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
        
        # Get timezone abbreviation (GMT/BST/EDT/EST etc.) that properly reflects DST status
        tz_abbr = local_time.strftime('%Z')
        
        # Create a copy with the converted time
        event_copy = event.copy()
        event_copy['time'] = local_time.strftime('%Y-%m-%d %H:%M')
        event_copy['timezone_abbr'] = tz_abbr  # Add timezone abbreviation
        return event_copy
    except Exception as e:
        logger.error(f"Error converting event time: {event}")
        logger.exception(e)
        return event

def get_filtered_events(time_range: str, user_timezone: str, selected_currencies: List[str] = None, selected_impacts: List[str] = None, specific_date: str = None) -> List[Dict]:
    """
    Filter events based on time range, user's timezone, currencies, and impact levels
    Uses local JSON files for 'previous_week' time range, returns empty list for other ranges
    
    Args:
        time_range: One of '24h', 'today', 'yesterday', 'tomorrow', 'week', 'previous_week', 'next_week', 'specific_date'
        user_timezone: User's timezone (e.g., 'America/New_York')
        selected_currencies: List of currency codes to filter by (e.g., ['USD', 'GBP'])
        selected_impacts: List of impact levels to filter by (e.g., ['High', 'Medium'])
        specific_date: Date string in YYYY-MM-DD format for 'specific_date' time range
    """
    logger.info(f"Getting filtered events for time_range: {time_range}")
    
    # Special case for previous_week - use local JSON files
    if time_range == 'previous_week':
        logger.info("Using local JSON file for previous week events")
        events = load_weekly_events(weeks_offset=-1)
        
        # Filter by currency if needed
        if selected_currencies and len(selected_currencies) > 0:
            events = [event for event in events if event['currency'] in selected_currencies]
            logger.info(f"Filtered to {len(events)} events after currency filter")
        
        # Filter by impact if needed
        if selected_impacts and len(selected_impacts) > 0:
            events = [event for event in events if event['impact'] in selected_impacts]
            logger.info(f"Filtered to {len(events)} events after impact filter")
        
        logger.info(f"Returning {len(events)} previous week events from local file")
        return events
    
    # For all other time ranges, return empty list to use database query
    logger.info(f"Using database to get filtered events for time_range: {time_range}")
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