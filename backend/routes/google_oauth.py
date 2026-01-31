"""
Google OAuth Routes (Direct Implementation)

Handles Google OAuth authentication directly with Google APIs.
"""

from fastapi import APIRouter, HTTPException, status, Response, Request, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from database import get_database
from services.auth import create_access_token
from datetime import datetime, timezone, timedelta
import httpx
import uuid
import os
import logging
import urllib.parse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth/google", tags=["Google OAuth"])

# Google OAuth Configuration
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"


class GoogleAuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    username: str
    email: str
    is_new_user: bool


@router.get("/login")
async def google_login(request: Request, redirect_uri: str = Query(None)):
    """
    Initiate Google OAuth flow.
    Redirects user to Google's consent screen.
    """
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth not configured"
        )
    
    # Build the redirect URI for the callback
    if redirect_uri:
        callback_uri = redirect_uri
    else:
        # Default callback URI based on request origin
        host = request.headers.get("origin") or request.headers.get("referer", "").rstrip("/")
        if not host:
            host = str(request.base_url).rstrip("/")
        callback_uri = f"{host}/auth/google/callback"
    
    # Build Google OAuth URL
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": callback_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account",
        "state": callback_uri  # Pass callback URI in state for verification
    }
    
    auth_url = f"{GOOGLE_AUTH_URL}?{urllib.parse.urlencode(params)}"
    return RedirectResponse(url=auth_url)


@router.get("/callback")
async def google_callback(
    code: str = Query(None),
    state: str = Query(None),
    error: str = Query(None)
):
    """
    Handle Google OAuth callback.
    This is called by Google after user authorizes.
    Returns HTML that sends data to the parent window.
    """
    if error:
        return create_error_response(f"Google OAuth error: {error}")
    
    if not code:
        return create_error_response("No authorization code received")
    
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        return create_error_response("Google OAuth not configured")
    
    # The state contains our callback URI
    redirect_uri = state or ""
    
    try:
        # Exchange code for tokens
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                GOOGLE_TOKEN_URL,
                data={
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": redirect_uri
                },
                timeout=10.0
            )
            
            if token_response.status_code != 200:
                logger.error(f"Token exchange failed: {token_response.text}")
                return create_error_response("Failed to exchange authorization code")
            
            tokens = token_response.json()
            access_token = tokens.get("access_token")
            
            # Get user info from Google
            userinfo_response = await client.get(
                GOOGLE_USERINFO_URL,
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=10.0
            )
            
            if userinfo_response.status_code != 200:
                logger.error(f"Userinfo request failed: {userinfo_response.text}")
                return create_error_response("Failed to get user information")
            
            google_user = userinfo_response.json()
    
    except httpx.RequestError as e:
        logger.error(f"HTTP error during OAuth: {e}")
        return create_error_response("Network error during authentication")
    
    # Extract user info
    google_id = google_user.get("id")
    email = google_user.get("email")
    name = google_user.get("name", "")
    picture = google_user.get("picture")
    
    if not email:
        return create_error_response("Email not provided by Google")
    
    # Process user in database
    db = get_database()
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    is_new_user = False
    
    if existing_user:
        # Update existing user with Google info
        update_data = {"updated_at": datetime.now(timezone.utc)}
        if not existing_user.get("google_id"):
            update_data["google_id"] = google_id
        if picture and not existing_user.get("profile_image"):
            update_data["profile_image"] = picture
        
        await db.users.update_one(
            {"id": existing_user["id"]},
            {"$set": update_data}
        )
        user = existing_user
    else:
        # Create new user
        is_new_user = True
        
        # Generate username from email
        base_username = email.split("@")[0].lower()
        # Remove special characters
        base_username = ''.join(c for c in base_username if c.isalnum())
        username = base_username
        counter = 1
        while await db.users.find_one({"username": username}):
            username = f"{base_username}{counter}"
            counter += 1
        
        # Parse name
        name_parts = name.split(" ", 1)
        first_name = name_parts[0] if name_parts else ""
        last_name = name_parts[1] if len(name_parts) > 1 else ""
        
        user_id = str(uuid.uuid4())
        user = {
            "id": user_id,
            "username": username,
            "email": email,
            "first_name": first_name,
            "last_name": last_name,
            "google_id": google_id,
            "profile_image": picture,
            "password_hash": None,
            "category": None,
            "is_active": True,
            "is_verified": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "settings": {
                "email_notifications": True,
                "marketing_emails": False
            }
        }
        
        await db.users.insert_one(user)
        logger.info(f"Created new user via Google OAuth: {username} ({email})")
    
    # Create JWT token
    jwt_token = create_access_token(
        data={"sub": user["id"], "username": user["username"]},
        expires_delta=timedelta(days=7)
    )
    
    # Return HTML that communicates with the opener window
    return create_success_response(jwt_token, user, is_new_user)


def create_error_response(message: str):
    """Create HTML response for error cases"""
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Authentication Error</title>
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: #1a1a2e;
                color: #fff;
            }}
            .container {{
                text-align: center;
                padding: 40px;
            }}
            .error {{
                color: #ef4444;
                font-size: 18px;
                margin-bottom: 20px;
            }}
            .redirect {{
                color: #888;
                font-size: 14px;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="error">{message}</div>
            <div class="redirect">Redirecting...</div>
        </div>
        <script>
            setTimeout(function() {{
                if (window.opener) {{
                    window.opener.postMessage({{ type: 'google-auth-error', error: '{message}' }}, '*');
                    window.close();
                }} else {{
                    window.location.href = '/login?error=' + encodeURIComponent('{message}');
                }}
            }}, 2000);
        </script>
    </body>
    </html>
    """
    from fastapi.responses import HTMLResponse
    return HTMLResponse(content=html)


def create_success_response(token: str, user: dict, is_new_user: bool):
    """Create HTML response that sends auth data to parent window"""
    import json
    user_data = {
        "id": user["id"],
        "username": user["username"],
        "email": user.get("email", ""),
        "first_name": user.get("first_name", ""),
        "last_name": user.get("last_name", ""),
        "profile_image": user.get("profile_image"),
        "category": user.get("category"),
        "is_new_user": is_new_user
    }
    user_json = json.dumps(user_data)
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Authentication Successful</title>
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: #1a1a2e;
                color: #fff;
            }}
            .container {{
                text-align: center;
                padding: 40px;
            }}
            .success {{
                color: #22c55e;
                font-size: 18px;
                margin-bottom: 20px;
            }}
            .spinner {{
                border: 3px solid #333;
                border-top: 3px solid #d4af37;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                animation: spin 1s linear infinite;
                margin: 20px auto;
            }}
            @keyframes spin {{
                0% {{ transform: rotate(0deg); }}
                100% {{ transform: rotate(360deg); }}
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="spinner"></div>
            <div class="success">Authentication successful!</div>
        </div>
        <script>
            const authData = {{
                type: 'google-auth-success',
                token: '{token}',
                user: {user_json},
                is_new_user: {str(is_new_user).lower()}
            }};
            
            // Try to communicate with opener window
            if (window.opener) {{
                window.opener.postMessage(authData, '*');
                window.close();
            }} else {{
                // Direct navigation - store token and redirect
                localStorage.setItem('token', '{token}');
                localStorage.setItem('google_auth_user', JSON.stringify({user_json}));
                localStorage.setItem('google_auth_is_new', '{str(is_new_user).lower()}');
                window.location.href = {'"/onboarding"' if is_new_user else '"/dashboard"'};
            }}
        </script>
    </body>
    </html>
    """
    from fastapi.responses import HTMLResponse
    return HTMLResponse(content=html)


@router.get("/check-email/{email}")
async def check_google_email(email: str):
    """Check if an email is already registered"""
    db = get_database()
    
    user = await db.users.find_one({"email": email}, {"_id": 0, "id": 1, "google_id": 1})
    
    return {
        "exists": user is not None,
        "has_google": user.get("google_id") is not None if user else False
    }
