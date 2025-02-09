import logging
from datetime import datetime
from typing import Dict, List, Tuple, Union
from flask import jsonify, request

from .timezone_handler import set_user_timezone as set_tz, get_user_timezone
from ..events import get_filtered_events, get_cache_status, fetch_events

logger = logging.getLogger(__name__)

# Valid time ranges for filtering
VALID_TIME_RANGES = ['24h', 'today', 'yesterday', 'tomorrow', 'week', 'previous_week', 'next_week', 'specific_date']

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
        # Get request parameters
        user_id = request.args.get('userId', 'default')
        time_range = request.args.get('range', '24h')
        currencies = request.args.get('currencies', '')
        impacts = request.args.get('impacts', '')
        specific_date = request.args.get('date')
        
        # Parse currencies and impacts into lists
        selected_currencies = [c.strip().upper() for c in currencies.split(',')] if currencies else []
        selected_impacts = [i.strip().capitalize() for i in impacts.split(',')] if impacts else []
        
        # Validate time range
        if time_range not in VALID_TIME_RANGES:
            return {
                'error': f'Invalid time range. Must be one of: {", ".join(VALID_TIME_RANGES)}'
            }, 400

        # Validate specific date format if provided
        if time_range == 'specific_date':
            if not specific_date:
                return {'error': 'Date parameter is required for specific_date time range'}, 400
            try:
                datetime.strptime(specific_date, '%Y-%m-%d')
            except ValueError:
                return {'error': 'Invalid date format. Use YYYY-MM-DD'}, 400

        # Get user's timezone from storage
        user_timezone = get_user_timezone(user_id)
        if not user_timezone:
            logger.warning(f"No timezone found for user {user_id}, defaulting to UTC")
            user_timezone = 'UTC'

        # Fetch fresh events if needed
        try:
            fetch_events()
        except Exception as e:
            logger.error(f"Error fetching events: {str(e)}")

        # Get filtered events based on user's preferences
        filtered_events = get_filtered_events(
            time_range, 
            user_timezone, 
            selected_currencies, 
            selected_impacts,
            specific_date
        )
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