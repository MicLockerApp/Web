"""
===============================================================================
STRIPE CONNECT V2 SAMPLE INTEGRATION
===============================================================================

This is a comprehensive sample implementation of Stripe Connect using the V2 API.
It demonstrates:
    1. Creating Connected Accounts (V2 API)
    2. Onboarding Connected Accounts via Account Links
    3. Handling Webhooks for account requirement changes (thin events)
    4. Creating Products on connected accounts
    5. Displaying a storefront for customers
    6. Processing Direct Charges with application fees

IMPORTANT: This sample uses Stripe Connect V2 accounts, which provide:
    - Full dashboard access for connected accounts
    - Stripe handles fees collection and loss liability
    - Card payment capabilities

PREREQUISITES:
    1. Stripe account with Connect enabled
    2. STRIPE_API_KEY environment variable set
    3. STRIPE_WEBHOOK_SECRET for webhook signature verification
    4. For local testing: Use Stripe CLI to forward webhooks

STRIPE CLI WEBHOOK FORWARDING:
    stripe listen --thin-events \\
        'v2.core.account[requirements].updated,\\
        v2.core.account[configuration.merchant].capability_status_updated,\\
        v2.core.account[configuration.customer].capability_status_updated' \\
        --forward-thin-to http://localhost:8001/api/stripe-connect-sample/webhooks

===============================================================================
"""

import os
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime

# =============================================================================
# STRIPE CLIENT INITIALIZATION
# =============================================================================
# We use the StripeClient class for all API requests as per best practices.
# This provides a consistent interface and better type support.
# =============================================================================

try:
    from stripe import StripeClient
    import stripe
except ImportError:
    raise ImportError(
        "Stripe SDK not installed. Install with: pip install stripe>=13.0.0"
    )

logger = logging.getLogger(__name__)


class StripeConnectV2Error(Exception):
    """Custom exception for Stripe Connect V2 operations"""
    pass


class StripeConnectV2Service:
    """
    ===============================================================================
    STRIPE CONNECT V2 SERVICE
    ===============================================================================
    
    This service handles all Stripe Connect V2 operations including:
    - Account creation and management
    - Onboarding flow
    - Product management on connected accounts
    - Checkout session creation for direct charges
    
    USAGE:
        service = StripeConnectV2Service()
        
        # Create a connected account
        account = await service.create_connected_account(
            display_name="John's Store",
            contact_email="john@example.com"
        )
        
        # Generate onboarding link
        link = await service.create_onboarding_link(
            account_id=account['id'],
            return_url="https://yourapp.com/onboarding/complete",
            refresh_url="https://yourapp.com/onboarding/refresh"
        )
    ===============================================================================
    """
    
    def __init__(self):
        """
        Initialize the Stripe Connect V2 service.
        
        CONFIGURATION:
            Set the STRIPE_API_KEY environment variable with your Stripe secret key.
            For testing, use a test mode key (sk_test_...).
            For production, use a live mode key (sk_live_...).
        
        IMPORTANT:
            Never hardcode API keys in your source code!
            Always use environment variables or a secure secrets manager.
        """
        # =====================================================================
        # PLACEHOLDER: STRIPE API KEY
        # =====================================================================
        # The Stripe API key is required for all API operations.
        # Get your API key from: https://dashboard.stripe.com/apikeys
        # =====================================================================
        self.api_key = os.getenv("STRIPE_API_KEY")
        
        if not self.api_key:
            logger.error(
                "=" * 70 + "\n"
                "STRIPE_API_KEY ENVIRONMENT VARIABLE NOT SET!\n"
                "=" * 70 + "\n"
                "To fix this:\n"
                "1. Go to https://dashboard.stripe.com/apikeys\n"
                "2. Copy your Secret key (starts with sk_test_ or sk_live_)\n"
                "3. Set the environment variable:\n"
                "   - Linux/Mac: export STRIPE_API_KEY='sk_test_your_key_here'\n"
                "   - Windows: set STRIPE_API_KEY=sk_test_your_key_here\n"
                "   - .env file: STRIPE_API_KEY=sk_test_your_key_here\n"
                "=" * 70
            )
            raise StripeConnectV2Error(
                "STRIPE_API_KEY not configured. Check logs for setup instructions."
            )
        
        # =====================================================================
        # CREATE THE STRIPE CLIENT
        # =====================================================================
        # The StripeClient is the recommended way to interact with Stripe APIs.
        # It automatically handles:
        #   - API versioning (uses 2025-12-15.clover by default)
        #   - Request signing
        #   - Error handling and retries
        # =====================================================================
        self.stripe_client = StripeClient(self.api_key)
        
        # =====================================================================
        # PLACEHOLDER: WEBHOOK SECRET
        # =====================================================================
        # The webhook secret is used to verify that webhook events are
        # genuinely from Stripe and haven't been tampered with.
        # Get it from: https://dashboard.stripe.com/webhooks
        # =====================================================================
        self.webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
        
        if not self.webhook_secret:
            logger.warning(
                "=" * 70 + "\n"
                "STRIPE_WEBHOOK_SECRET NOT SET (Optional but recommended)\n"
                "=" * 70 + "\n"
                "Webhooks will work but signature verification is disabled.\n"
                "To enable signature verification:\n"
                "1. Go to https://dashboard.stripe.com/webhooks\n"
                "2. Create or select your webhook endpoint\n"
                "3. Copy the 'Signing secret' (starts with whsec_)\n"
                "4. Set: STRIPE_WEBHOOK_SECRET=whsec_your_secret_here\n"
                "=" * 70
            )
        
        # =====================================================================
        # PLACEHOLDER: APPLICATION FEE PERCENTAGE
        # =====================================================================
        # This is the percentage you take as a platform fee on each transaction.
        # For example, 0.05 = 5% fee on each payment.
        # Adjust this based on your business model.
        # =====================================================================
        self.application_fee_percent = float(
            os.getenv("STRIPE_APPLICATION_FEE_PERCENT", "0.05")
        )
        
        logger.info(
            f"Stripe Connect V2 Service initialized. "
            f"Application fee: {self.application_fee_percent * 100}%"
        )
    
    # =========================================================================
    # SECTION 1: CONNECTED ACCOUNT CREATION (V2 API)
    # =========================================================================
    
    async def create_connected_account(
        self,
        display_name: str,
        contact_email: str,
        country: str = "us"
    ) -> Dict[str, Any]:
        """
        Create a new Connected Account using the Stripe V2 API.
        
        =========================================================================
        V2 ACCOUNT CREATION
        =========================================================================
        
        The V2 API provides a simplified way to create connected accounts with:
        - Full Stripe Dashboard access for the connected account
        - Stripe handles fees collection and loss liability
        - Card payment capabilities pre-configured
        
        IMPORTANT:
            Do NOT use type: 'express', 'standard', or 'custom' at the top level!
            The V2 API uses a different account structure.
        
        PARAMETERS:
            display_name: The name shown on the connected account's dashboard
            contact_email: Email for account communications
            country: ISO country code (default: 'us')
        
        RETURNS:
            Dictionary containing the created account details including:
            - id: The account ID (acct_xxx format)
            - display_name: The account's display name
            - configuration: Account capabilities and settings
        
        EXAMPLE:
            account = await service.create_connected_account(
                display_name="Coffee Shop",
                contact_email="shop@example.com",
                country="us"
            )
            print(f"Created account: {account['id']}")
        =========================================================================
        """
        try:
            logger.info(f"Creating V2 connected account for: {display_name}")
            
            # =================================================================
            # V2 ACCOUNT CREATION PARAMETERS
            # =================================================================
            # These parameters configure the connected account:
            #
            # - display_name: Shown in the Stripe Dashboard
            # - contact_email: For account-related communications
            # - identity.country: The country where the business operates
            # - dashboard: 'full' gives access to the complete Stripe Dashboard
            # - defaults.responsibilities: Who handles fees and losses
            #   - fees_collector: 'stripe' = Stripe collects fees
            #   - losses_collector: 'stripe' = Stripe handles disputes/chargebacks
            # - configuration.merchant.capabilities: Payment capabilities to enable
            # =================================================================
            
            account = self.stripe_client.v2.core.accounts.create(
                params={
                    # Display name shown in Stripe Dashboard
                    "display_name": display_name,
                    
                    # Contact email for account communications
                    "contact_email": contact_email,
                    
                    # Identity information - required for compliance
                    "identity": {
                        "country": country.lower(),
                    },
                    
                    # Dashboard access level
                    # 'full' = Complete Stripe Dashboard access
                    # This allows the connected account to manage their own settings
                    "dashboard": "full",
                    
                    # Default settings for the account
                    "defaults": {
                        "responsibilities": {
                            # Stripe collects platform fees automatically
                            "fees_collector": "stripe",
                            # Stripe handles dispute losses (chargebacks)
                            "losses_collector": "stripe",
                        },
                    },
                    
                    # Account configuration
                    "configuration": {
                        # Customer configuration (enables customer-facing features)
                        "customer": {},
                        
                        # Merchant configuration with payment capabilities
                        "merchant": {
                            "capabilities": {
                                # Enable card payment processing
                                "card_payments": {
                                    "requested": True,
                                },
                            },
                        },
                    },
                }
            )
            
            logger.info(f"Created V2 connected account: {account.id}")
            
            # Return a dictionary representation of the account
            return {
                "id": account.id,
                "display_name": display_name,
                "contact_email": contact_email,
                "country": country,
                "created_at": datetime.utcnow().isoformat(),
            }
            
        except stripe.StripeError as e:
            logger.error(f"Stripe error creating account: {e}")
            raise StripeConnectV2Error(f"Failed to create connected account: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error creating account: {e}")
            raise StripeConnectV2Error(f"Unexpected error: {str(e)}")
    
    # =========================================================================
    # SECTION 2: ACCOUNT ONBOARDING
    # =========================================================================
    
    async def create_onboarding_link(
        self,
        account_id: str,
        return_url: str,
        refresh_url: str
    ) -> Dict[str, Any]:
        """
        Create an Account Link for onboarding a connected account.
        
        =========================================================================
        ACCOUNT ONBOARDING FLOW
        =========================================================================
        
        The onboarding flow allows connected accounts to:
        1. Provide business information
        2. Verify identity
        3. Set up bank account for payouts
        4. Accept Stripe's terms of service
        
        HOW IT WORKS:
        1. Your platform creates an account link
        2. Redirect the user to the link URL
        3. User completes onboarding on Stripe's hosted pages
        4. User is redirected back to your return_url
        5. Check account status to see if onboarding is complete
        
        PARAMETERS:
            account_id: The connected account ID (acct_xxx)
            return_url: Where to redirect after successful onboarding
                        Include the account_id for easy status checking
            refresh_url: Where to redirect if the link expires
                         Generate a new link from this page
        
        RETURNS:
            Dictionary with:
            - url: The onboarding URL to redirect the user to
            - expires_at: When the link expires (links are temporary!)
        
        IMPORTANT:
            Account links expire quickly (usually within minutes)!
            Always generate a fresh link when the user wants to onboard.
        =========================================================================
        """
        try:
            logger.info(f"Creating onboarding link for account: {account_id}")
            
            # =================================================================
            # V2 ACCOUNT LINK CREATION
            # =================================================================
            # The account link redirects the user to Stripe's hosted onboarding.
            #
            # use_case.type: 'account_onboarding' for initial setup
            # configurations: Which features to onboard for
            #   - 'merchant': Payment processing capabilities
            #   - 'customer': Customer management features
            # return_url: Success redirect (include account_id for easy lookup)
            # refresh_url: Redirect if link expires (generate new link here)
            # =================================================================
            
            account_link = self.stripe_client.v2.core.account_links.create(
                params={
                    # The connected account to onboard
                    "account": account_id,
                    
                    # Onboarding use case configuration
                    "use_case": {
                        "type": "account_onboarding",
                        "account_onboarding": {
                            # Configure both merchant and customer capabilities
                            "configurations": ["merchant", "customer"],
                            
                            # URL to redirect after successful onboarding
                            # TIP: Include the account_id to easily check status
                            "return_url": f"{return_url}?accountId={account_id}",
                            
                            # URL to redirect if the link expires
                            # This page should generate a new onboarding link
                            "refresh_url": f"{refresh_url}?accountId={account_id}",
                        },
                    },
                }
            )
            
            logger.info(f"Created onboarding link for account: {account_id}")
            
            return {
                "url": account_link.url,
                "account_id": account_id,
            }
            
        except stripe.StripeError as e:
            logger.error(f"Stripe error creating onboarding link: {e}")
            raise StripeConnectV2Error(f"Failed to create onboarding link: {str(e)}")
    
    async def get_account_status(self, account_id: str) -> Dict[str, Any]:
        """
        Get the current status of a connected account.
        
        =========================================================================
        CHECKING ACCOUNT STATUS
        =========================================================================
        
        This method retrieves the current state of a connected account including:
        - Whether onboarding is complete
        - If the account can process payments
        - Any pending requirements
        
        IMPORTANT:
            For this demo, we always fetch fresh data from the API.
            In production, you might cache this and update via webhooks.
        
        PARAMETERS:
            account_id: The connected account ID (acct_xxx)
        
        RETURNS:
            Dictionary with:
            - id: Account ID
            - display_name: Account's display name
            - onboarding_complete: Boolean - is onboarding finished?
            - ready_to_process_payments: Boolean - can accept payments?
            - requirements_status: Current requirements state
            - card_payments_status: Status of card payment capability
        
        REQUIREMENT STATUSES:
            - 'currently_due': Action required now
            - 'past_due': Overdue requirements (account may be restricted)
            - 'eventually_due': Required in the future
            - None: No outstanding requirements
        =========================================================================
        """
        try:
            logger.info(f"Fetching account status for: {account_id}")
            
            # =================================================================
            # RETRIEVE ACCOUNT WITH EXPANDED FIELDS
            # =================================================================
            # We include additional fields to get full capability information:
            # - configuration.merchant: Payment capability details
            # - requirements: Outstanding verification requirements
            # =================================================================
            
            account = self.stripe_client.v2.core.accounts.retrieve(
                id=account_id,
                params={
                    "include": ["configuration.merchant", "requirements"],
                }
            )
            
            # =================================================================
            # PARSE ACCOUNT STATUS
            # =================================================================
            # Check if the account is ready to process payments by examining:
            # 1. Card payments capability status (must be 'active')
            # 2. Requirements status (should not be 'currently_due' or 'past_due')
            # =================================================================
            
            # Check card payments capability status
            card_payments_status = None
            ready_to_process_payments = False
            
            if (account.configuration and 
                account.configuration.merchant and 
                account.configuration.merchant.capabilities and
                account.configuration.merchant.capabilities.card_payments):
                card_payments_status = account.configuration.merchant.capabilities.card_payments.status
                ready_to_process_payments = card_payments_status == "active"
            
            # Check requirements status
            requirements_status = None
            onboarding_complete = True  # Assume complete unless we find otherwise
            
            if (account.requirements and 
                account.requirements.summary and 
                account.requirements.summary.minimum_deadline):
                requirements_status = account.requirements.summary.minimum_deadline.status
                # Onboarding is NOT complete if there are current or past due requirements
                if requirements_status in ["currently_due", "past_due"]:
                    onboarding_complete = False
            
            logger.info(
                f"Account {account_id} status: "
                f"onboarding_complete={onboarding_complete}, "
                f"ready_to_process={ready_to_process_payments}"
            )
            
            return {
                "id": account_id,
                "display_name": getattr(account, 'display_name', None),
                "contact_email": getattr(account, 'contact_email', None),
                "onboarding_complete": onboarding_complete,
                "ready_to_process_payments": ready_to_process_payments,
                "requirements_status": requirements_status,
                "card_payments_status": card_payments_status,
            }
            
        except stripe.StripeError as e:
            logger.error(f"Stripe error fetching account status: {e}")
            raise StripeConnectV2Error(f"Failed to get account status: {str(e)}")
    
    # =========================================================================
    # SECTION 3: WEBHOOK HANDLING (THIN EVENTS)
    # =========================================================================
    
    async def handle_webhook(
        self,
        payload: bytes,
        signature: str
    ) -> Dict[str, Any]:
        """
        Handle incoming Stripe webhooks for V2 accounts (thin events).
        
        =========================================================================
        WEBHOOK HANDLING FOR V2 ACCOUNTS
        =========================================================================
        
        Stripe V2 accounts use "thin events" which contain minimal data.
        You must fetch the full event data after receiving the notification.
        
        THIN EVENT FLOW:
        1. Receive thin event notification from Stripe
        2. Parse and verify the event signature
        3. Fetch the full event data using the event ID
        4. Process the event based on its type
        
        IMPORTANT EVENT TYPES FOR CONNECT:
        - v2.core.account[requirements].updated
            Triggered when account requirements change
            Action: Check if new requirements need to be collected
        
        - v2.core.account[configuration.merchant].capability_status_updated
            Triggered when payment capabilities change
            Action: Update your records, notify the connected account
        
        - v2.core.account[configuration.customer].capability_status_updated
            Triggered when customer-facing capabilities change
            Action: Update your records if you use customer features
        
        SETTING UP WEBHOOKS:
        1. Go to https://dashboard.stripe.com/webhooks
        2. Click "+ Add destination"
        3. Select "Connected accounts" in "Events from" section
        4. Click "Show advanced options"
        5. Select "Thin" payload style
        6. Search for "v2" and select the event types listed above
        7. Set your endpoint URL
        8. Copy the signing secret to STRIPE_WEBHOOK_SECRET
        
        LOCAL TESTING WITH STRIPE CLI:
            stripe listen --thin-events \\
                'v2.core.account[requirements].updated,\\
                v2.core.account[configuration.merchant].capability_status_updated' \\
                --forward-thin-to http://localhost:8001/api/stripe-connect-sample/webhooks
        =========================================================================
        """
        try:
            # =================================================================
            # STEP 1: PARSE AND VERIFY THE THIN EVENT
            # =================================================================
            # Thin events contain minimal data and must be verified
            # using the webhook signature before processing.
            # =================================================================
            
            if self.webhook_secret:
                # Verify the event signature for security
                thin_event = self.stripe_client.parse_thin_event(
                    payload=payload,
                    sig_header=signature,
                    secret=self.webhook_secret
                )
            else:
                # WARNING: Without signature verification, events could be spoofed!
                logger.warning("Processing webhook without signature verification!")
                import json
                thin_event_data = json.loads(payload)
                # Create a minimal thin event object
                class ThinEvent:
                    def __init__(self, data):
                        self.id = data.get('id')
                        self.type = data.get('type')
                thin_event = ThinEvent(thin_event_data)
            
            logger.info(f"Received thin event: {thin_event.type} (ID: {thin_event.id})")
            
            # =================================================================
            # STEP 2: FETCH THE FULL EVENT DATA
            # =================================================================
            # Thin events only contain the event ID and type.
            # We need to fetch the full event to get the actual data.
            # =================================================================
            
            full_event = self.stripe_client.v2.core.events.retrieve(thin_event.id)
            
            logger.info(f"Retrieved full event data for: {thin_event.type}")
            
            # =================================================================
            # STEP 3: HANDLE THE EVENT BASED ON TYPE
            # =================================================================
            # Route the event to the appropriate handler.
            # Add more handlers as needed for your use case.
            # =================================================================
            
            result = {
                "event_id": thin_event.id,
                "event_type": thin_event.type,
                "handled": False,
                "action_taken": None,
            }
            
            if thin_event.type == "v2.core.account[requirements].updated":
                # =============================================================
                # REQUIREMENTS UPDATED
                # =============================================================
                # Account requirements have changed. This could mean:
                # - New requirements have been added
                # - Requirements have been satisfied
                # - Requirements are now past due
                #
                # ACTION: Check the new requirements and notify the user
                # =============================================================
                result["handled"] = True
                result["action_taken"] = "requirements_updated"
                
                # Extract account ID from the event
                # The exact structure depends on the event data
                account_id = getattr(full_event, 'account', None)
                if account_id:
                    result["account_id"] = account_id
                    logger.info(f"Requirements updated for account: {account_id}")
                    
                    # In production: Fetch new requirements and notify user
                    # account_status = await self.get_account_status(account_id)
                    # await notify_user_of_requirements(account_status)
            
            elif "capability_status_updated" in thin_event.type:
                # =============================================================
                # CAPABILITY STATUS CHANGED
                # =============================================================
                # A payment capability status has changed. Could be:
                # - 'active': Capability is now active
                # - 'inactive': Capability has been disabled
                # - 'pending': Capability is being reviewed
                #
                # ACTION: Update your records and potentially notify the user
                # =============================================================
                result["handled"] = True
                result["action_taken"] = "capability_status_changed"
                
                logger.info(f"Capability status changed: {thin_event.type}")
                
                # In production: Update your database and notify user
                # account_id = extract_account_id(full_event)
                # new_status = extract_capability_status(full_event)
                # await update_account_capability_status(account_id, new_status)
            
            else:
                # Unhandled event type
                logger.info(f"Unhandled event type: {thin_event.type}")
                result["action_taken"] = "ignored_unknown_type"
            
            return result
            
        except stripe.SignatureVerificationError as e:
            logger.error(f"Webhook signature verification failed: {e}")
            raise StripeConnectV2Error("Invalid webhook signature")
        except stripe.StripeError as e:
            logger.error(f"Stripe error processing webhook: {e}")
            raise StripeConnectV2Error(f"Failed to process webhook: {str(e)}")
    
    # =========================================================================
    # SECTION 4: PRODUCT MANAGEMENT
    # =========================================================================
    
    async def create_product(
        self,
        account_id: str,
        name: str,
        description: str,
        price_in_cents: int,
        currency: str = "usd"
    ) -> Dict[str, Any]:
        """
        Create a product on a connected account.
        
        =========================================================================
        CREATING PRODUCTS ON CONNECTED ACCOUNTS
        =========================================================================
        
        Products are created on the connected account (not your platform account).
        This uses the 'Stripe-Account' header to operate on behalf of the
        connected account.
        
        IMPORTANT:
            The product and its prices exist on the connected account.
            Your platform account cannot see or modify them directly.
        
        PARAMETERS:
            account_id: The connected account ID (acct_xxx)
            name: Product name (shown to customers)
            description: Product description
            price_in_cents: Price in smallest currency unit (e.g., 1000 = $10.00)
            currency: ISO currency code (default: 'usd')
        
        RETURNS:
            Dictionary with:
            - id: Product ID (prod_xxx)
            - name: Product name
            - description: Product description
            - price_id: Default price ID (price_xxx)
            - price_amount: Price in cents
            - currency: Currency code
        =========================================================================
        """
        try:
            logger.info(f"Creating product '{name}' on account: {account_id}")
            
            # =================================================================
            # CREATE PRODUCT WITH DEFAULT PRICE
            # =================================================================
            # We use the stripeAccount option to create the product on the
            # connected account. This is equivalent to sending the
            # 'Stripe-Account' header with the request.
            #
            # default_price_data creates a price automatically attached
            # to the product, simplifying the setup process.
            # =================================================================
            
            product = self.stripe_client.products.create(
                params={
                    # Product display name
                    "name": name,
                    
                    # Product description (shown on checkout page)
                    "description": description,
                    
                    # Create a default price for this product
                    "default_price_data": {
                        # Price in smallest currency unit (cents for USD)
                        "unit_amount": price_in_cents,
                        
                        # ISO currency code
                        "currency": currency.lower(),
                    },
                },
                # IMPORTANT: This creates the product on the connected account
                options={
                    "stripe_account": account_id,
                }
            )
            
            logger.info(f"Created product {product.id} on account {account_id}")
            
            return {
                "id": product.id,
                "name": product.name,
                "description": product.description,
                "price_id": product.default_price,
                "price_amount": price_in_cents,
                "currency": currency,
                "account_id": account_id,
            }
            
        except stripe.StripeError as e:
            logger.error(f"Stripe error creating product: {e}")
            raise StripeConnectV2Error(f"Failed to create product: {str(e)}")
    
    async def list_products(
        self,
        account_id: str,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        List products from a connected account.
        
        =========================================================================
        LISTING PRODUCTS FROM CONNECTED ACCOUNTS
        =========================================================================
        
        Retrieves all active products from a connected account's catalog.
        Uses the 'Stripe-Account' header to access the connected account's data.
        
        PARAMETERS:
            account_id: The connected account ID (acct_xxx)
            limit: Maximum number of products to return (default: 20)
        
        RETURNS:
            List of product dictionaries, each containing:
            - id: Product ID
            - name: Product name
            - description: Product description
            - price_id: Default price ID
            - price_amount: Price in cents
            - currency: Currency code
            - images: List of product image URLs
        
        NOTE:
            We expand 'data.default_price' to get price information
            in a single API call instead of fetching prices separately.
        =========================================================================
        """
        try:
            logger.info(f"Listing products for account: {account_id}")
            
            # =================================================================
            # LIST PRODUCTS WITH EXPANDED PRICE DATA
            # =================================================================
            # The expand parameter fetches related objects in a single call.
            # Without expansion, default_price would just be an ID string.
            # With expansion, we get the full Price object with amount/currency.
            # =================================================================
            
            products = self.stripe_client.products.list(
                params={
                    # Maximum number of products to return
                    "limit": limit,
                    
                    # Only return active products (not archived)
                    "active": True,
                    
                    # Expand the default_price field to get full price data
                    "expand": ["data.default_price"],
                },
                # IMPORTANT: List products from the connected account
                options={
                    "stripe_account": account_id,
                }
            )
            
            # =================================================================
            # FORMAT THE RESPONSE
            # =================================================================
            # Transform Stripe's response into a clean format for our API.
            # Handle cases where default_price might be None or unexpanded.
            # =================================================================
            
            result = []
            for product in products.data:
                price_data = {}
                
                # Extract price information if available
                if product.default_price:
                    # Check if it's expanded (object) or just an ID (string)
                    if hasattr(product.default_price, 'unit_amount'):
                        price_data = {
                            "price_id": product.default_price.id,
                            "price_amount": product.default_price.unit_amount,
                            "currency": product.default_price.currency,
                        }
                    else:
                        # Just the ID, not expanded
                        price_data = {
                            "price_id": product.default_price,
                            "price_amount": None,
                            "currency": None,
                        }
                
                result.append({
                    "id": product.id,
                    "name": product.name,
                    "description": product.description,
                    "images": product.images or [],
                    "account_id": account_id,
                    **price_data,
                })
            
            logger.info(f"Found {len(result)} products for account {account_id}")
            return result
            
        except stripe.StripeError as e:
            logger.error(f"Stripe error listing products: {e}")
            raise StripeConnectV2Error(f"Failed to list products: {str(e)}")
    
    # =========================================================================
    # SECTION 5: CHECKOUT AND PAYMENTS (DIRECT CHARGES)
    # =========================================================================
    
    async def create_checkout_session(
        self,
        account_id: str,
        product_id: str,
        price_id: str,
        quantity: int,
        success_url: str,
        cancel_url: str
    ) -> Dict[str, Any]:
        """
        Create a Stripe Checkout session for a direct charge.
        
        =========================================================================
        DIRECT CHARGES WITH APPLICATION FEES
        =========================================================================
        
        Direct charges are payments made directly to the connected account.
        Your platform can collect an application fee as revenue.
        
        HOW IT WORKS:
        1. Customer pays $100 to buy a product
        2. Stripe collects a processing fee (e.g., 2.9% + $0.30)
        3. Your platform collects an application fee (e.g., 5% = $5)
        4. Connected account receives the rest (e.g., ~$91.80)
        
        BENEFITS OF DIRECT CHARGES:
        - Payment appears on the connected account's statement
        - Connected account handles disputes/refunds
        - Simplest integration model
        
        PARAMETERS:
            account_id: The connected account receiving the payment
            product_id: The product being purchased
            price_id: The price ID for the product
            quantity: Number of items
            success_url: Redirect URL after successful payment
            cancel_url: Redirect URL if customer cancels
        
        RETURNS:
            Dictionary with:
            - session_id: Checkout session ID
            - url: URL to redirect customer to
        =========================================================================
        """
        try:
            logger.info(
                f"Creating checkout session for product {product_id} "
                f"on account {account_id}"
            )
            
            # =================================================================
            # FETCH PRICE DETAILS FOR FEE CALCULATION
            # =================================================================
            # We need the price amount to calculate the application fee.
            # The fee is a percentage of the transaction amount.
            # =================================================================
            
            price = self.stripe_client.prices.retrieve(
                price_id,
                options={"stripe_account": account_id}
            )
            
            # Calculate application fee
            # Example: 5% of a $10.00 (1000 cents) purchase = 50 cents
            total_amount = price.unit_amount * quantity
            application_fee = int(total_amount * self.application_fee_percent)
            
            logger.info(
                f"Checkout: amount={total_amount}, "
                f"app_fee={application_fee} ({self.application_fee_percent * 100}%)"
            )
            
            # =================================================================
            # CREATE CHECKOUT SESSION
            # =================================================================
            # The checkout session handles the entire payment flow:
            # - Collect payment details
            # - Process the payment
            # - Handle 3D Secure authentication if needed
            # - Redirect to success/cancel URL
            #
            # Using mode='payment' for one-time payments.
            # Use mode='subscription' for recurring payments.
            # =================================================================
            
            session = self.stripe_client.checkout.sessions.create(
                params={
                    # Line items (what the customer is buying)
                    "line_items": [
                        {
                            "price": price_id,
                            "quantity": quantity,
                        },
                    ],
                    
                    # Payment intent data (for the underlying payment)
                    "payment_intent_data": {
                        # APPLICATION FEE
                        # This is how your platform makes money!
                        # The fee is transferred to your platform account
                        # after the payment succeeds.
                        "application_fee_amount": application_fee,
                    },
                    
                    # Payment mode: 'payment' for one-time purchases
                    "mode": "payment",
                    
                    # Redirect URLs
                    # {CHECKOUT_SESSION_ID} is replaced by Stripe with the actual ID
                    "success_url": f"{success_url}?session_id={{CHECKOUT_SESSION_ID}}",
                    "cancel_url": cancel_url,
                },
                # IMPORTANT: Create the session on the connected account
                # This makes it a "direct charge" to the connected account
                options={
                    "stripe_account": account_id,
                }
            )
            
            logger.info(f"Created checkout session: {session.id}")
            
            return {
                "session_id": session.id,
                "url": session.url,
                "amount": total_amount,
                "application_fee": application_fee,
                "account_id": account_id,
            }
            
        except stripe.StripeError as e:
            logger.error(f"Stripe error creating checkout session: {e}")
            raise StripeConnectV2Error(f"Failed to create checkout session: {str(e)}")
    
    async def get_checkout_session(
        self,
        account_id: str,
        session_id: str
    ) -> Dict[str, Any]:
        """
        Retrieve a checkout session to check payment status.
        
        =========================================================================
        CHECKING PAYMENT STATUS
        =========================================================================
        
        After the customer completes checkout, you can verify the payment
        by retrieving the checkout session.
        
        PARAMETERS:
            account_id: The connected account that created the session
            session_id: The checkout session ID
        
        RETURNS:
            Dictionary with:
            - session_id: The session ID
            - status: Session status ('complete', 'expired', 'open')
            - payment_status: Payment status ('paid', 'unpaid', 'no_payment_required')
            - amount_total: Total amount in cents
            - customer_email: Customer's email (if collected)
        =========================================================================
        """
        try:
            session = self.stripe_client.checkout.sessions.retrieve(
                session_id,
                options={"stripe_account": account_id}
            )
            
            return {
                "session_id": session.id,
                "status": session.status,
                "payment_status": session.payment_status,
                "amount_total": session.amount_total,
                "currency": session.currency,
                "customer_email": session.customer_details.email if session.customer_details else None,
            }
            
        except stripe.StripeError as e:
            logger.error(f"Stripe error retrieving session: {e}")
            raise StripeConnectV2Error(f"Failed to retrieve session: {str(e)}")


# =============================================================================
# SINGLETON INSTANCE
# =============================================================================
# Create a singleton instance for easy import across the application.
# Usage: from services.stripe_connect_v2_sample import stripe_connect_v2_service
# =============================================================================

_service_instance = None

def get_stripe_connect_v2_service() -> StripeConnectV2Service:
    """
    Get or create the Stripe Connect V2 service instance.
    
    This implements a lazy singleton pattern - the service is only
    created when first accessed, and the same instance is reused.
    """
    global _service_instance
    if _service_instance is None:
        _service_instance = StripeConnectV2Service()
    return _service_instance
