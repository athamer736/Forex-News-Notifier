from flask import Flask, render_template, jsonify
from flask_cors import CORS
import logging
from fetch_events import fetch_events  # Import the function

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

if __name__ == "__main__":
    # Remove the duplicate app.run and set host to '0.0.0.0' to allow external access
    app.run(
        host="0.0.0.0",  # Allows external access
        port=5000,       # Standard port
        debug=True       # Enable debug mode
    )
    
    
    
    
    