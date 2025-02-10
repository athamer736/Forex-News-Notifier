import requests
from datetime import datetime, timedelta
import pytz
import logging
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

class ForexFactoryScraper:
    BASE_URL = "https://nfs.faireconomy.media/ff_calendar_thisweek.json"
    
    def __init__(self):
        self.headers = {
            "Accept": "application/json",
            "Content-Type": "application/json"
        }
    
    def get_calendar_data(self) -> List[Dict]:
        """Get calendar data from ForexFactory."""
        try:
            # Make API request
            response = requests.get(self.BASE_URL, headers=self.headers)
            response.raise_for_status()
            
            # Parse response
            data = response.json()
            
            # Transform API data to our format
            events = []
            for event in data:
                try:
                    # Parse event time (data comes in Eastern Time)
                    event_time = datetime.fromisoformat(event['date'])
                    
                    # Create event dictionary
                    formatted_event = {
                        'date': event_time.isoformat(),
                        'country': event['country'],
                        'impact': event['impact'],
                        'title': event['title'],
                        'forecast': event.get('forecast', ''),
                        'previous': event.get('previous', ''),
                        'actual': event.get('actual', ''),
                        'url': ''  # API doesn't provide URLs
                    }
                    
                    events.append(formatted_event)
                    
                except Exception as e:
                    logger.error(f"Error processing event: {str(e)}")
                    continue
            
            logger.info(f"Retrieved {len(events)} events from ForexFactory")
            return events
            
        except Exception as e:
            logger.error(f"Error fetching data from ForexFactory: {str(e)}")
            return []
    
    def get_latest_events(self, days_ahead: int = 7) -> List[Dict]:
        """Get events for this week."""
        return self.get_calendar_data() 