import sys
from pathlib import Path
import logging
from datetime import datetime, timedelta
import pytz
import os

# Add the project root directory to Python path
project_root = str(Path(__file__).parent.parent)
sys.path.append(project_root)

from backend.database import db_session
from models.forex_event import ForexEvent
from backend.services.ai_summary_service import AISummaryService

# Configure logging
log_dir = os.path.join(project_root, 'logs')
os.makedirs(log_dir, exist_ok=True)

log_file = os.path.join(log_dir, 'ai_summary.log')
logger = logging.getLogger('AISummary')

# Create file handler
file_handler = logging.FileHandler(log_file)
file_handler.setLevel(logging.INFO)

# Create console handler
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)

# Create formatter
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                            datefmt='%Y-%m-%d %H:%M:%S')

# Add formatter to handlers
file_handler.setFormatter(formatter)
console_handler.setFormatter(formatter)

# Add handlers to logger
logger.addHandler(file_handler)
logger.addHandler(console_handler)
logger.setLevel(logging.INFO)

def generate_missing_summaries():
    """Generate AI summaries for events that don't have them."""
    try:
        # Initialize AI service
        ai_service = AISummaryService()
        
        # Get events that need summaries
        events = ForexEvent.query.filter(
            ForexEvent.impact == 'High',
            ForexEvent.currency.in_(['USD', 'GBP']),
            ForexEvent.ai_summary.is_(None),
            ForexEvent.time > datetime.now(pytz.UTC)  # Only future events
        ).all()
        
        logger.info(f"Found {len(events)} events needing summaries")
        
        for event in events:
            try:
                # Convert event to dictionary for AI service
                event_dict = {
                    'event_title': event.event_title,
                    'currency': event.currency,
                    'impact': event.impact,
                    'forecast': event.forecast,
                    'previous': event.previous,
                    'time': event.time
                }
                
                # Generate summary
                summary = ai_service.generate_event_summary(event_dict)
                
                if summary:
                    event.ai_summary = summary
                    event.summary_generated_at = datetime.now(pytz.UTC)
                    db_session.commit()
                    logger.info(f"Generated summary for {event.currency} event: {event.event_title}")
                else:
                    logger.warning(f"Failed to generate summary for event: {event.event_title}")
                
            except Exception as e:
                logger.error(f"Error processing event {event.event_title}: {str(e)}")
                db_session.rollback()
                continue
        
        logger.info("Completed summary generation")
        
    except Exception as e:
        logger.error(f"Error in generate_missing_summaries: {str(e)}")
        db_session.rollback()

def refresh_old_summaries():
    """Refresh summaries that are more than a week old."""
    try:
        # Get events with old summaries
        week_ago = datetime.now(pytz.UTC) - timedelta(days=7)
        events = ForexEvent.query.filter(
            ForexEvent.impact == 'High',
            ForexEvent.currency.in_(['USD', 'GBP']),
            ForexEvent.summary_generated_at < week_ago,
            ForexEvent.time > datetime.now(pytz.UTC)  # Only future events
        ).all()
        
        logger.info(f"Found {len(events)} events needing summary refresh")
        
        # Initialize AI service
        ai_service = AISummaryService()
        
        for event in events:
            try:
                # Convert event to dictionary
                event_dict = {
                    'event_title': event.event_title,
                    'currency': event.currency,
                    'impact': event.impact,
                    'forecast': event.forecast,
                    'previous': event.previous,
                    'time': event.time
                }
                
                # Generate new summary
                summary = ai_service.generate_event_summary(event_dict)
                
                if summary:
                    event.ai_summary = summary
                    event.summary_generated_at = datetime.now(pytz.UTC)
                    db_session.commit()
                    logger.info(f"Refreshed summary for {event.currency} event: {event.event_title}")
                
            except Exception as e:
                logger.error(f"Error refreshing summary for event {event.event_title}: {str(e)}")
                db_session.rollback()
                continue
        
        logger.info("Completed summary refresh")
        
    except Exception as e:
        logger.error(f"Error in refresh_old_summaries: {str(e)}")
        db_session.rollback()

if __name__ == "__main__":
    generate_missing_summaries()
    refresh_old_summaries() 