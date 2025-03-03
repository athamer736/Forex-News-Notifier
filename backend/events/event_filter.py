from datetime import datetime, timedelta
import pytz
import logging
from typing import List, Dict, Literal

logger = logging.getLogger(__name__)

TimeRange = Literal['24h', 'today', 'tomorrow', 'week']

def filter_events_by_range(events: List[Dict], time_range: TimeRange, user_timezone: str = 'UTC') -> List[Dict]:
    """
    Filter events based on a specified time range
    
    Args:
        events (List[Dict]): List of events with ISO format UTC times
        time_range (TimeRange): Time range to filter events
            - '24h': Next 24 hours
            - 'today': Today's events
            - 'tomorrow': Tomorrow's events
            - 'week': This week's events
        user_timezone (str): User's timezone name (e.g., 'America/New_York')
        
    Returns:
        List[Dict]: Filtered list of events within the specified range
    """
    if not events:
        logger.debug("No events to filter")
        return events

    try:
        # Get current time in user's timezone
        user_tz = pytz.timezone(user_timezone)
        current_time = datetime.now(pytz.UTC).astimezone(user_tz)
        logger.debug(f"Current time in {user_timezone}: {current_time}")

        # Calculate the start and end times based on the range
        if time_range == '24h':
            start_time = current_time
            end_time = current_time + timedelta(hours=24)
        elif time_range == 'today':
            # Today from start of day until midnight
            start_time = current_time.replace(hour=0, minute=0, second=0, microsecond=0)
            end_time = current_time.replace(hour=23, minute=59, second=59, microsecond=999999)
        elif time_range == 'tomorrow':
            # Tomorrow from midnight to midnight
            tomorrow = current_time + timedelta(days=1)
            start_time = tomorrow.replace(hour=0, minute=0, second=0, microsecond=0)
            end_time = tomorrow.replace(hour=23, minute=59, second=59, microsecond=999999)
        elif time_range == 'week':
            # Current week's events (from start of week until end of week)
            start_time = (current_time - timedelta(days=current_time.weekday())).replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            days_until_week_end = 6 - current_time.weekday()  # Sunday is 6
            end_time = (current_time + timedelta(days=days_until_week_end)).replace(
                hour=23, minute=59, second=59, microsecond=999999
            )
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

filter_events = filter_events_by_range 