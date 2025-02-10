import sys
from pathlib import Path
from datetime import datetime, timedelta
import pytz
import json

# Add the project root directory to Python path
project_root = str(Path(__file__).parent.parent)
sys.path.append(project_root)

from config.database import (
    get_filtered_events,
    get_high_impact_events,
    get_currency_events,
    get_events_by_date
)

def print_events(events, title):
    """Helper function to print events nicely."""
    print(f"\n{title}")
    print(f"Found {len(events)} events:")
    
    for event in events:
        print(f"\n- {event['time']}: {event['currency']} - {event['event_title']}")
        print(f"  Impact: {event['impact']}")
        if event['forecast']:
            print(f"  Forecast: {event['forecast']}")
        if event['previous']:
            print(f"  Previous: {event['previous']}")
        if event['actual']:
            print(f"  Actual: {event['actual']}")

def test_queries():
    try:
        # Test 1: Get high impact events for next 24 hours
        print_events(
            get_high_impact_events(days=1),
            "Test 1: High impact events in next 24 hours"
        )

        # Test 2: Get USD events for this week
        print_events(
            get_currency_events('USD', days=7),
            "Test 2: USD events this week"
        )

        # Test 3: Get events with specific filters
        filtered_events = get_filtered_events(
            currencies=['EUR', 'GBP'],
            impact_levels=['High', 'Medium'],
            time_range='week'
        )
        print_events(
            filtered_events,
            "Test 3: EUR and GBP High/Medium impact events this week"
        )

        # Test 4: Get events for a specific date
        specific_date = datetime(2025, 2, 12, tzinfo=pytz.UTC)  # Test with Feb 12, 2025
        print_events(
            get_events_by_date(specific_date),
            f"Test 4: All events for {specific_date.strftime('%Y-%m-%d')}"
        )

        # Test 5: Get events for tomorrow
        print_events(
            get_filtered_events(time_range='tomorrow'),
            "Test 5: All events for tomorrow"
        )

        # Save sample results to a JSON file for reference
        sample_data = {
            'high_impact': get_high_impact_events(days=1),
            'usd_events': get_currency_events('USD', days=7),
            'eur_gbp_events': filtered_events,
            'specific_date': get_events_by_date(specific_date),
            'tomorrow_events': get_filtered_events(time_range='tomorrow')
        }
        
        with open('sample_queries.json', 'w') as f:
            json.dump(sample_data, f, indent=2)
            print("\nSample results saved to sample_queries.json")

    except Exception as e:
        print(f"Error during testing: {str(e)}")

if __name__ == "__main__":
    test_queries() 