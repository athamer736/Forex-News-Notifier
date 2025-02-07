import requests
from datetime import datetime, timedelta
import time
import logging

# Cache for storing forex events
cache = {
    'data': None,
    'last_updated': None
}

# Headers for the API request
HEADERS = {
    'User-Agent': 'ForexNewsNotifier/1.0',
    'Accept': 'application/json'
}

def fetch_events():
    try:
        current_time = datetime.now()
        
        # Return cached data if it's less than 15 minutes old
        if cache['data'] and cache['last_updated'] and \
           current_time - cache['last_updated'] < timedelta(minutes=15):
            logging.debug("Returning cached data")
            return cache['data']
        
        # Add delay between requests to avoid rate limiting
        if cache['last_updated']:
            time_since_last_request = (current_time - cache['last_updated']).total_seconds()
            if time_since_last_request < 5:  # Ensure at least 5 seconds between requests
                time.sleep(5 - time_since_last_request)

        max_retries = 3
        retry_delay = 10  # seconds, increased from 2 to 10

        for attempt in range(max_retries):
            try:
                logging.debug(f"Attempt {attempt + 1} to fetch data")
                url = "https://nfs.faireconomy.media/ff_calendar_thisweek.json"
                
                # If we have cached data and this isn't our first attempt, return cached data
                if attempt > 0 and cache['data']:
                    logging.info("Using cached data after failed attempt")
                    return cache['data']
                
                response = requests.get(
                    url, 
                    headers=HEADERS,
                    timeout=10
                )
                
                if response.status_code == 429:  # Too Many Requests
                    logging.warning("Rate limit hit, attempt %d", attempt + 1)
                    if cache['data']:
                        logging.info("Returning cached data due to rate limit")
                        return cache['data']
                    time.sleep(retry_delay * (attempt + 1))
                    continue
                
                response.raise_for_status()
                raw_events = response.json()
                logging.debug(f"Received {len(raw_events)} events from API")
                
                formatted_events = []
                for event in raw_events:
                    try:
                        # Convert date string to a more readable format
                        date_obj = datetime.fromisoformat(event['date'].replace('Z', '+00:00'))
                        formatted_date = date_obj.strftime('%Y-%m-%d %H:%M')

                        formatted_event = {
                            'time': formatted_date,
                            'currency': event['country'],
                            'impact': event['impact'],
                            'event_title': event['title'],
                            'forecast': event['forecast'],
                            'previous': event['previous']
                        }
                        formatted_events.append(formatted_event)
                    except Exception as e:
                        logging.error(f"Error formatting event: {event}")
                        logging.exception(e)
                        continue

                # Update cache
                cache['data'] = formatted_events
                cache['last_updated'] = current_time
                logging.info(f"Successfully fetched and formatted {len(formatted_events)} events")
                return formatted_events

            except requests.exceptions.RequestException as e:
                logging.error(f"Request failed on attempt {attempt + 1}: {str(e)}")
                if cache['data']:
                    logging.info("Returning cached data after request failure")
                    return cache['data']
                if attempt == max_retries - 1:
                    raise Exception(f"Failed to fetch forex events: {str(e)}")
                time.sleep(retry_delay * (attempt + 1))

    except Exception as e:
        logging.exception("Unexpected error in fetch_events")
        if cache['data']:
            logging.info("Returning cached data after unexpected error")
            return cache['data']
        raise Exception(f"An unexpected error occurred: {str(e)}") 