from flask import Flask, render_template, jsonify
from flask_cors import CORS
import requests
from datetime import datetime, timedelta
import time
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
# Enable CORS for all domains with security settings
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:3000", "http://141.95.123.145:3000"],
        "methods": ["GET"],
        "allow_headers": ["Content-Type"]
    }
})

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

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/events")
def events():
    try:
        events = fetch_events()
        return jsonify(events)
    except Exception as e:
        logger.exception("Error in /events endpoint")
        return jsonify({"error": str(e)}), 500

def fetch_events():
    try:
        current_time = datetime.now()
        
        # Return cached data if it's less than 15 minutes old
        if cache['data'] and cache['last_updated'] and \
           current_time - cache['last_updated'] < timedelta(minutes=15):
            logger.debug("Returning cached data")
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
                logger.debug(f"Attempt {attempt + 1} to fetch data")
                url = "https://nfs.faireconomy.media/ff_calendar_thisweek.json"
                
                # If we have cached data and this isn't our first attempt, return cached data
                if attempt > 0 and cache['data']:
                    logger.info("Using cached data after failed attempt")
                    return cache['data']
                
                response = requests.get(
                    url, 
                    headers=HEADERS,
                    timeout=10
                )
                
                if response.status_code == 429:  # Too Many Requests
                    logger.warning("Rate limit hit, attempt %d", attempt + 1)
                    if cache['data']:
                        logger.info("Returning cached data due to rate limit")
                        return cache['data']
                    time.sleep(retry_delay * (attempt + 1))
                    continue
                
                response.raise_for_status()
                raw_events = response.json()
                logger.debug(f"Received {len(raw_events)} events from API")
                
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
                        logger.error(f"Error formatting event: {event}")
                        logger.exception(e)
                        continue

                # Update cache
                cache['data'] = formatted_events
                cache['last_updated'] = current_time
                logger.info(f"Successfully fetched and formatted {len(formatted_events)} events")
                return formatted_events

            except requests.exceptions.RequestException as e:
                logger.error(f"Request failed on attempt {attempt + 1}: {str(e)}")
                if cache['data']:
                    logger.info("Returning cached data after request failure")
                    return cache['data']
                if attempt == max_retries - 1:
                    raise Exception(f"Failed to fetch forex events: {str(e)}")
                time.sleep(retry_delay * (attempt + 1))

    except Exception as e:
        logger.exception("Unexpected error in fetch_events")
        if cache['data']:
            logger.info("Returning cached data after unexpected error")
            return cache['data']
        raise Exception(f"An unexpected error occurred: {str(e)}")

if __name__ == "__main__":
    # Remove the duplicate app.run and set host to '0.0.0.0' to allow external access
    app.run(
        host="0.0.0.0",  # Allows external access
        port=5000,       # Standard port
        debug=True       # Enable debug mode
    )
    
    
    
    
    