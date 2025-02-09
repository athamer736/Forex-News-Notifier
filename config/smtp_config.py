import os
from typing import Dict, Optional

# Default SMTP configurations
SMTP_CONFIG = {
    'gmail': {
        'host': 'smtp.gmail.com',
        'port': 587,
        'use_tls': True
    },
    'outlook': {
        'host': 'smtp-mail.outlook.com',
        'port': 587,
        'use_tls': True
    },
    'yahoo': {
        'host': 'smtp.mail.yahoo.com',
        'port': 587,
        'use_tls': True
    }
}

def get_smtp_config() -> Dict[str, str]:
    """
    Get SMTP configuration from environment variables.
    Returns a dictionary with SMTP settings.
    """
    # Get provider from environment variable, default to gmail
    provider = os.getenv('SMTP_PROVIDER', 'gmail').lower()
    
    # Get provider-specific defaults
    config = SMTP_CONFIG.get(provider, SMTP_CONFIG['gmail'])
    
    # Override with environment variables if provided
    smtp_config = {
        'host': os.getenv('SMTP_HOST', config['host']),
        'port': int(os.getenv('SMTP_PORT', config['port'])),
        'user': os.getenv('SMTP_USER'),
        'password': os.getenv('SMTP_PASSWORD'),
        'use_tls': config['use_tls']
    }
    
    # Validate required fields
    if not smtp_config['user'] or not smtp_config['password']:
        raise ValueError(
            'SMTP_USER and SMTP_PASSWORD environment variables must be set. '
            'For Gmail, use an App Password: https://support.google.com/accounts/answer/185833'
        )
    
    return smtp_config

def validate_smtp_config(config: Dict[str, str]) -> Optional[str]:
    """
    Validate SMTP configuration.
    Returns error message if invalid, None if valid.
    """
    required_fields = ['host', 'port', 'user', 'password']
    
    for field in required_fields:
        if not config.get(field):
            return f'Missing required SMTP configuration: {field}'
    
    try:
        port = int(config['port'])
        if port < 1 or port > 65535:
            return 'Invalid SMTP port number'
    except ValueError:
        return 'SMTP port must be a valid number'
    
    return None 