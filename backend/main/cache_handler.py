import logging
import threading
import time
import gc
from datetime import datetime
from ..events import fetch_events, event_store, load_cached_events, clean_memory_cache
from ..database import cleanup_db_resources

logger = logging.getLogger(__name__)

# Track the update thread for monitoring
update_thread = None
exit_event = threading.Event()

def update_cache():
    """Background task to update the event cache periodically with memory cleanup"""
    update_count = 0  # Keep track of update cycles
    
    while not exit_event.is_set():
        try:
            logger.info("Updating event cache...")
            update_count += 1
            
            # Run the fetch
            fetch_events()
            
            # Every 6 updates (6 hours), clean memory more aggressively
            if update_count % 6 == 0:
                logger.info("Performing periodic memory cleanup")
                clean_memory_cache()
                cleanup_db_resources()
                gc.collect()
                logger.info("Memory cleanup completed")
            
            logger.info(f"Cache updated successfully. Next update in 1 hour. Current cache size: {len(event_store['events'])} events")
            
            # Sleep for 1 hour, but check for exit signal every 10 seconds
            for _ in range(360):  # 3600 seconds / 10 = 360 iterations
                if exit_event.is_set():
                    break
                time.sleep(10)
        except Exception as e:
            logger.error(f"Error updating cache: {str(e)}")
            # If there's an error, wait 5 minutes before retrying
            # Check for exit signal every 10 seconds
            for _ in range(30):  # 300 seconds / 10 = 30 iterations
                if exit_event.is_set():
                    break
                time.sleep(10)

def start_background_tasks():
    """Start background tasks for the application"""
    global update_thread
    
    # Try to load from cache first
    logger.info("Attempting to load events from cache...")
    if load_cached_events():
        logger.info("Successfully loaded events from cache")
    else:
        # Initial fetch of events if cache load fails
        logger.info("Cache load failed. Performing initial event fetch...")
        try:
            fetch_events()
            logger.info(f"Initial cache populated with {len(event_store['events'])} events")
        except Exception as e:
            logger.error(f"Error during initial event fetch: {str(e)}")

    # Start background thread for periodic updates
    exit_event.clear()  # Make sure the exit event is cleared
    update_thread = threading.Thread(target=update_cache, daemon=True)
    update_thread.start()
    logger.info("Background update thread started")

def stop_background_tasks():
    """Stop background tasks gracefully"""
    global update_thread
    
    if update_thread and update_thread.is_alive():
        logger.info("Stopping background update thread...")
        exit_event.set()
        update_thread.join(timeout=30)  # Wait up to 30 seconds for thread to end
        
        if update_thread.is_alive():
            logger.warning("Background thread did not terminate gracefully")
        else:
            logger.info("Background update thread stopped successfully")
    
    # Final cleanup
    cleanup_db_resources()
    gc.collect()

def refresh_cache():
    """Force a refresh of the event cache"""
    try:
        fetch_events()
        # Run garbage collection after forced refresh
        gc.collect()
        return True, None
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error refreshing cache: {error_msg}")
        return False, error_msg 