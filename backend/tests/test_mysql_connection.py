import os
import pymysql
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_connection():
    try:
        # Connect to the database
        connection = pymysql.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            port=int(os.getenv('DB_PORT', 3306)),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASSWORD', 'DBPASSWORD'),  # Use placeholder if not in env
            database=os.getenv('DB_NAME', 'forex_news')
        )
        
        print("Successfully connected to MySQL database!")
        
        # Test query
        with connection.cursor() as cursor:
            cursor.execute("SELECT VERSION()")
            version = cursor.fetchone()
            print(f"MySQL version: {version[0]}")
            
    except Exception as e:
        print(f"Error connecting to MySQL database: {str(e)}")
    finally:
        if 'connection' in locals() and connection.open:
            connection.close()
            print("Database connection closed.")

if __name__ == "__main__":
    test_connection() 