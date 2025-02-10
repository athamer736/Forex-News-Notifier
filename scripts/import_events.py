import json
import os
import sys
from datetime import datetime
import pytz
from pathlib import Path

# Add the project root directory to Python path
project_root = str(Path(__file__).parent.parent)
sys.path.append(project_root)

from config.database import db_session, init_db
from models.forex_event import ForexEvent

def parse_datetime(time_str: str) -> datetime:
    """Convert ISO format datetime string to UTC datetime object."""
    try:
        # Parse the ISO format datetime string
        dt = datetime.fromisoformat(time_str.replace('Z', '+00:00'))
        # Convert to UTC
        return dt.astimezone(pytz.UTC)
    except ValueError as e:
        print(f"Error parsing datetime {time_str}: {e}")
        return None

def import_events_from_file(file_path: str) -> tuple[int, int]:
    """
    Import events from a JSON file into the database.
    Returns tuple of (success_count, error_count)
    """
    success_count = 0
    error_count = 0
    
    try:
        with open(file_path, 'r') as f:
            events_data = json.load(f)
        
        print(f"\nProcessing {len(events_data)} events from {os.path.basename(file_path)}...")
        
        for event_data in events_data:
            try:
                # Parse the datetime
                event_time = parse_datetime(event_data['date'])
                if not event_time:
                    error_count += 1
                    continue
                
                # Check if event already exists
                existing_event = db_session.query(ForexEvent).filter(
                    ForexEvent.time == event_time,
                    ForexEvent.currency == event_data['country'],
                    ForexEvent.event_title == event_data['title']
                ).first()
                
                if existing_event:
                    # Update existing event
                    existing_event.impact = event_data['impact']
                    existing_event.forecast = event_data.get('forecast', '')
                    existing_event.previous = event_data.get('previous', '')
                    existing_event.updated_at = datetime.utcnow()
                    existing_event.is_updated = True
                else:
                    # Create new event
                    new_event = ForexEvent(
                        time=event_time,
                        currency=event_data['country'],
                        impact=event_data['impact'],
                        event_title=event_data['title'],
                        forecast=event_data.get('forecast', ''),
                        previous=event_data.get('previous', ''),
                        actual='',  # This will be updated later when available
                        source='forexfactory',
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    db_session.add(new_event)
                
                success_count += 1
                
            except Exception as e:
                print(f"Error processing event: {str(e)}")
                error_count += 1
                continue
        
        # Commit the changes
        db_session.commit()
        
    except Exception as e:
        print(f"Error processing file {file_path}: {str(e)}")
        db_session.rollback()
        return 0, 1
    
    return success_count, error_count

def main():
    try:
        # Initialize database
        print("Initializing database...")
        init_db()
        
        # Get all JSON files from weekly_events directory
        weekly_events_dir = Path('weekly_events')
        json_files = list(weekly_events_dir.glob('*.json'))
        
        if not json_files:
            print("No JSON files found in weekly_events directory!")
            return
        
        total_success = 0
        total_errors = 0
        
        # Process each file
        for json_file in json_files:
            success, errors = import_events_from_file(str(json_file))
            total_success += success
            total_errors += errors
            print(f"File {json_file.name}: {success} events imported successfully, {errors} errors")
        
        print(f"\nImport completed!")
        print(f"Total events imported successfully: {total_success}")
        print(f"Total errors: {total_errors}")
        
    except Exception as e:
        print(f"Error during import: {str(e)}")
    finally:
        db_session.close()

if __name__ == "__main__":
    main() 