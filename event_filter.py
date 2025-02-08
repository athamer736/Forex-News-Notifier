from datetime import datetime, timedelta
import pytz
import logging
from typing import List, Dict, Literal

logger = logging.getLogger(__name__)

TimeRange = Literal['1h', '4h', '8h', '12h', '24h', 'today', 'tomorrow', 'week', 'last_week', 'historical', 'all']

def filter_events_by_range(events: List[Dict], time_range: TimeRange, user_timezone: str = 'UTC') -> List[Dict]:
    """
    Filter events based on a specified time range
    
    Args:
        events (List[Dict]): List of events with ISO format UTC times
        time_range (TimeRange): Time range to filter events
            - '1h': Next hour
            - '4h': Next 4 hours
            - '8h': Next 8 hours
            - '12h': Next 12 hours
            - '24h': Next 24 hours
            - 'today': Rest of today
            - 'tomorrow': Tomorrow's events
            - 'week': Next 7 days
            - 'last_week': Past 7 days
            - 'historical': All past events
            - 'all': All events (no filtering)
        user_timezone (str): User's timezone name (e.g., 'America/New_York')
        
    Returns:
        List[Dict]: Filtered list of events within the specified range
    """
    if not events or time_range == 'all':
        logger.debug("No events to filter or 'all' range specified")
        return events

    try:
        # Get current time in user's timezone
        user_tz = pytz.timezone(user_timezone)
        current_time = datetime.now(pytz.UTC).astimezone(user_tz)
        logger.debug(f"Current time in {user_timezone}: {current_time}")

        # Calculate the start and end times based on the range
        if time_range.endswith('h'):
            # Handle hour-based ranges
            hours = int(time_range[:-1])
            start_time = current_time
            end_time = current_time + timedelta(hours=hours)
        elif time_range == 'today':
            # Rest of today until midnight
            start_time = current_time
            end_time = current_time.replace(hour=23, minute=59, second=59, microsecond=999999)
        elif time_range == 'tomorrow':
            # Tomorrow from midnight to midnight
            tomorrow = current_time + timedelta(days=1)
            start_time = tomorrow.replace(hour=0, minute=0, second=0, microsecond=0)
            end_time = tomorrow.replace(hour=23, minute=59, second=59, microsecond=999999)
        elif time_range == 'week':
            # Next 7 days
            start_time = current_time
            end_time = current_time + timedelta(days=7)
        elif time_range == 'last_week':
            # Past 7 days
            start_time = current_time - timedelta(days=7)
            end_time = current_time
        elif time_range == 'historical':
            # All past events up to now
            start_time = datetime.min.replace(tzinfo=pytz.UTC).astimezone(user_tz)
            end_time = current_time
        else:
            logger.error(f"Invalid time range: {time_range}")
            return events

        logger.debug(f"Filtering events between {start_time} and {end_time}")

        filtered_events = []
        for event in events:
            try:
                # Parse the event time (stored in UTC)
                event_time = datetime.fromisoformat(event['time'])
                # Convert to user's timezone for comparison
                event_local_time = event_time.astimezone(user_tz)
                
                # Check if event is within the specified range
                if start_time <= event_local_time <= end_time:
                    filtered_events.append(event)
                    logger.debug(f"Including event at {event_local_time}")
                else:
                    logger.debug(f"Excluding event at {event_local_time}")
            except Exception as e:
                logger.error(f"Error processing event: {event}")
                logger.exception(e)
                continue

        logger.info(f"Filtered {len(filtered_events)} events for range {time_range}")
        return filtered_events

    except Exception as e:
        logger.error(f"Error filtering events: {str(e)}")
        logger.exception(e)
        return events  # Return original events if filtering fails 