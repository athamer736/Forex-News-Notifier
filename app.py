from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
import logging
from fetch_events import fetch_events
from timezone_handler import set_user_timezone, get_user_timezone, convert_to_local_time
from event_filter import filter_events_by_range, TimeRange
from event_store import get_filtered_events

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
# Enable CORS for all domains with security settings
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:3000", "http://141.95.123.145:3000"],
        "methods": ["GET", "POST"],
        "allow_headers": ["Content-Type"]
    }
})

# Valid time ranges for filtering
VALID_TIME_RANGES = ['1h', '4h', '8h', '12h', '24h', 'today', 'tomorrow', 'week']

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/timezone", methods=["POST"])
def set_timezone():
    try:
        data = request.get_json()
        timezone = data.get('timezone')
        offset = data.get('offset')
        user_id = data.get('userId', 'default')
        
        preferences = set_user_timezone(timezone, offset, user_id)
        return jsonify({"message": "Timezone preference saved", "preferences": preferences}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.exception("Error setting timezone")
        return jsonify({"error": str(e)}), 500

@app.route("/events")
def get_events():
    try:
        # Get user's timezone and time range preference
        user_id = request.args.get('userId', 'default')
        time_range = request.args.get('range', '24h')
        
        # Validate time range
        if time_range not in VALID_TIME_RANGES:
            return jsonify({
                'error': f'Invalid time range. Must be one of: {", ".join(VALID_TIME_RANGES)}'
            }), 400

        # Get user's timezone from storage
        user_timezone = get_user_timezone(user_id)
        if not user_timezone:
            logger.warning(f"No timezone found for user {user_id}, defaulting to UTC")
            user_timezone = 'UTC'

        # Fetch fresh events if needed (this will update the store)
        try:
            fetch_events()
        except Exception as e:
            logger.error(f"Error fetching events: {str(e)}")
            # Continue with existing stored events if available

        # Get filtered events based on user's preferences
        filtered_events = get_filtered_events(time_range, user_timezone)
        
        return jsonify(filtered_events)

    except Exception as e:
        logger.exception("Error processing events request")
        return jsonify({'error': str(e)}), 500

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )
    
    
    
    
    