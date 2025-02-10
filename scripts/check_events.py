import sys
from pathlib import Path
from datetime import datetime, timedelta
import pytz

# Add the project root directory to Python path
project_root = str(Path(__file__).parent.parent)
sys.path.append(project_root)

from config.database import db_session
from models.forex_event import ForexEvent

def main():
    try:
        # Get events for the next two weeks
        start_date = datetime(2025, 2, 2, tzinfo=pytz.UTC)
        end_date = start_date + timedelta(days=14)
        
        events = db_session.query(ForexEvent)\
            .filter(ForexEvent.time >= start_date)\
            .filter(ForexEvent.time <= end_date)\
            .order_by(ForexEvent.time)\
            .all()
        
        print(f"\nFound {len(events)} events between {start_date.date()} and {end_date.date()}")
        print("\nSample of events:")
        
        # Print first 5 events as a sample
        for i, event in enumerate(events[:5], 1):
            print(f"\n{i}. {event.currency} - {event.event_title}")
            print(f"   Time: {event.time}")
            print(f"   Impact: {event.impact}")
            print(f"   Forecast: {event.forecast}")
            print(f"   Previous: {event.previous}")
        
        # Print impact level distribution
        impact_counts = {}
        for event in events:
            impact_counts[event.impact] = impact_counts.get(event.impact, 0) + 1
        
        print("\nImpact level distribution:")
        for impact, count in impact_counts.items():
            print(f"{impact}: {count} events")
        
        # Print currency distribution
        currency_counts = {}
        for event in events:
            currency_counts[event.currency] = currency_counts.get(event.currency, 0) + 1
        
        print("\nCurrency distribution:")
        for currency, count in sorted(currency_counts.items()):
            print(f"{currency}: {count} events")
            
    except Exception as e:
        print(f"Error checking events: {str(e)}")
    finally:
        db_session.close()

if __name__ == "__main__":
    main() 