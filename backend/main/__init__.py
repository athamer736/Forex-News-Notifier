"""
This package contains core functionality for the forex news notifier.
"""

from .timezone_handler import set_user_timezone, get_user_timezone, convert_to_local_time
from .ip_handler import get_local_ip, get_server_ip, is_local_request
from .cors_handler import build_allowed_origins, get_appropriate_origin, get_cors_headers
from .cache_handler import start_background_tasks, stop_background_tasks, refresh_cache
from .route_handler import (
    handle_timezone_request,
    handle_events_request,
    handle_cache_status_request,
    handle_cache_refresh_request
)
from .subscription_handler import (
    handle_subscription_request,
    handle_verification_request,
    handle_unsubscribe_request
) 