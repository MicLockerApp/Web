"""
Centralized Error Handling Middleware for MicLocker

Provides:
- Standardized error response format
- Request ID tracking for log correlation
- Unhandled exception catching

This middleware does NOT change existing HTTPException behavior.
It only standardizes unhandled exceptions and adds request tracking.
"""

import uuid
import logging
from contextvars import ContextVar
from typing import Optional, Callable

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)

# Context variable to store request ID across async calls
_request_id_ctx: ContextVar[Optional[str]] = ContextVar("request_id", default=None)


def get_request_id() -> Optional[str]:
    """
    Get the current request ID.
    
    Can be called from anywhere in the request lifecycle to get
    the unique identifier for log correlation.
    
    Returns:
        The request ID string or None if not in a request context.
    """
    return _request_id_ctx.get()


class RequestContextMiddleware(BaseHTTPMiddleware):
    """
    Middleware that adds request ID tracking.
    
    - Generates a unique UUID for each request
    - Stores it in context for use in logging
    - Adds X-Request-ID header to responses
    
    This middleware is additive and does not modify request/response content.
    """
    
    async def dispatch(self, request: Request, call_next: Callable):
        # Generate unique request ID
        request_id = str(uuid.uuid4())[:8]  # Short ID for readability
        
        # Store in context variable
        token = _request_id_ctx.set(request_id)
        
        # Store on request state for easy access
        request.state.request_id = request_id
        
        try:
            # Process request
            response = await call_next(request)
            
            # Add request ID to response headers
            response.headers["X-Request-ID"] = request_id
            
            return response
        finally:
            # Reset context
            _request_id_ctx.reset(token)


def create_error_response(
    status_code: int,
    error_code: str,
    message: str,
    details: Optional[dict] = None,
    request_id: Optional[str] = None
) -> JSONResponse:
    """
    Create a standardized error response.
    
    Response format:
    {
        "error": {
            "code": "ERROR_CODE",
            "message": "Human readable message",
            "details": {...},  // Optional
            "request_id": "abc123"  // For log correlation
        }
    }
    
    Args:
        status_code: HTTP status code
        error_code: Machine-readable error code (e.g., "VALIDATION_ERROR")
        message: Human-readable error message
        details: Optional additional error details
        request_id: Request ID for log correlation
    
    Returns:
        JSONResponse with standardized error format
    """
    error_body = {
        "code": error_code,
        "message": message,
    }
    
    if details:
        error_body["details"] = details
    
    if request_id:
        error_body["request_id"] = request_id
    
    return JSONResponse(
        status_code=status_code,
        content={"error": error_body}
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Handle unhandled exceptions with standardized format.
    
    This catches exceptions that weren't explicitly raised as HTTPException.
    It logs the full error for debugging while returning a safe message to clients.
    
    Note: This does NOT intercept HTTPException - those are handled by FastAPI's
    default handler to preserve existing API behavior.
    """
    request_id = getattr(request.state, "request_id", None) or get_request_id()
    
    # Log full exception for debugging
    logger.error(
        f"Unhandled exception [request_id={request_id}]: {type(exc).__name__}: {str(exc)}",
        exc_info=True
    )
    
    return create_error_response(
        status_code=500,
        error_code="INTERNAL_ERROR",
        message="An unexpected error occurred. Please try again later.",
        request_id=request_id
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """
    Handle Pydantic validation errors with standardized format.
    
    Converts validation errors to a consistent structure while preserving
    the detailed error information from Pydantic.
    """
    request_id = getattr(request.state, "request_id", None) or get_request_id()
    
    # Extract validation error details
    errors = exc.errors()
    
    # Create human-readable message from first error
    if errors:
        first_error = errors[0]
        loc = " -> ".join(str(l) for l in first_error.get("loc", []))
        msg = first_error.get("msg", "Validation error")
        message = f"{loc}: {msg}" if loc else msg
    else:
        message = "Request validation failed"
    
    logger.warning(
        f"Validation error [request_id={request_id}]: {message}"
    )
    
    return create_error_response(
        status_code=422,
        error_code="VALIDATION_ERROR",
        message=message,
        details={"validation_errors": errors},
        request_id=request_id
    )


def setup_error_handlers(app: FastAPI) -> None:
    """
    Setup centralized error handling for a FastAPI application.
    
    This function:
    1. Adds request context middleware (for request ID tracking)
    2. Registers exception handlers for unhandled errors
    
    Existing HTTPException handling is preserved - only unhandled
    exceptions and validation errors get the standardized treatment.
    
    Args:
        app: The FastAPI application instance
    
    Usage:
        from middleware import setup_error_handlers
        
        app = FastAPI()
        setup_error_handlers(app)
    """
    # Add request ID tracking middleware
    app.add_middleware(RequestContextMiddleware)
    
    # Register exception handlers
    # Note: HTTPException is NOT overridden to preserve existing behavior
    app.add_exception_handler(Exception, unhandled_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    
    logger.info("Centralized error handling configured")
