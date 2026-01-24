"""
Middleware module for MicLocker backend.

Contains centralized error handling and request tracking.
"""

from .error_handler import (
    setup_error_handlers,
    RequestContextMiddleware,
    get_request_id
)

__all__ = [
    "setup_error_handlers",
    "RequestContextMiddleware", 
    "get_request_id"
]
