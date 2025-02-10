from config.database import init_db
from models.forex_event import ForexEvent
from models.user_preferences import UserEmailPreferences

def main():
    print("Initializing database...")
    try:
        init_db()
        print("Database initialized successfully!")
    except Exception as e:
        print(f"Error initializing database: {str(e)}")

if __name__ == "__main__":
    main() 