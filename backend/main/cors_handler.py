import logging
from typing import List, Optional
from .ip_handler import is_local_request

logger = logging.getLogger(__name__)

def build_allowed_origins(local_ips: List[str], server_ip: str) -> List[str]:
    """Build list of allowed origins for CORS"""
    allowed_origins = [
        # Local development
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        # Explicit local network IP
        "http://192.168.0.144:3000",
        "http://192.168.0.144:5000"
    ]

    # Add any additional detected local IPs
    for ip in local_ips:
        if ip != "192.168.0.144":  # Don't duplicate if it's already the known IP
            allowed_origins.extend([
                f"http://{ip}:3000",
                f"http://{ip}:5000"
            ])

    # Add server origins
    allowed_origins.extend([
        f"http://{server_ip}:3000",
        f"http://{server_ip}:5000"
    ])

    logger.info(f"Allowed origins: {allowed_origins}")
    return allowed_origins

def get_appropriate_origin(request_origin: str, request_addr: str, local_ips: List[str], 
                         allowed_origins: List[str], server_ip: str) -> Optional[str]:
    """Get the appropriate origin based on the request"""
    if not request_origin:
        return None

    # Log the incoming request details
    logger.debug(f"Request origin: {request_origin}")
    logger.debug(f"Remote addr: {request_addr}")
    
    # If it's a local request, prioritize local origins
    if is_local_request(request_addr, local_ips):
        logger.debug("Local request detected")
        for origin in allowed_origins:
            if local_ips[0] in origin or 'localhost' in origin or '127.0.0.1' in origin:
                if origin == request_origin:
                    return origin
    else:
        logger.debug("Remote request detected")
        # For remote requests, try server IP first
        for origin in allowed_origins:
            if server_ip in origin:
                if origin == request_origin:
                    return origin

    # If no match found, check if the origin is in allowed list
    if request_origin in allowed_origins:
        return request_origin
        
    logger.warning(f"No matching origin found for: {request_origin}")
    return None

def get_cors_headers(origin: str) -> dict:
    """Get CORS headers for a response"""
    if not origin:
        return {}
        
    return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Origin',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '600'
    } 