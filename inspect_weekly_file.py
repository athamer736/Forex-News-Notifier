import json
import os
import sys
from datetime import datetime, timedelta
import pytz

def get_weekly_file_path():
    """Get the path to the weekly file for the previous week"""
    now = datetime.now(pytz.UTC)
    
    # Calculate days to previous Sunday (start of week)
    current_weekday = now.weekday()
    if current_weekday == 6:  # If today is Sunday
        days_to_start = -7  # Go back one week
    else:
        days_to_start = -(current_weekday + 1) - 7  # Go back to previous Sunday
    
    # Get Sunday (start of week)
    week_start = now + timedelta(days=days_to_start)
    # Get Saturday (end of week)
    week_end = week_start + timedelta(days=6)
    
    # Format filename
    filename = f"week_{week_start.strftime('%Y%m%d')}_to_{week_end.strftime('%Y%m%d')}.json"
    
    # Build full path
    weekly_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'weekly_events')
    return os.path.join(weekly_dir, filename)

def inspect_weekly_file():
    """Inspect the structure of the weekly JSON file"""
    file_path = get_weekly_file_path()
    print(f"Inspecting weekly file: {file_path}")
    
    if not os.path.exists(file_path):
        print(f"Error: File not found at {file_path}")
        
        # List available files
        weekly_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'weekly_events')
        if os.path.exists(weekly_dir):
            files = os.listdir(weekly_dir)
            print(f"Available files in weekly_events directory: {files}")
            
            # Check a specific file from the available files
            if files:
                sample_file = os.path.join(weekly_dir, files[0])
                print(f"\nInspecting sample file instead: {sample_file}")
                with open(sample_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    inspect_data(data, sample_file)
        return
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            inspect_data(data, file_path)
    except Exception as e:
        print(f"Error reading or parsing file: {str(e)}")

def inspect_data(data, file_path):
    """Inspect the structure of the data"""
    print(f"\nFile size: {os.path.getsize(file_path) / 1024:.2f} KB")
    
    # Check the root structure
    print("\nRoot keys:", list(data.keys()))
    
    # Check events array
    if 'events' in data:
        events = data['events']
        print(f"Events count: {len(events)}")
        
        # Check the first event
        if events:
            first_event = events[0]
            print("\nFirst event keys:", list(first_event.keys()))
            print("\nFirst event details:")
            for key, value in first_event.items():
                print(f"  {key}: {value}")
            
            # Print a few event titles
            print("\nSample event titles:")
            for i, event in enumerate(events[:10]):
                print(f"  {i+1}. {event.get('event_title', 'Unknown')} ({event.get('currency', 'Unknown')})")
        else:
            print("Warning: Events array is empty")
    else:
        print("Error: No 'events' key found in data")
        print("Available keys:", list(data.keys()))

if __name__ == "__main__":
    inspect_weekly_file() 