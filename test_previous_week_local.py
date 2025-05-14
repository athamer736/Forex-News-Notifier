import requests
import json
import logging
from datetime import datetime

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_previous_week_filter():
    """Test if the previous_week filter is now working with our local JSON files"""
    try:
        # URL for testing (using HTTP instead of HTTPS)
        url = "http://localhost:5000/events"
        
        # Parameters
        params = {
            "time_range": "previous_week",
            "userId": "test_user"
        }
        
        logger.info(f"Testing previous_week filter with URL: {url}")
        
        # Make the request with SSL verification disabled
        response = requests.get(url, params=params)
        
        # Check response
        if response.status_code == 200:
            events = response.json()
            logger.info(f"Request successful! Found {len(events)} events for previous week")
            
            # Print some sample events
            if events:
                logger.info("Sample events:")
                for i, event in enumerate(events[:5]):
                    logger.info(f"Event {i+1}: {event['event_title']} at {event['time']} ({event['currency']})")
                    
                # Print events by day
                day_counts = {}
                for event in events:
                    date = event['time'].split()[0]  # Extract date part only
                    day_counts[date] = day_counts.get(date, 0) + 1
                
                logger.info("Events by day:")
                for date, count in day_counts.items():
                    logger.info(f"  {date}: {count} events")
            else:
                logger.warning("No events returned despite successful request")
        else:
            logger.error(f"Request failed with status code {response.status_code}")
            logger.error(f"Error response: {response.text}")
            
    except Exception as e:
        logger.error(f"Error while testing previous_week filter: {str(e)}")
        logger.exception("Exception details:")

if __name__ == "__main__":
    test_previous_week_filter() 