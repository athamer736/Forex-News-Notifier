import sys
import os
import logging
from datetime import datetime
import pytz

# Configure logging
logging.basicConfig(level=logging.DEBUG, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger()

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import the event_store module
from backend.events.event_store import get_filtered_events, load_weekly_events, WEEKLY_STORAGE_DIR

def direct_test_event_store():
    """Directly test the event_store.py module without using the server"""
    
    # Check if weekly_events directory exists
    print(f"Weekly storage directory exists: {os.path.exists(WEEKLY_STORAGE_DIR)}")
    if os.path.exists(WEEKLY_STORAGE_DIR):
        files = os.listdir(WEEKLY_STORAGE_DIR)
        print(f"Files in weekly_events directory: {files}")
    
    # Test loading events directly from the weekly_events directory
    print("\n--- Testing load_weekly_events() ---")
    events = load_weekly_events(weeks_offset=-1)
    print(f"load_weekly_events() returned {len(events)} events")
    
    if events:
        print("\nSample events from load_weekly_events:")
        for i, event in enumerate(events[:5]):
            print(f"  {i+1}. {event.get('event_title', 'Unknown')} ({event.get('currency', 'Unknown')})")
    
    # Test get_filtered_events
    print("\n--- Testing get_filtered_events() ---")
    
    filtered_events = get_filtered_events(
        time_range="previous_week",
        user_timezone="UTC",
        selected_currencies=None,
        selected_impacts=None
    )
    
    print(f"get_filtered_events() returned {len(filtered_events)} events")
    
    if filtered_events:
        print("\nSample events from get_filtered_events:")
        for i, event in enumerate(filtered_events[:5]):
            print(f"  {i+1}. {event.get('event_title', 'Unknown')} ({event.get('currency', 'Unknown')})")
    
    # Test with currency filter
    print("\n--- Testing get_filtered_events() with currency filter ---")
    
    usd_events = get_filtered_events(
        time_range="previous_week",
        user_timezone="UTC",
        selected_currencies=["USD"],
        selected_impacts=None
    )
    
    print(f"get_filtered_events(currencies=['USD']) returned {len(usd_events)} events")
    
    if usd_events:
        print("\nSample USD events:")
        for i, event in enumerate(usd_events[:5]):
            print(f"  {i+1}. {event.get('event_title', 'Unknown')} ({event.get('currency', 'Unknown')})")
    
    # Test with impact filter
    print("\n--- Testing get_filtered_events() with impact filter ---")
    
    high_events = get_filtered_events(
        time_range="previous_week",
        user_timezone="UTC",
        selected_currencies=None,
        selected_impacts=["High"]
    )
    
    print(f"get_filtered_events(impacts=['High']) returned {len(high_events)} events")
    
    if high_events:
        print("\nSample High impact events:")
        for i, event in enumerate(high_events[:5]):
            print(f"  {i+1}. {event.get('event_title', 'Unknown')} ({event.get('currency', 'Unknown')}) - Impact: {event.get('impact', 'Unknown')}")

if __name__ == "__main__":
    direct_test_event_store() 