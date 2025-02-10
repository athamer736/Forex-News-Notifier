from datetime import datetime
from config.database import db_session, init_db
from models.forex_event import ForexEvent
from models.user_preferences import UserEmailPreferences

def test_database_connection():
    print("Testing database connection...")
    try:
        # Initialize database and tables
        init_db()
        print("Database initialized successfully!")

        # Test inserting a forex event
        print("\nTesting forex event insertion...")
        test_event = ForexEvent(
            time=datetime.utcnow(),
            currency='EUR',
            impact='High',
            event_title='Test Economic Event',
            forecast='1.2%',
            previous='1.0%',
            source='test',
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db_session.add(test_event)
        db_session.commit()
        print("Forex event inserted successfully!")

        # Test inserting user preferences
        print("\nTesting user preferences insertion...")
        test_user = UserEmailPreferences(
            user_id='test_user_1',
            email='test@example.com',
            timezone='UTC',
            selected_currencies=['EUR', 'USD'],
            selected_impact_levels=['High', 'Medium']
        )
        db_session.add(test_user)
        db_session.commit()
        print("User preferences inserted successfully!")

        # Test querying data
        print("\nTesting data retrieval...")
        events = db_session.query(ForexEvent).all()
        print(f"Found {len(events)} forex events")
        users = db_session.query(UserEmailPreferences).all()
        print(f"Found {len(users)} users")

        # Clean up test data
        print("\nCleaning up test data...")
        db_session.delete(test_event)
        db_session.delete(test_user)
        db_session.commit()
        print("Test data cleaned up successfully!")

        return True

    except Exception as e:
        print(f"Error: {str(e)}")
        return False
    finally:
        db_session.close()

if __name__ == "__main__":
    test_database_connection() 