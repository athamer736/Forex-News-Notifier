"""
Helper module for SSL certificate handling.
"""
import os
import logging
import certifi
import ssl

logger = logging.getLogger(__name__)

def configure_ssl():
    """Configure SSL for API calls.
    
    This function sets the SSL_CERT_FILE environment variable to use the certifi
    certificate bundle, which helps with SSL certificate verification issues.
    """
    try:
        # Get the path to the certifi certificate bundle
        cafile = certifi.where()
        
        # Set the SSL_CERT_FILE environment variable
        os.environ['SSL_CERT_FILE'] = cafile
        logger.info(f"SSL certificate file set to: {cafile}")
        
        # Create a test SSL context to verify it works
        ssl_context = ssl.create_default_context()
        logger.info("SSL context created successfully")
        
        return True
    except Exception as e:
        logger.error(f"Error configuring SSL: {str(e)}")
        return False 