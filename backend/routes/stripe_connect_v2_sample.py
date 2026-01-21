"""
===============================================================================
STRIPE CONNECT V2 SAMPLE - API ROUTES
===============================================================================

This module provides REST API endpoints for the Stripe Connect V2 sample.
It demonstrates a complete Connect integration flow:

    1. POST /accounts              - Create a connected account
    2. GET  /accounts/{id}/status  - Get account onboarding status
    3. POST /accounts/{id}/onboard - Generate onboarding link
    4. POST /webhooks              - Handle Stripe webhooks
    5. POST /accounts/{id}/products - Create a product
    6. GET  /accounts/{id}/products - List products (storefront)
    7. POST /accounts/{id}/checkout - Create checkout session
    8. GET  /checkout/success       - Checkout success page

SETUP:
    Add this router to your FastAPI app:
    
    from routes.stripe_connect_v2_sample import router as stripe_sample_router
    app.include_router(stripe_sample_router, prefix="/api/stripe-connect-sample")

===============================================================================
"""

from fastapi import APIRouter, HTTPException, Request, Query
from fastapi.responses import HTMLResponse, RedirectResponse
from pydantic import BaseModel, EmailStr
from typing import Optional, List
import logging

from services.stripe_connect_v2_sample import (
    get_stripe_connect_v2_service,
    StripeConnectV2Error
)

logger = logging.getLogger(__name__)

# =============================================================================
# ROUTER SETUP
# =============================================================================
router = APIRouter(
    prefix="/stripe-connect-sample",
    tags=["Stripe Connect V2 Sample"]
)


# =============================================================================
# REQUEST/RESPONSE MODELS
# =============================================================================
# These Pydantic models define the structure of API requests and responses.
# They provide automatic validation and documentation.
# =============================================================================

class CreateAccountRequest(BaseModel):
    """
    Request model for creating a connected account.
    
    FIELDS:
        display_name: The name shown on the connected account's dashboard
        contact_email: Email for account communications
        country: ISO 2-letter country code (default: 'us')
    """
    display_name: str
    contact_email: EmailStr
    country: str = "us"


class CreateAccountResponse(BaseModel):
    """Response model for created account"""
    id: str
    display_name: str
    contact_email: str
    country: str
    created_at: str


class AccountStatusResponse(BaseModel):
    """Response model for account status"""
    id: str
    display_name: Optional[str]
    contact_email: Optional[str]
    onboarding_complete: bool
    ready_to_process_payments: bool
    requirements_status: Optional[str]
    card_payments_status: Optional[str]


class OnboardingLinkRequest(BaseModel):
    """
    Request model for generating an onboarding link.
    
    FIELDS:
        return_url: Where to redirect after successful onboarding
        refresh_url: Where to redirect if the link expires
    """
    return_url: str
    refresh_url: str


class OnboardingLinkResponse(BaseModel):
    """Response model for onboarding link"""
    url: str
    account_id: str


class CreateProductRequest(BaseModel):
    """
    Request model for creating a product.
    
    FIELDS:
        name: Product name displayed to customers
        description: Product description
        price_in_cents: Price in smallest currency unit (e.g., 1000 = $10.00)
        currency: ISO currency code (default: 'usd')
    """
    name: str
    description: str
    price_in_cents: int
    currency: str = "usd"


class ProductResponse(BaseModel):
    """Response model for a product"""
    id: str
    name: str
    description: Optional[str]
    price_id: Optional[str]
    price_amount: Optional[int]
    currency: Optional[str]
    account_id: str
    images: Optional[List[str]] = []


class CheckoutRequest(BaseModel):
    """
    Request model for creating a checkout session.
    
    FIELDS:
        product_id: The product being purchased
        price_id: The price ID for the product
        quantity: Number of items to purchase
        success_url: Redirect URL after successful payment
        cancel_url: Redirect URL if customer cancels
    """
    product_id: str
    price_id: str
    quantity: int = 1
    success_url: str
    cancel_url: str


class CheckoutResponse(BaseModel):
    """Response model for checkout session"""
    session_id: str
    url: str
    amount: int
    application_fee: int
    account_id: str


# =============================================================================
# API ENDPOINTS
# =============================================================================

@router.post("/accounts", response_model=CreateAccountResponse)
async def create_connected_account(request: CreateAccountRequest):
    """
    Create a new Stripe Connected Account (V2 API).
    
    =========================================================================
    ENDPOINT: POST /api/stripe-connect-sample/accounts
    =========================================================================
    
    Creates a new connected account that can accept payments.
    After creation, the account must complete onboarding before
    it can process payments.
    
    REQUEST BODY:
        {
            "display_name": "John's Coffee Shop",
            "contact_email": "john@example.com",
            "country": "us"
        }
    
    RESPONSE:
        {
            "id": "acct_xxxxxxxxxxxxx",
            "display_name": "John's Coffee Shop",
            "contact_email": "john@example.com",
            "country": "us",
            "created_at": "2025-01-21T12:00:00Z"
        }
    
    NEXT STEPS:
        1. Store the account ID in your database (map to your user)
        2. Generate an onboarding link for the user
        3. Redirect the user to complete onboarding
    =========================================================================
    """
    try:
        service = get_stripe_connect_v2_service()
        account = await service.create_connected_account(
            display_name=request.display_name,
            contact_email=request.contact_email,
            country=request.country
        )
        return CreateAccountResponse(**account)
    except StripeConnectV2Error as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error creating account: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/accounts/{account_id}/status", response_model=AccountStatusResponse)
async def get_account_status(account_id: str):
    """
    Get the current status of a connected account.
    
    =========================================================================
    ENDPOINT: GET /api/stripe-connect-sample/accounts/{account_id}/status
    =========================================================================
    
    Retrieves the current onboarding and capability status of a connected
    account. Use this to:
    - Check if onboarding is complete
    - Verify the account can process payments
    - Display status to the user
    
    NOTE: For this demo, we always fetch fresh data from Stripe.
    In production, you might cache this and update via webhooks.
    
    RESPONSE:
        {
            "id": "acct_xxxxxxxxxxxxx",
            "display_name": "John's Coffee Shop",
            "onboarding_complete": true,
            "ready_to_process_payments": true,
            "requirements_status": null,
            "card_payments_status": "active"
        }
    
    REQUIREMENTS STATUS VALUES:
        - "currently_due": Action required now
        - "past_due": Overdue (account may be restricted)
        - "eventually_due": Required in the future
        - null: No outstanding requirements
    
    CARD PAYMENTS STATUS VALUES:
        - "active": Can process card payments
        - "inactive": Cannot process payments
        - "pending": Under review
    =========================================================================
    """
    try:
        service = get_stripe_connect_v2_service()
        status = await service.get_account_status(account_id)
        return AccountStatusResponse(**status)
    except StripeConnectV2Error as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error getting account status: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/accounts/{account_id}/onboard", response_model=OnboardingLinkResponse)
async def create_onboarding_link(account_id: str, request: OnboardingLinkRequest):
    """
    Generate an onboarding link for a connected account.
    
    =========================================================================
    ENDPOINT: POST /api/stripe-connect-sample/accounts/{account_id}/onboard
    =========================================================================
    
    Creates a temporary link that redirects the user to Stripe's hosted
    onboarding flow. The user will:
    - Provide business information
    - Verify their identity
    - Set up bank account for payouts
    - Accept Stripe's terms of service
    
    IMPORTANT: Account links expire quickly (usually within minutes)!
    Always generate a fresh link when the user clicks "Onboard".
    
    REQUEST BODY:
        {
            "return_url": "https://yourapp.com/onboarding/complete",
            "refresh_url": "https://yourapp.com/onboarding/refresh"
        }
    
    RESPONSE:
        {
            "url": "https://connect.stripe.com/setup/c/acct_xxx/xxx",
            "account_id": "acct_xxxxxxxxxxxxx"
        }
    
    FLOW:
        1. User clicks "Onboard to collect payments"
        2. Your app calls this endpoint
        3. Redirect user to the returned URL
        4. User completes onboarding on Stripe
        5. User is redirected to return_url
        6. Your app checks account status
    =========================================================================
    """
    try:
        service = get_stripe_connect_v2_service()
        link = await service.create_onboarding_link(
            account_id=account_id,
            return_url=request.return_url,
            refresh_url=request.refresh_url
        )
        return OnboardingLinkResponse(**link)
    except StripeConnectV2Error as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error creating onboarding link: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/webhooks")
async def handle_stripe_webhook(request: Request):
    """
    Handle incoming Stripe webhooks for V2 accounts.
    
    =========================================================================
    ENDPOINT: POST /api/stripe-connect-sample/webhooks
    =========================================================================
    
    Receives and processes webhook events from Stripe.
    V2 accounts use "thin events" which require fetching full event data.
    
    WEBHOOK SETUP:
        1. Go to https://dashboard.stripe.com/webhooks
        2. Click "+ Add destination"
        3. Select "Connected accounts" in "Events from"
        4. Click "Show advanced options"
        5. Select "Thin" payload style
        6. Add event types:
           - v2.core.account[requirements].updated
           - v2.core.account[configuration.merchant].capability_status_updated
           - v2.core.account[configuration.customer].capability_status_updated
        7. Set endpoint URL to: https://yourapp.com/api/stripe-connect-sample/webhooks
        8. Copy signing secret to STRIPE_WEBHOOK_SECRET env var
    
    LOCAL TESTING:
        stripe listen --thin-events \\
            'v2.core.account[requirements].updated,\\
            v2.core.account[configuration.merchant].capability_status_updated' \\
            --forward-thin-to http://localhost:8001/api/stripe-connect-sample/webhooks
    
    RESPONSE:
        Returns 200 OK on success (Stripe expects this to confirm receipt)
    =========================================================================
    """
    try:
        # Get the raw request body
        payload = await request.body()
        
        # Get the Stripe signature header
        signature = request.headers.get("stripe-signature", "")
        
        service = get_stripe_connect_v2_service()
        result = await service.handle_webhook(payload, signature)
        
        logger.info(f"Webhook processed: {result}")
        return {"received": True, **result}
        
    except StripeConnectV2Error as e:
        # Return 400 for signature verification failures
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error processing webhook: {e}")
        # Return 200 anyway to prevent Stripe from retrying
        # Log the error for investigation
        return {"received": True, "error": str(e)}


@router.post("/accounts/{account_id}/products", response_model=ProductResponse)
async def create_product(account_id: str, request: CreateProductRequest):
    """
    Create a product on a connected account.
    
    =========================================================================
    ENDPOINT: POST /api/stripe-connect-sample/accounts/{account_id}/products
    =========================================================================
    
    Creates a new product with a default price on the connected account.
    The product will appear in their Stripe Dashboard and can be
    purchased through checkout sessions.
    
    REQUEST BODY:
        {
            "name": "Artisan Coffee Blend",
            "description": "Premium single-origin coffee beans",
            "price_in_cents": 1999,
            "currency": "usd"
        }
    
    RESPONSE:
        {
            "id": "prod_xxxxxxxxxxxxx",
            "name": "Artisan Coffee Blend",
            "description": "Premium single-origin coffee beans",
            "price_id": "price_xxxxxxxxxxxxx",
            "price_amount": 1999,
            "currency": "usd",
            "account_id": "acct_xxxxxxxxxxxxx"
        }
    
    NOTE: Products are created on the connected account, not your
    platform account. This uses the Stripe-Account header internally.
    =========================================================================
    """
    try:
        service = get_stripe_connect_v2_service()
        product = await service.create_product(
            account_id=account_id,
            name=request.name,
            description=request.description,
            price_in_cents=request.price_in_cents,
            currency=request.currency
        )
        return ProductResponse(**product)
    except StripeConnectV2Error as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error creating product: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/accounts/{account_id}/products", response_model=List[ProductResponse])
async def list_products(account_id: str, limit: int = Query(default=20, le=100)):
    """
    List products from a connected account (Storefront).
    
    =========================================================================
    ENDPOINT: GET /api/stripe-connect-sample/accounts/{account_id}/products
    =========================================================================
    
    Retrieves all active products from a connected account's catalog.
    Use this to display a storefront for customers to browse products.
    
    QUERY PARAMETERS:
        limit: Maximum number of products (default: 20, max: 100)
    
    RESPONSE:
        [
            {
                "id": "prod_xxxxxxxxxxxxx",
                "name": "Artisan Coffee Blend",
                "description": "Premium single-origin coffee beans",
                "price_id": "price_xxxxxxxxxxxxx",
                "price_amount": 1999,
                "currency": "usd",
                "images": ["https://..."],
                "account_id": "acct_xxxxxxxxxxxxx"
            },
            ...
        ]
    
    NOTE: In production, you should use a different identifier in the URL
    (like a username or store slug) instead of the raw Stripe account ID.
    Map that identifier to the account ID in your database.
    =========================================================================
    """
    try:
        service = get_stripe_connect_v2_service()
        products = await service.list_products(account_id, limit)
        return [ProductResponse(**p) for p in products]
    except StripeConnectV2Error as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error listing products: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/accounts/{account_id}/checkout", response_model=CheckoutResponse)
async def create_checkout_session(account_id: str, request: CheckoutRequest):
    """
    Create a Stripe Checkout session for purchasing a product.
    
    =========================================================================
    ENDPOINT: POST /api/stripe-connect-sample/accounts/{account_id}/checkout
    =========================================================================
    
    Creates a checkout session for a direct charge to the connected account.
    Your platform collects an application fee on each transaction.
    
    REQUEST BODY:
        {
            "product_id": "prod_xxxxxxxxxxxxx",
            "price_id": "price_xxxxxxxxxxxxx",
            "quantity": 1,
            "success_url": "https://yourapp.com/checkout/success",
            "cancel_url": "https://yourapp.com/checkout/cancel"
        }
    
    RESPONSE:
        {
            "session_id": "cs_xxxxxxxxxxxxx",
            "url": "https://checkout.stripe.com/pay/cs_xxx...",
            "amount": 1999,
            "application_fee": 100,
            "account_id": "acct_xxxxxxxxxxxxx"
        }
    
    DIRECT CHARGE FLOW:
        1. Customer pays $19.99
        2. Stripe takes ~$0.88 processing fee (2.9% + $0.30)
        3. Your platform takes $1.00 application fee (5%)
        4. Connected account receives ~$18.11
    
    NEXT STEPS:
        Redirect the customer to the returned URL to complete payment.
    =========================================================================
    """
    try:
        service = get_stripe_connect_v2_service()
        session = await service.create_checkout_session(
            account_id=account_id,
            product_id=request.product_id,
            price_id=request.price_id,
            quantity=request.quantity,
            success_url=request.success_url,
            cancel_url=request.cancel_url
        )
        return CheckoutResponse(**session)
    except StripeConnectV2Error as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error creating checkout: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# =============================================================================
# HTML PAGES (Simple UI for Demo)
# =============================================================================
# These endpoints serve simple HTML pages to demonstrate the Connect flow.
# In a real application, you would use your frontend framework (React, etc.)
# =============================================================================

@router.get("/demo", response_class=HTMLResponse)
async def demo_page(request: Request):
    """
    Main demo page showing the Stripe Connect V2 sample integration.
    
    =========================================================================
    ENDPOINT: GET /api/stripe-connect-sample/demo
    =========================================================================
    
    This page provides a UI for testing the Stripe Connect V2 integration:
    - Create a connected account
    - Complete onboarding
    - Create products
    - View storefront
    - Make test purchases
    =========================================================================
    """
    # Get the base URL from the request
    base_url = str(request.base_url).rstrip('/')
    
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Stripe Connect V2 Sample</title>
        <style>
            /* ===============================================================
               STYLING
               ===============================================================
               Clean, simple styling that matches MicLocker's dark theme.
               Uses CSS custom properties for easy theming.
               =============================================================== */
            :root {{
                --bg-primary: #0a0a0a;
                --bg-secondary: #1a1a1a;
                --bg-tertiary: #2d2d2d;
                --text-primary: #ffffff;
                --text-secondary: #a0a0a0;
                --accent: #FFD700;
                --accent-hover: #FFC000;
                --success: #22c55e;
                --error: #ef4444;
                --border: #333333;
            }}
            
            * {{
                box-sizing: border-box;
                margin: 0;
                padding: 0;
            }}
            
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background-color: var(--bg-primary);
                color: var(--text-primary);
                line-height: 1.6;
                min-height: 100vh;
            }}
            
            .container {{
                max-width: 900px;
                margin: 0 auto;
                padding: 40px 20px;
            }}
            
            h1 {{
                color: var(--accent);
                font-size: 2rem;
                margin-bottom: 10px;
            }}
            
            h2 {{
                color: var(--text-primary);
                font-size: 1.25rem;
                margin: 30px 0 15px 0;
                padding-bottom: 10px;
                border-bottom: 1px solid var(--border);
            }}
            
            .subtitle {{
                color: var(--text-secondary);
                margin-bottom: 30px;
            }}
            
            .card {{
                background: var(--bg-secondary);
                border-radius: 12px;
                padding: 25px;
                margin-bottom: 20px;
                border: 1px solid var(--border);
            }}
            
            .form-group {{
                margin-bottom: 15px;
            }}
            
            label {{
                display: block;
                color: var(--text-secondary);
                margin-bottom: 5px;
                font-size: 0.875rem;
            }}
            
            input, select {{
                width: 100%;
                padding: 12px;
                border: 1px solid var(--border);
                border-radius: 8px;
                background: var(--bg-tertiary);
                color: var(--text-primary);
                font-size: 1rem;
            }}
            
            input:focus, select:focus {{
                outline: none;
                border-color: var(--accent);
            }}
            
            button {{
                background: var(--accent);
                color: var(--bg-primary);
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 1rem;
                font-weight: 600;
                cursor: pointer;
                transition: background 0.2s;
            }}
            
            button:hover {{
                background: var(--accent-hover);
            }}
            
            button:disabled {{
                opacity: 0.5;
                cursor: not-allowed;
            }}
            
            .btn-secondary {{
                background: var(--bg-tertiary);
                color: var(--text-primary);
                border: 1px solid var(--border);
            }}
            
            .btn-secondary:hover {{
                background: var(--border);
            }}
            
            .status {{
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 0.875rem;
                font-weight: 500;
            }}
            
            .status-success {{
                background: rgba(34, 197, 94, 0.2);
                color: var(--success);
            }}
            
            .status-pending {{
                background: rgba(255, 215, 0, 0.2);
                color: var(--accent);
            }}
            
            .status-error {{
                background: rgba(239, 68, 68, 0.2);
                color: var(--error);
            }}
            
            .alert {{
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 20px;
            }}
            
            .alert-info {{
                background: rgba(59, 130, 246, 0.2);
                border: 1px solid rgba(59, 130, 246, 0.3);
                color: #93c5fd;
            }}
            
            .alert-success {{
                background: rgba(34, 197, 94, 0.2);
                border: 1px solid rgba(34, 197, 94, 0.3);
                color: #86efac;
            }}
            
            .alert-error {{
                background: rgba(239, 68, 68, 0.2);
                border: 1px solid rgba(239, 68, 68, 0.3);
                color: #fca5a5;
            }}
            
            .hidden {{
                display: none;
            }}
            
            .product-grid {{
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                gap: 20px;
                margin-top: 20px;
            }}
            
            .product-card {{
                background: var(--bg-tertiary);
                border-radius: 12px;
                padding: 20px;
                border: 1px solid var(--border);
            }}
            
            .product-card h3 {{
                color: var(--text-primary);
                margin-bottom: 10px;
            }}
            
            .product-card p {{
                color: var(--text-secondary);
                font-size: 0.875rem;
                margin-bottom: 15px;
            }}
            
            .product-price {{
                color: var(--accent);
                font-size: 1.25rem;
                font-weight: 600;
                margin-bottom: 15px;
            }}
            
            code {{
                background: var(--bg-tertiary);
                padding: 2px 6px;
                border-radius: 4px;
                font-family: monospace;
                font-size: 0.875rem;
            }}
            
            .step-indicator {{
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 20px;
            }}
            
            .step {{
                width: 30px;
                height: 30px;
                border-radius: 50%;
                background: var(--bg-tertiary);
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 600;
                font-size: 0.875rem;
            }}
            
            .step.active {{
                background: var(--accent);
                color: var(--bg-primary);
            }}
            
            .step.completed {{
                background: var(--success);
                color: white;
            }}
            
            .step-line {{
                flex: 1;
                height: 2px;
                background: var(--border);
            }}
            
            .step-line.completed {{
                background: var(--success);
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <!-- Header -->
            <h1>🔗 Stripe Connect V2 Sample</h1>
            <p class="subtitle">
                Complete integration demo with account creation, onboarding, 
                products, and payments.
            </p>
            
            <!-- Step Indicator -->
            <div class="step-indicator">
                <div class="step" id="step1">1</div>
                <div class="step-line" id="line1"></div>
                <div class="step" id="step2">2</div>
                <div class="step-line" id="line2"></div>
                <div class="step" id="step3">3</div>
                <div class="step-line" id="line3"></div>
                <div class="step" id="step4">4</div>
            </div>
            
            <!-- Alert Container -->
            <div id="alertContainer"></div>
            
            <!-- Section 1: Create Account -->
            <div class="card" id="section1">
                <h2>Step 1: Create Connected Account</h2>
                <p style="color: var(--text-secondary); margin-bottom: 20px;">
                    Create a new Stripe Connected Account using the V2 API.
                    This account will be able to accept payments after onboarding.
                </p>
                
                <div class="form-group">
                    <label for="displayName">Business/Display Name</label>
                    <input type="text" id="displayName" placeholder="e.g., John's Coffee Shop" value="Demo Store">
                </div>
                
                <div class="form-group">
                    <label for="contactEmail">Contact Email</label>
                    <input type="email" id="contactEmail" placeholder="e.g., owner@example.com" value="demo@example.com">
                </div>
                
                <div class="form-group">
                    <label for="country">Country</label>
                    <select id="country">
                        <option value="us">United States</option>
                        <option value="gb">United Kingdom</option>
                        <option value="ca">Canada</option>
                        <option value="au">Australia</option>
                    </select>
                </div>
                
                <button onclick="createAccount()" id="createAccountBtn">
                    Create Connected Account
                </button>
            </div>
            
            <!-- Section 2: Account Status & Onboarding -->
            <div class="card hidden" id="section2">
                <h2>Step 2: Complete Onboarding</h2>
                
                <div style="margin-bottom: 20px;">
                    <strong>Account ID:</strong> <code id="accountIdDisplay"></code>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <strong>Status:</strong>
                    <span class="status status-pending" id="accountStatus">
                        Checking...
                    </span>
                </div>
                
                <div id="onboardingSection">
                    <p style="color: var(--text-secondary); margin-bottom: 15px;">
                        The account needs to complete Stripe's hosted onboarding to verify 
                        identity and set up payouts.
                    </p>
                    <button onclick="startOnboarding()" id="onboardBtn">
                        Start Onboarding →
                    </button>
                    <button onclick="refreshStatus()" class="btn-secondary" style="margin-left: 10px;">
                        Refresh Status
                    </button>
                </div>
                
                <div id="onboardingComplete" class="hidden">
                    <div class="alert alert-success">
                        ✅ Onboarding complete! The account can now accept payments.
                    </div>
                </div>
            </div>
            
            <!-- Section 3: Create Products -->
            <div class="card hidden" id="section3">
                <h2>Step 3: Create Products</h2>
                <p style="color: var(--text-secondary); margin-bottom: 20px;">
                    Add products to the connected account's catalog.
                </p>
                
                <div class="form-group">
                    <label for="productName">Product Name</label>
                    <input type="text" id="productName" placeholder="e.g., Premium Coffee" value="Sample Product">
                </div>
                
                <div class="form-group">
                    <label for="productDescription">Description</label>
                    <input type="text" id="productDescription" placeholder="e.g., Freshly roasted beans" value="A great product for testing">
                </div>
                
                <div class="form-group">
                    <label for="productPrice">Price (USD)</label>
                    <input type="number" id="productPrice" placeholder="19.99" value="19.99" step="0.01" min="0.50">
                </div>
                
                <button onclick="createProduct()" id="createProductBtn">
                    Create Product
                </button>
                
                <h3 style="margin-top: 30px; margin-bottom: 15px;">Products</h3>
                <div id="productsList">
                    <p style="color: var(--text-secondary);">No products yet. Create one above!</p>
                </div>
            </div>
            
            <!-- Section 4: Storefront -->
            <div class="card hidden" id="section4">
                <h2>Step 4: Customer Storefront</h2>
                <p style="color: var(--text-secondary); margin-bottom: 20px;">
                    This is how customers would see the connected account's products.
                    Click "Buy Now" to test the checkout flow.
                </p>
                
                <!-- NOTE: In production, use a store slug or username in the URL, not the raw account ID -->
                <div class="alert alert-info">
                    <strong>Note:</strong> In production, you should use a store slug or username 
                    in the URL (e.g., <code>/store/johns-coffee</code>) instead of the raw Stripe 
                    account ID. Map that identifier to the account ID in your database.
                </div>
                
                <div id="storefrontProducts" class="product-grid">
                    <p style="color: var(--text-secondary);">Loading products...</p>
                </div>
            </div>
            
            <!-- Info Footer -->
            <div class="card" style="margin-top: 40px;">
                <h2>📚 API Endpoints Used</h2>
                <ul style="color: var(--text-secondary); margin-left: 20px;">
                    <li><code>POST /api/stripe-connect-sample/accounts</code> - Create account</li>
                    <li><code>GET /api/stripe-connect-sample/accounts/{{id}}/status</code> - Get status</li>
                    <li><code>POST /api/stripe-connect-sample/accounts/{{id}}/onboard</code> - Onboarding link</li>
                    <li><code>POST /api/stripe-connect-sample/accounts/{{id}}/products</code> - Create product</li>
                    <li><code>GET /api/stripe-connect-sample/accounts/{{id}}/products</code> - List products</li>
                    <li><code>POST /api/stripe-connect-sample/accounts/{{id}}/checkout</code> - Checkout</li>
                </ul>
            </div>
        </div>
        
        <script>
            // ===============================================================
            // STATE MANAGEMENT
            // ===============================================================
            // Store the current account ID and products in memory.
            // In a real app, you would store this in your database.
            // ===============================================================
            
            let currentAccountId = null;
            let currentProducts = [];
            const API_BASE = '{base_url}/api/stripe-connect-sample';
            
            // ===============================================================
            // UTILITY FUNCTIONS
            // ===============================================================
            
            function showAlert(message, type = 'info') {{
                const container = document.getElementById('alertContainer');
                const alert = document.createElement('div');
                alert.className = `alert alert-${{type}}`;
                alert.innerHTML = message;
                container.innerHTML = '';
                container.appendChild(alert);
                
                // Auto-hide after 5 seconds
                setTimeout(() => {{
                    alert.remove();
                }}, 5000);
            }}
            
            function updateStep(stepNum) {{
                for (let i = 1; i <= 4; i++) {{
                    const step = document.getElementById(`step${{i}}`);
                    const line = document.getElementById(`line${{i}}`);
                    
                    if (i < stepNum) {{
                        step.className = 'step completed';
                        if (line) line.className = 'step-line completed';
                    }} else if (i === stepNum) {{
                        step.className = 'step active';
                    }} else {{
                        step.className = 'step';
                        if (line) line.className = 'step-line';
                    }}
                }}
            }}
            
            function formatPrice(cents, currency = 'usd') {{
                return new Intl.NumberFormat('en-US', {{
                    style: 'currency',
                    currency: currency.toUpperCase()
                }}).format(cents / 100);
            }}
            
            // ===============================================================
            // STEP 1: CREATE ACCOUNT
            // ===============================================================
            
            async function createAccount() {{
                const btn = document.getElementById('createAccountBtn');
                btn.disabled = true;
                btn.textContent = 'Creating...';
                
                try {{
                    const response = await fetch(`${{API_BASE}}/accounts`, {{
                        method: 'POST',
                        headers: {{ 'Content-Type': 'application/json' }},
                        body: JSON.stringify({{
                            display_name: document.getElementById('displayName').value,
                            contact_email: document.getElementById('contactEmail').value,
                            country: document.getElementById('country').value
                        }})
                    }});
                    
                    if (!response.ok) {{
                        const error = await response.json();
                        throw new Error(error.detail || 'Failed to create account');
                    }}
                    
                    const account = await response.json();
                    currentAccountId = account.id;
                    
                    // Update UI
                    document.getElementById('accountIdDisplay').textContent = account.id;
                    document.getElementById('section2').classList.remove('hidden');
                    updateStep(2);
                    
                    showAlert(`Account created successfully! ID: ${{account.id}}`, 'success');
                    
                    // Check account status
                    await refreshStatus();
                    
                }} catch (error) {{
                    showAlert(`Error: ${{error.message}}`, 'error');
                }} finally {{
                    btn.disabled = false;
                    btn.textContent = 'Create Connected Account';
                }}
            }}
            
            // ===============================================================
            // STEP 2: ONBOARDING
            // ===============================================================
            
            async function refreshStatus() {{
                if (!currentAccountId) return;
                
                try {{
                    const response = await fetch(`${{API_BASE}}/accounts/${{currentAccountId}}/status`);
                    
                    if (!response.ok) {{
                        throw new Error('Failed to fetch status');
                    }}
                    
                    const status = await response.json();
                    const statusEl = document.getElementById('accountStatus');
                    
                    if (status.ready_to_process_payments) {{
                        statusEl.className = 'status status-success';
                        statusEl.textContent = '✓ Ready to accept payments';
                        document.getElementById('onboardingSection').classList.add('hidden');
                        document.getElementById('onboardingComplete').classList.remove('hidden');
                        document.getElementById('section3').classList.remove('hidden');
                        document.getElementById('section4').classList.remove('hidden');
                        updateStep(3);
                        
                        // Load products
                        await loadProducts();
                    }} else if (status.onboarding_complete) {{
                        statusEl.className = 'status status-pending';
                        statusEl.textContent = '⏳ Onboarding complete, awaiting activation';
                    }} else {{
                        statusEl.className = 'status status-pending';
                        statusEl.textContent = '⏳ Onboarding required';
                    }}
                    
                }} catch (error) {{
                    showAlert(`Error refreshing status: ${{error.message}}`, 'error');
                }}
            }}
            
            async function startOnboarding() {{
                if (!currentAccountId) return;
                
                const btn = document.getElementById('onboardBtn');
                btn.disabled = true;
                btn.textContent = 'Generating link...';
                
                try {{
                    const returnUrl = `${{window.location.origin}}${{API_BASE}}/demo`;
                    const refreshUrl = returnUrl;
                    
                    const response = await fetch(`${{API_BASE}}/accounts/${{currentAccountId}}/onboard`, {{
                        method: 'POST',
                        headers: {{ 'Content-Type': 'application/json' }},
                        body: JSON.stringify({{
                            return_url: returnUrl,
                            refresh_url: refreshUrl
                        }})
                    }});
                    
                    if (!response.ok) {{
                        const error = await response.json();
                        throw new Error(error.detail || 'Failed to create onboarding link');
                    }}
                    
                    const link = await response.json();
                    
                    // Redirect to Stripe's onboarding
                    window.location.href = link.url;
                    
                }} catch (error) {{
                    showAlert(`Error: ${{error.message}}`, 'error');
                    btn.disabled = false;
                    btn.textContent = 'Start Onboarding →';
                }}
            }}
            
            // ===============================================================
            // STEP 3: PRODUCTS
            // ===============================================================
            
            async function createProduct() {{
                if (!currentAccountId) return;
                
                const btn = document.getElementById('createProductBtn');
                btn.disabled = true;
                btn.textContent = 'Creating...';
                
                try {{
                    const priceValue = parseFloat(document.getElementById('productPrice').value);
                    const priceInCents = Math.round(priceValue * 100);
                    
                    const response = await fetch(`${{API_BASE}}/accounts/${{currentAccountId}}/products`, {{
                        method: 'POST',
                        headers: {{ 'Content-Type': 'application/json' }},
                        body: JSON.stringify({{
                            name: document.getElementById('productName').value,
                            description: document.getElementById('productDescription').value,
                            price_in_cents: priceInCents,
                            currency: 'usd'
                        }})
                    }});
                    
                    if (!response.ok) {{
                        const error = await response.json();
                        throw new Error(error.detail || 'Failed to create product');
                    }}
                    
                    const product = await response.json();
                    showAlert(`Product "${{product.name}}" created!`, 'success');
                    
                    // Reload products
                    await loadProducts();
                    
                }} catch (error) {{
                    showAlert(`Error: ${{error.message}}`, 'error');
                }} finally {{
                    btn.disabled = false;
                    btn.textContent = 'Create Product';
                }}
            }}
            
            async function loadProducts() {{
                if (!currentAccountId) return;
                
                try {{
                    const response = await fetch(`${{API_BASE}}/accounts/${{currentAccountId}}/products`);
                    
                    if (!response.ok) {{
                        throw new Error('Failed to load products');
                    }}
                    
                    currentProducts = await response.json();
                    
                    // Update products list
                    const listEl = document.getElementById('productsList');
                    const storefrontEl = document.getElementById('storefrontProducts');
                    
                    if (currentProducts.length === 0) {{
                        listEl.innerHTML = '<p style="color: var(--text-secondary);">No products yet. Create one above!</p>';
                        storefrontEl.innerHTML = '<p style="color: var(--text-secondary);">No products available.</p>';
                        return;
                    }}
                    
                    // Products list (seller view)
                    listEl.innerHTML = currentProducts.map(p => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: var(--bg-tertiary); border-radius: 8px; margin-bottom: 10px;">
                            <div>
                                <strong>${{p.name}}</strong>
                                <span style="color: var(--text-secondary); margin-left: 10px;">${{formatPrice(p.price_amount, p.currency)}}</span>
                            </div>
                            <code style="font-size: 0.75rem;">${{p.id}}</code>
                        </div>
                    `).join('');
                    
                    // Storefront (customer view)
                    storefrontEl.innerHTML = currentProducts.map(p => `
                        <div class="product-card">
                            <h3>${{p.name}}</h3>
                            <p>${{p.description || 'No description'}}</p>
                            <div class="product-price">${{formatPrice(p.price_amount, p.currency)}}</div>
                            <button onclick="buyProduct('${{p.id}}', '${{p.price_id}}')">
                                Buy Now
                            </button>
                        </div>
                    `).join('');
                    
                    updateStep(4);
                    
                }} catch (error) {{
                    showAlert(`Error loading products: ${{error.message}}`, 'error');
                }}
            }}
            
            // ===============================================================
            // STEP 4: CHECKOUT
            // ===============================================================
            
            async function buyProduct(productId, priceId) {{
                if (!currentAccountId) return;
                
                try {{
                    const response = await fetch(`${{API_BASE}}/accounts/${{currentAccountId}}/checkout`, {{
                        method: 'POST',
                        headers: {{ 'Content-Type': 'application/json' }},
                        body: JSON.stringify({{
                            product_id: productId,
                            price_id: priceId,
                            quantity: 1,
                            success_url: `${{window.location.origin}}${{API_BASE}}/checkout/success`,
                            cancel_url: `${{window.location.origin}}${{API_BASE}}/demo`
                        }})
                    }});
                    
                    if (!response.ok) {{
                        const error = await response.json();
                        throw new Error(error.detail || 'Failed to create checkout');
                    }}
                    
                    const session = await response.json();
                    
                    // Redirect to Stripe Checkout
                    window.location.href = session.url;
                    
                }} catch (error) {{
                    showAlert(`Error: ${{error.message}}`, 'error');
                }}
            }}
            
            // ===============================================================
            // INITIALIZATION
            // ===============================================================
            
            // Check URL for accountId parameter (after onboarding redirect)
            const urlParams = new URLSearchParams(window.location.search);
            const accountIdFromUrl = urlParams.get('accountId');
            
            if (accountIdFromUrl) {{
                currentAccountId = accountIdFromUrl;
                document.getElementById('accountIdDisplay').textContent = accountIdFromUrl;
                document.getElementById('section2').classList.remove('hidden');
                updateStep(2);
                refreshStatus();
            }}
        </script>
    </body>
    </html>
    """
    
    return HTMLResponse(content=html_content)


@router.get("/checkout/success", response_class=HTMLResponse)
async def checkout_success(session_id: str = Query(default=None)):
    """
    Checkout success page displayed after successful payment.
    
    =========================================================================
    ENDPOINT: GET /api/stripe-connect-sample/checkout/success
    =========================================================================
    
    This page is shown after a customer completes payment.
    The session_id parameter can be used to retrieve payment details.
    =========================================================================
    """
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Successful</title>
        <style>
            :root {{
                --bg-primary: #0a0a0a;
                --text-primary: #ffffff;
                --accent: #FFD700;
                --success: #22c55e;
            }}
            
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background-color: var(--bg-primary);
                color: var(--text-primary);
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
            }}
            
            .container {{
                text-align: center;
                padding: 40px;
            }}
            
            .success-icon {{
                font-size: 5rem;
                margin-bottom: 20px;
            }}
            
            h1 {{
                color: var(--success);
                margin-bottom: 15px;
            }}
            
            p {{
                color: #a0a0a0;
                margin-bottom: 30px;
            }}
            
            code {{
                background: #1a1a1a;
                padding: 5px 10px;
                border-radius: 4px;
                font-size: 0.875rem;
            }}
            
            a {{
                color: var(--accent);
                text-decoration: none;
            }}
            
            a:hover {{
                text-decoration: underline;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="success-icon">✅</div>
            <h1>Payment Successful!</h1>
            <p>Thank you for your purchase. Your order has been confirmed.</p>
            {"<p>Session ID: <code>" + session_id + "</code></p>" if session_id else ""}
            <p>
                <a href="/api/stripe-connect-sample/demo">← Back to Demo</a>
            </p>
        </div>
    </body>
    </html>
    """
    
    return HTMLResponse(content=html_content)
