import logging
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Union
from flask import jsonify, request
import pytz

from .timezone_handler import set_user_timezone as set_tz, get_user_timezone
from ..database import get_filtered_events as db_get_filtered_events
from ..events import get_cache_status, fetch_events

logger = logging.getLogger(__name__)

# Valid time ranges for filtering
VALID_TIME_RANGES = ['24h', 'today', 'yesterday', 'tomorrow', 'week', 'previous_week', 'next_week', 'specific_date', 'date_range']

def handle_timezone_request() -> Tuple[Dict, int]:
    """Handle timezone setting requests"""
    try:
        data = request.get_json()
        timezone = data.get('timezone')
        offset = data.get('offset')
        user_id = data.get('userId', 'default')
        
        preferences = set_tz(timezone, offset, user_id)
        return {"message": "Timezone preference saved", "preferences": preferences}, 200
    except ValueError as e:
        return {"error": str(e)}, 400
    except Exception as e:
        logger.exception("Error setting timezone")
        return {"error": str(e)}, 500

def handle_events_request() -> Tuple[Union[Dict, List], int]:
    """Handle event retrieval requests"""
    try:
        # Get query parameters
        time_range = request.args.get('time_range', '24h')
        user_timezone = request.args.get('timezone', 'UTC')
        selected_currencies = request.args.get('currencies', '').split(',') if request.args.get('currencies') else None
        selected_impacts = request.args.get('impacts', '').split(',') if request.args.get('impacts') else None
        specific_date = request.args.get('date')
        # Add parameters for date range
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        # Get current time in UTC
        now = datetime.now(pytz.UTC)
        
        # Default initialization of start_time and end_time
        start_time = now
        end_time = now + timedelta(days=1)

        # Calculate time range
        if time_range == '24h':
            start_time = now
            end_time = now + timedelta(days=1)
        elif time_range == 'today':
            start_time = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end_time = start_time + timedelta(days=1)
        elif time_range == 'yesterday':
            start_time = (now - timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
            end_time = start_time + timedelta(days=1)
        elif time_range == 'tomorrow':
            start_time = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
            end_time = start_time + timedelta(days=1)
        elif time_range == 'week':
            # Calculate days to previous Sunday for current week
            if now.weekday() == 6:  # If today is Sunday
                days_to_start = 0
            else:
                days_to_start = -(now.weekday() + 1)  # Go back to previous Sunday
            week_start = now + timedelta(days=days_to_start)
            start_time = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
            week_end = week_start + timedelta(days=6)  # Saturday
            end_time = week_end.replace(hour=23, minute=59, second=59, microsecond=999999)
        elif time_range == 'previous_week':
            start_time = (now - timedelta(days=7)).replace(hour=0, minute=0, second=0, microsecond=0)
            end_time = now
        elif time_range == 'next_week':
            start_time = (now + timedelta(days=7)).replace(hour=0, minute=0, second=0, microsecond=0)
            end_time = start_time + timedelta(days=7)
        elif time_range == 'specific_date':
            if not specific_date:
                raise ValueError("No date provided for specific date filter")
            try:
                # Parse and validate the date
                start_time = datetime.strptime(specific_date, '%Y-%m-%d')
                if start_time.tzinfo is None:
                    start_time = pytz.UTC.localize(start_time)
                
                # Check if date is before our data start date
                min_date = datetime(2025, 2, 2, tzinfo=pytz.UTC)
                if start_time < min_date:
                    raise ValueError("Sorry, we do not have data from before February 2, 2025")
                
                # Set end time to end of the selected day
                end_time = start_time + timedelta(days=1) - timedelta(microseconds=1)
            except ValueError as e:
                if "does not match format" in str(e):
                    raise ValueError("Invalid date format. Please use YYYY-MM-DD")
                raise
        elif time_range == 'date_range':
            if not start_date or not end_date:
                raise ValueError("Both start date and end date are required for date range filter")
            try:
                # Parse and validate the dates
                start_time = datetime.strptime(start_date, '%Y-%m-%d')
                end_time = datetime.strptime(end_date, '%Y-%m-%d')
                
                if start_time.tzinfo is None:
                    start_time = pytz.UTC.localize(start_time)
                if end_time.tzinfo is None:
                    end_time = pytz.UTC.localize(end_time)
                
                # Set end time to end of the selected day
                end_time = end_time + timedelta(days=1) - timedelta(microseconds=1)
                
                # Ensure start_time is before end_time
                if start_time > end_time:
                    raise ValueError("Start date must be before end date")
                
                # Check if dates are before our data start date
                min_date = datetime(2025, 2, 2, tzinfo=pytz.UTC)
                if start_time < min_date:
                    raise ValueError("Sorry, we do not have data from before February 2, 2025")
                
            except ValueError as e:
                if "does not match format" in str(e):
                    raise ValueError("Invalid date format. Please use YYYY-MM-DD")
                logger.error(f"Date range error: {str(e)}")
                raise
            except Exception as e:
                logger.error(f"Unexpected error in date range processing: {str(e)}")
                raise ValueError(f"Error processing date range: {str(e)}")

        # Get filtered events from database
        filtered_events = db_get_filtered_events(
            start_time=start_time,
            end_time=end_time,
            currencies=selected_currencies if selected_currencies else None,
            impact_levels=selected_impacts if selected_impacts else None
        )

        # Convert times to user's timezone
        user_tz = pytz.timezone(user_timezone)
        for event in filtered_events:
            event_time = datetime.fromisoformat(event['time'])
            if event_time.tzinfo is None:
                event_time = pytz.UTC.localize(event_time)
            local_time = event_time.astimezone(user_tz)
            event['time'] = local_time.strftime('%Y-%m-%d %H:%M')

        return filtered_events, 200
            
    except ValueError as e:
        return {'error': str(e)}, 400
    except Exception as e:
        logger.exception("Error processing events request")
        return {'error': str(e)}, 500

def handle_cache_status_request() -> Tuple[Dict, int]:
    """Handle cache status request"""
    return get_cache_status(), 200

def handle_cache_refresh_request() -> Tuple[Dict, int]:
    """Handle cache refresh request"""
    try:
        fetch_events()
        return {
            "message": "Cache refresh successful",
            "status": get_cache_status()
        }, 200
    except Exception as e:
        return {
            "error": str(e),
            "status": get_cache_status()
        }, 500 