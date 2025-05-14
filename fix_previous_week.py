#!/usr/bin/env python
"""
This script applies the necessary fixes to make the previous_week filter work
by modifying the route_handler.py and timezone_handler.py files.
"""
import os
import re
import sys
import shutil
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def backup_file(file_path):
    """Create a backup of a file"""
    backup_path = f"{file_path}.bak"
    try:
        shutil.copy2(file_path, backup_path)
        logger.info(f"Created backup of {file_path} at {backup_path}")
        return True
    except Exception as e:
        logger.error(f"Failed to create backup of {file_path}: {str(e)}")
        return False

def fix_timezone_handler():
    """Fix the timezone_handler.py file to not filter out past events for historical views"""
    file_path = "backend/main/timezone_handler.py"
    
    if not os.path.exists(file_path):
        logger.error(f"File not found: {file_path}")
        return False
    
    # Create backup
    if not backup_file(file_path):
        return False
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 1. Update the function signature to include time_range parameter
        content = re.sub(
            r'def convert_to_local_time\(events: List\[Dict\], user_id: str = \'default\'\) -> List\[Dict\]:',
            r'def convert_to_local_time(events: List[Dict], user_id: str = \'default\', time_range: str = None) -> List[Dict]:',
            content
        )
        
        # 2. Update the docstring to include time_range parameter
        content = re.sub(
            r'    Args:\n        events \(List\[Dict\]\): List of events with UTC times in ISO format\n        user_id \(str\): The user identifier',
            r'    Args:\n        events (List[Dict]): List of events with UTC times in ISO format\n        user_id (str): The user identifier\n        time_range (str): The time range filter being used (e.g., \'previous_week\')',
            content
        )
        
        # 3. Add logic to include past events based on time_range
        content = re.sub(
            r'    logger.info\(f"Converting times to timezone: \{user_tz\} for user: \{user_id\}"\)\s+\n    converted_events = \[\]',
            r'    logger.info(f"Converting times to timezone: {user_tz} for user: {user_id}, time_range: {time_range}")\n    \n    # Determine if we should include past events based on time_range\n    include_past_events = time_range in [\'previous_week\', \'yesterday\', \'specific_date\', \'date_range\']\n    if include_past_events:\n        logger.info(f"Including past events for time_range: {time_range}")\n    \n    converted_events = []',
            content
        )
        
        # 4. Update the logic for filtering past events
        pattern = re.compile(
            r'                # Only include future events and events from the last hour\n'
            r'                time_difference = \(utc_time - current_utc\).total_seconds\(\) / 3600\n'
            r'                if time_difference > -1:  # Include events from the last hour\n'
            r'                    converted_event = event.copy\(\)\n'
            r'                    # Format the time in a user-friendly format with timezone abbreviation\n'
            r'                    converted_event\[\'time\'\] = local_time.strftime\(\'%Y-%m-%d %H:%M\'\)\n'
            r'                    converted_event\[\'timezone_abbr\'\] = tz_abbr  # Add timezone abbreviation\n'
            r'                    converted_event\[\'_datetime\'\] = local_time  # For sorting\n'
            r'                    converted_events.append\(converted_event\)\n'
            r'                else:\n'
            r'                    logger.debug\(f"Skipping past event: \{event\[\'time\'\]\}"\)',
            re.MULTILINE
        )
        
        replacement = (
            '                # Only filter past events if not viewing historical data\n'
            '                include_event = True\n'
            '                if not include_past_events:\n'
            '                    time_difference = (utc_time - current_utc).total_seconds() / 3600\n'
            '                    if time_difference <= -1:  # More than 1 hour in the past\n'
            '                        include_event = False\n'
            '                        logger.debug(f"Skipping past event: {event[\'time\']}")\n'
            '                \n'
            '                if include_event:\n'
            '                    converted_event = event.copy()\n'
            '                    # Format the time in a user-friendly format with timezone abbreviation\n'
            '                    converted_event[\'time\'] = local_time.strftime(\'%Y-%m-%d %H:%M\')\n'
            '                    converted_event[\'timezone_abbr\'] = tz_abbr  # Add timezone abbreviation\n'
            '                    converted_event[\'_datetime\'] = local_time  # For sorting\n'
            '                    converted_events.append(converted_event)'
        )
        
        content = pattern.sub(replacement, content)
        
        # Write the updated content back to the file
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
            
        logger.info(f"Successfully updated {file_path}")
        return True
        
    except Exception as e:
        logger.error(f"Error fixing {file_path}: {str(e)}")
        return False

def fix_route_handler():
    """Fix the route_handler.py file to pass time_range parameter to convert_to_local_time"""
    file_path = "backend/main/route_handler.py"
    
    if not os.path.exists(file_path):
        logger.error(f"File not found: {file_path}")
        return False
    
    # Create backup
    if not backup_file(file_path):
        return False
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Update convert_to_local_time call in the local JSON file section
        content = re.sub(
            r'                    # Convert times to user\'s timezone with proper DST handling\n                    converted_events = convert_to_local_time\(events, user_id\)',
            r'                    # Convert times to user\'s timezone with proper DST handling\n                    converted_events = convert_to_local_time(events, user_id, time_range)',
            content
        )
        
        # Update convert_to_local_time call at the end of the function
        content = re.sub(
            r'        # Convert times to user\'s timezone with proper DST handling\n        converted_events = convert_to_local_time\(filtered_events, user_id\)',
            r'        # Convert times to user\'s timezone with proper DST handling\n        converted_events = convert_to_local_time(filtered_events, user_id, time_range)',
            content
        )
        
        # Write the updated content back to the file
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
            
        logger.info(f"Successfully updated {file_path}")
        return True
        
    except Exception as e:
        logger.error(f"Error fixing {file_path}: {str(e)}")
        return False

def main():
    """Main function to apply all fixes"""
    logger.info("Starting to apply fixes for previous_week filter")
    
    # 1. Fix timezone_handler.py
    if fix_timezone_handler():
        logger.info("Successfully fixed timezone_handler.py")
    else:
        logger.error("Failed to fix timezone_handler.py")
        return
        
    # 2. Fix route_handler.py
    if fix_route_handler():
        logger.info("Successfully fixed route_handler.py")
    else:
        logger.error("Failed to fix route_handler.py")
        return
        
    logger.info("All fixes applied successfully!")
    logger.info("Please restart the server to apply the changes.")

if __name__ == "__main__":
    main() 