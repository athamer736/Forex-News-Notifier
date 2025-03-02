"""
This package contains all event-related functionality for the forex news notifier.
"""

from .event_store import (
    get_filtered_events,
    get_cache_status,
    store_events,
    load_cached_events,
    clean_memory_cache,
    event_store
)
from .fetch_events import fetch_events 