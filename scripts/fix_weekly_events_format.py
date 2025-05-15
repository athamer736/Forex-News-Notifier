#!/usr/bin/env python
"""
This script fixes the format of existing weekly event JSON files to match the required format.
It converts from the old nested format:
{
  "events": [...],
  "week_start": "...",
  "week_end": "...",
  "last_updated": "..."
}

To the new flat array format:
[
  {
    "time": "2025-03-02T21:45:00+00:00",
    "currency": "NZD",
    "impact": "Low",
    "event_title": "Overseas Trade Index q/q",
    "forecast": "1.5%",
    "previous": "2.4%",
    "source": "forexfactory"
  },
  ...
]
"""
import os
import json
import logging
import glob
from datetime import datetime
import pytz

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Directory containing weekly event files
WEEKLY_STORAGE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'weekly_events')

def fix_event_format(event):
    """Fix a single event to match the correct format"""
    # Map old field names to new field names
    field_mapping = {
        'country': 'currency',
        'date': 'time',
        'title': 'event_title'
    }
    
    new_event = {}
    
    # Convert fields using the mapping
    for old_field, new_field in field_mapping.items():
        if old_field in event:
            new_event[new_field] = event[old_field]
    
    # Copy fields that have the same name in both formats
    for field in ['time', 'currency', 'impact', 'event_title', 'forecast', 'previous']:
        if field in event:
            new_event[field] = event[field]
    
    # Ensure source field exists
    if 'source' not in new_event:
        new_event['source'] = 'forexfactory'
    
    # Format datetime in ISO format with UTC timezone if needed
    if 'time' in new_event and isinstance(new_event['time'], str):
        try:
            dt = datetime.fromisoformat(new_event['time'].replace('Z', '+00:00'))
            new_event['time'] = dt.strftime('%Y-%m-%dT%H:%M:%S+00:00')
        except ValueError:
            # Keep the original value if parsing fails
            pass
    
    return new_event

def fix_weekly_event_file(file_path):
    """Fix a single weekly event file format"""
    try:
        logger.info(f"Fixing file: {file_path}")
        
        # Read the existing file
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Check if the file is already in the new format (array)
        if isinstance(data, list):
            logger.info(f"File {file_path} is already in the correct format")
            return True
        
        # Extract events from the old format
        events = []
        if 'events' in data and isinstance(data['events'], list):
            # Convert the old nested format to the new flat array format
            for event in data['events']:
                fixed_event = fix_event_format(event)
                events.append(fixed_event)
        else:
            # Try to handle the JSON array of events directly (current format)
            for event in data:
                fixed_event = fix_event_format(event)
                events.append(fixed_event)
        
        # Write the updated events back to the file
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(events, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Successfully fixed file: {file_path} with {len(events)} events")
        return True
        
    except Exception as e:
        logger.error(f"Error fixing file {file_path}: {str(e)}")
        return False

def fix_all_weekly_event_files():
    """Fix all weekly event files in the storage directory"""
    file_pattern = os.path.join(WEEKLY_STORAGE_DIR, 'week_*.json')
    files = glob.glob(file_pattern)
    
    logger.info(f"Found {len(files)} weekly event files to fix")
    
    success_count = 0
    failure_count = 0
    
    for file_path in files:
        success = fix_weekly_event_file(file_path)
        if success:
            success_count += 1
        else:
            failure_count += 1
    
    logger.info(f"Fixed {success_count} files successfully, {failure_count} failures")

def main():
    try:
        logger.info("Starting weekly event files format fix")
        fix_all_weekly_event_files()
        logger.info("Weekly event files format fix completed successfully")
    except Exception as e:
        logger.error(f"Error in main function: {str(e)}")

if __name__ == "__main__":
    main() 