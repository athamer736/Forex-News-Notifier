import os
import pymysql
import logging
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_connection():
    try:
        # Test database configuration
        user = 'forex_user'
        password = 'your_password_here'
        host = 'fxalert.co.uk'  # Using domain name
        database = 'forex_db'
        
        # Create the connection string
        connection_string = f'mysql+pymysql://{user}:{password}@{host}/{database}'
        
        logger.info(f"Attempting to connect to MySQL at {host}:{port} as {user}")
        
        # Connect to the database
        connection = pymysql.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            database=database,
            connect_timeout=10
        )
        
        logger.info("Successfully connected to MySQL database!")
        
        # Test query
        with connection.cursor() as cursor:
            cursor.execute("SELECT VERSION()")
            version = cursor.fetchone()
            logger.info(f"MySQL version: {version[0]}")
            
            # Test database permissions
            cursor.execute("SHOW GRANTS")
            grants = cursor.fetchall()
            logger.info("User privileges:")
            for grant in grants:
                logger.info(grant[0])
            
    except pymysql.Error as e:
        error_code = e.args[0]
        error_message = e.args[1] if len(e.args) > 1 else str(e)
        logger.error(f"MySQL Error [{error_code}]: {error_message}")
        
        if error_code == 1045:  # Access denied for user
            logger.error("Authentication failed - Please check username and password")
        elif error_code == 2003:  # Can't connect to server
            logger.error("Cannot connect to the server - Please check if MySQL is running and the host is correct")
        elif error_code == 1049:  # Unknown database
            logger.error("Database does not exist - Please check the database name")
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
    finally:
        if 'connection' in locals() and connection.open:
            connection.close()
            logger.info("Database connection closed.")

if __name__ == "__main__":
    test_connection() 