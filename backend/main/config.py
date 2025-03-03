"""
Configuration settings for the backend application.
"""
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Frontend URL configuration
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://fxalert.co.uk')

# Remove any trailing slashes
if FRONTEND_URL.endswith('/'):
    FRONTEND_URL = FRONTEND_URL[:-1] 