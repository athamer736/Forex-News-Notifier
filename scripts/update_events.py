import sys
import json
import os
from pathlib import Path
from datetime import datetime, timedelta
import pytz
import logging

# Add the project root directory to Python path
project_root = str(Path(__file__).parent.parent)
sys.path.append(project_root)

from config.database import db_session, init_db
from models.forex_event import ForexEvent
from backend.scrapers.forexfactory import ForexFactoryScraper

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/update_events.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def fetch_forexfactory_data():
    """Fetch forex event data from ForexFactory."""
    try:
        scraper = ForexFactoryScraper()
        # Get events for the next 7 days
        events = scraper.get_latest_events(days_ahead=7)
        logger.info(f"Fetched {len(events)} events from ForexFactory")
        return events
        
    except Exception as e:
        logger.error(f"Error fetching data from ForexFactory: {str(e)}")
        return None

def save_to_json(events, timestamp):
    """Save fetched events to a JSON file with timestamp."""
    try:
        # Create cache directory if it doesn't exist
        cache_dir = Path('cache/forex_updates')
        cache_dir.mkdir(parents=True, exist_ok=True)
        
        # Create filename with timestamp
        filename = f"update_{timestamp.strftime('%Y%m%d_%H%M%S')}.json"
        filepath = cache_dir / filename
        
        with open(filepath, 'w') as f:
            json.dump(events, f, indent=2)
        
        logger.info(f"Saved {len(events)} events to {filepath}")
        return str(filepath)
        
    except Exception as e:
        logger.error(f"Error saving events to JSON: {str(e)}")
        return None

def compare_and_update_events(events_data, filepath):
    """Compare new events with database and update as needed."""
    try:
        success_count = 0
        update_count = 0
        new_count = 0
        
        for event_data in events_data:
            try:
                # Parse the datetime
                event_time = datetime.fromisoformat(
                    event_data['date']
                ).astimezone(pytz.UTC)
                
                # Check if event exists
                existing_event = db_session.query(ForexEvent).filter(
                    ForexEvent.time == event_time,
                    ForexEvent.currency == event_data['country'],
                    ForexEvent.event_title == event_data['title']
                ).first()
                
                if existing_event:
                    # Check for updates
                    updated = False
                    
                    # Check if actual value has been added
                    if event_data.get('actual') and not existing_event.actual:
                        existing_event.actual = event_data['actual']
                        updated = True
                    
                    # Check other fields for updates
                    if event_data.get('forecast') != existing_event.forecast:
                        existing_event.forecast = event_data.get('forecast', '')
                        updated = True
                    
                    if event_data.get('previous') != existing_event.previous:
                        existing_event.previous = event_data.get('previous', '')
                        updated = True
                    
                    if updated:
                        existing_event.updated_at = datetime.utcnow()
                        existing_event.is_updated = True
                        update_count += 1
                        logger.info(f"Updated event: {event_data['title']} at {event_time}")
                        
                else:
                    # Create new event
                    new_event = ForexEvent(
                        time=event_time,
                        currency=event_data['country'],
                        impact=event_data['impact'],
                        event_title=event_data['title'],
                        forecast=event_data.get('forecast', ''),
                        previous=event_data.get('previous', ''),
                        actual=event_data.get('actual', ''),
                        url=event_data.get('url', ''),
                        source='forexfactory',
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    db_session.add(new_event)
                    new_count += 1
                    logger.info(f"Added new event: {event_data['title']} at {event_time}")
                
                success_count += 1
                
            except Exception as e:
                logger.error(f"Error processing event: {str(e)}")
                continue
        
        # Commit all changes
        db_session.commit()
        
        logger.info(f"Successfully processed {success_count} events:")
        logger.info(f"- Updated {update_count} existing events")
        logger.info(f"- Added {new_count} new events")
        
        return success_count, update_count, new_count
        
    except Exception as e:
        logger.error(f"Error comparing and updating events: {str(e)}")
        db_session.rollback()
        return 0, 0, 0

def cleanup_old_files():
    """Remove JSON files older than 24 hours."""
    try:
        cache_dir = Path('cache/forex_updates')
        if not cache_dir.exists():
            return
        
        cutoff_time = datetime.now() - timedelta(hours=24)
        
        for file in cache_dir.glob('*.json'):
            if file.stat().st_mtime < cutoff_time.timestamp():
                file.unlink()
                logger.info(f"Removed old cache file: {file.name}")
                
    except Exception as e:
        logger.error(f"Error cleaning up old files: {str(e)}")

def main():
    try:
        # Create logs directory if it doesn't exist
        Path('logs').mkdir(exist_ok=True)
        
        # Initialize database
        init_db()
        
        # Get current timestamp
        timestamp = datetime.now()
        
        # Fetch new data
        logger.info("Fetching data from ForexFactory...")
        events_data = fetch_forexfactory_data()
        
        if not events_data:
            logger.error("No data fetched from ForexFactory")
            return
        
        # Save to JSON
        filepath = save_to_json(events_data, timestamp)
        if not filepath:
            logger.error("Failed to save events to JSON")
            return
        
        # Compare and update database
        logger.info("Comparing and updating events...")
        success_count, update_count, new_count = compare_and_update_events(
            events_data, filepath
        )
        
        # Cleanup old files
        cleanup_old_files()
        
    except Exception as e:
        logger.error(f"Error in main process: {str(e)}")
    finally:
        db_session.close()

if __name__ == "__main__":
    main() 