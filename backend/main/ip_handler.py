import logging
import socket
import requests

logger = logging.getLogger(__name__)

def get_local_ip() -> list:
    """Get the local IP address"""
    try:
        # Try to get the local IP by creating a socket
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))  # Doesn't actually send any data
        local_ip = s.getsockname()[0]
        s.close()
        
        # If we got a different local IP, add both
        if local_ip != "192.168.0.144":
            logger.info(f"Detected different local IP: {local_ip}")
            return [local_ip, "192.168.0.144"]
        return [local_ip]
    except Exception as e:
        logger.error(f"Error getting local IP: {e}")
        return ["192.168.0.144"]

def get_server_ip() -> str:
    """Get the server's public IP address"""
    try:
        response = requests.get('https://api.ipify.org')
        return response.text
    except Exception as e:
        logger.error(f"Error getting server IP: {e}")
        return None

def is_local_request(request_addr: str, local_ips: list) -> bool:
    """Check if the request is coming from the local network"""
    return (
        request_addr.startswith('127.') or 
        request_addr.startswith('192.168.') or 
        request_addr in local_ips
    ) 