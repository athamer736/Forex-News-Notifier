import sys
import os
import logging
from datetime import datetime, timedelta
import pytz
from dotenv import load_dotenv

# Simple path manipulation - add project root to path
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(script_dir)

# Add to path if not already there
if project_root not in sys.path:
    sys.path.insert(0, project_root)

# Load environment variables
env_path = os.path.join(project_root, '.env')
load_dotenv(env_path, override=True)

# Get OpenAI API key
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
if not OPENAI_API_KEY:
    print("Error: OPENAI_API_KEY not found in environment variables")
    sys.exit(1)

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

from models.forex_event import ForexEvent
from backend.database import db_session
from backend.services.ai_summary_service import AISummaryService

def generate_missing_summaries():
    """Generate AI summaries for events that don't have them."""
    try:
        # Initialize AI service with API key
        ai_service = AISummaryService(OPENAI_API_KEY)
        
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
                    'time': event.time.isoformat() if event.time else None
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
                import traceback
                logger.error(f"Traceback: {traceback.format_exc()}")
                db_session.rollback()
                continue
        
        logger.info("Completed summary generation")
        
    except Exception as e:
        logger.error(f"Error in generate_missing_summaries: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return False

def refresh_old_summaries():
    """Refresh summaries that are more than a week old."""
    try:
        # Initialize AI service with API key
        ai_service = AISummaryService(OPENAI_API_KEY)
        
        # Get events with old summaries
        week_ago = datetime.now(pytz.UTC) - timedelta(days=7)
        events = ForexEvent.query.filter(
            ForexEvent.impact == 'High',
            ForexEvent.currency.in_(['USD', 'GBP']),
            ForexEvent.summary_generated_at < week_ago,
            ForexEvent.time > datetime.now(pytz.UTC)  # Only future events
        ).all()
        
        logger.info(f"Found {len(events)} events needing summary refresh")
                
        for event in events:
            try:
                # Convert event to dictionary
                event_dict = {
                    'event_title': event.event_title,
                    'currency': event.currency,
                    'impact': event.impact,
                    'forecast': event.forecast,
                    'previous': event.previous,
                    'time': event.time.isoformat() if event.time else None
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
                import traceback
                logger.error(f"Traceback: {traceback.format_exc()}")
                db_session.rollback()
                continue
        
        logger.info("Completed summary refresh")
        
    except Exception as e:
        logger.error(f"Error in refresh_old_summaries: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return False

if __name__ == "__main__":
    generate_missing_summaries()
    refresh_old_summaries() 