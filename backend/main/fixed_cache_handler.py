import logging
import threading
import time
from datetime import datetime
from ..events.fetch_events import fetch_forex_events
from ..events.event_store import (
    get_filtered_events, 
    get_cache_status, 
    store_events,
    load_cached_events,
    clean_memory_cache,
    save_events_to_cache,
    get_cached_events
)

logger = logging.getLogger(__name__)

# Create an event store dictionary to match what code is using
event_store = {'events': []}

def update_cache():
    """Background task to update the event cache periodically"""
    while True:
        try:
            logger.info("Updating event cache...")
            events = fetch_forex_events()
            event_store['events'] = events
            store_events(events)
            logger.info(f"Cache updated successfully. Next update in 1 hour. Current cache size: {len(event_store['events'])} events")
            # Sleep for 1 hour
            time.sleep(3600)
        except Exception as e:
            logger.error(f"Error updating cache: {str(e)}")
            # If there's an error, wait 5 minutes before retrying
            time.sleep(300)

def start_background_tasks():
    """Start background tasks for the application"""
    # Try to load from cache first
    logger.info("Attempting to load events from cache...")
    if load_cached_events():
        logger.info("Successfully loaded events from cache")
    else:
        # Initial fetch of events if cache load fails
        logger.info("Cache load failed. Performing initial event fetch...")
        try:
            events = fetch_forex_events()
            event_store['events'] = events
            store_events(events)
            logger.info(f"Initial cache populated with {len(event_store['events'])} events")
        except Exception as e:
            logger.error(f"Error during initial event fetch: {str(e)}")

    # Start background thread for periodic updates
    update_thread = threading.Thread(target=update_cache, daemon=True)
    update_thread.start()
    logger.info("Background update thread started")

def refresh_cache():
    """Force a refresh of the event cache"""
    try:
        events = fetch_forex_events()
        event_store['events'] = events
        store_events(events)
        return True, None
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error refreshing cache: {error_msg}")
        return False, error_msg

def stop_background_tasks():
    """Stop background tasks (placeholder for future use)"""
    logger.info("Stopping background tasks (not implemented)")
    # Nothing to do yet as we're using daemon threads that will terminate with the main process 