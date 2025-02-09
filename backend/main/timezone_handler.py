from datetime import datetime
import pytz
import logging
from typing import List, Dict, Optional
import json
import os

logger = logging.getLogger(__name__)

# Directory for storing user preferences
PREFERENCES_DIR = 'user_preferences'

def set_user_timezone(timezone: str, offset: int, user_id: str) -> Dict:
    """Set and store a user's timezone preference"""
    try:
        # Validate timezone
        if timezone not in pytz.all_timezones:
            raise ValueError(f"Invalid timezone: {timezone}")

        # Create preferences directory if it doesn't exist
        os.makedirs(PREFERENCES_DIR, exist_ok=True)

        # Load existing preferences or create new
        preferences = load_user_preferences(user_id)
        preferences['timezone'] = timezone
        preferences['offset'] = offset

        # Save updated preferences
        save_user_preferences(user_id, preferences)
        logger.info(f"Timezone preference saved for user {user_id}: {timezone}")
        
        return preferences
    except Exception as e:
        logger.error(f"Error setting timezone for user {user_id}: {str(e)}")
        raise

def get_user_timezone(user_id: str) -> Optional[str]:
    """Get a user's timezone preference"""
    try:
        preferences = load_user_preferences(user_id)
        return preferences.get('timezone')
    except Exception as e:
        logger.error(f"Error getting timezone for user {user_id}: {str(e)}")
        return None

def load_user_preferences(user_id: str) -> Dict:
    """Load user preferences from file"""
    try:
        filepath = os.path.join(PREFERENCES_DIR, f"{user_id}.json")
        if os.path.exists(filepath):
            with open(filepath, 'r') as f:
                return json.load(f)
        return {}
    except Exception as e:
        logger.error(f"Error loading preferences for user {user_id}: {str(e)}")
        return {}

def save_user_preferences(user_id: str, preferences: Dict) -> None:
    """Save user preferences to file"""
    try:
        filepath = os.path.join(PREFERENCES_DIR, f"{user_id}.json")
        with open(filepath, 'w') as f:
            json.dump(preferences, f)
    except Exception as e:
        logger.error(f"Error saving preferences for user {user_id}: {str(e)}")
        raise

def convert_to_local_time(events: List[Dict], user_id: str = 'default') -> List[Dict]:
    """
    Convert event times from UTC to user's local timezone and sort by local time
    
    Args:
        events (List[Dict]): List of events with UTC times in ISO format
        user_id (str): The user identifier
        
    Returns:
        List[Dict]: Events with times converted to user's timezone and sorted by time
    """
    if not events:
        logger.debug("No events to convert")
        return events

    user_tz = get_user_timezone(user_id)
    logger.info(f"Converting times to timezone: {user_tz} for user: {user_id}")
    
    converted_events = []
    current_utc = datetime.now(pytz.UTC)
    
    try:
        target_tz = pytz.timezone(user_tz)
        
        for event in events:
            try:
                # Parse the ISO format UTC time
                utc_time = datetime.fromisoformat(event['time'])
                if utc_time.tzinfo is None:
                    utc_time = pytz.UTC.localize(utc_time)
                
                # Convert to user's timezone
                local_time = utc_time.astimezone(target_tz)
                logger.debug(f"Converting {event['time']} UTC to {local_time.strftime('%Y-%m-%d %H:%M')} {user_tz}")
                
                # Only include future events and events from the last hour
                time_difference = (utc_time - current_utc).total_seconds() / 3600
                if time_difference > -1:  # Include events from the last hour
                    converted_event = event.copy()
                    # Format the time in a user-friendly format
                    converted_event['time'] = local_time.strftime('%Y-%m-%d %H:%M')
                    converted_event['_datetime'] = local_time  # For sorting
                    converted_events.append(converted_event)
                else:
                    logger.debug(f"Skipping past event: {event['time']}")
                    
            except Exception as e:
                logger.error(f"Error converting time for event: {event}")
                logger.exception(e)
                continue
        
        # Sort events by local time
        sorted_events = sorted(converted_events, key=lambda x: x['_datetime'])
        
        # Remove the temporary datetime objects used for sorting
        for event in sorted_events:
            del event['_datetime']
        
        logger.info(f"Successfully converted and sorted {len(sorted_events)} events")
        return sorted_events
        
    except Exception as e:
        logger.error(f"Error converting timezone: {str(e)}")
        # If there's an error in conversion, return the original events
        return events 