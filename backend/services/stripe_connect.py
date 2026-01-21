"""
Stripe Connect Service for MicLocker Marketplace

Handles:
- Seller onboarding (Express accounts)
- Fund transfers to sellers
- Payout management
"""

import stripe
import os
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from config import settings

logger = logging.getLogger(__name__)

# Initialize Stripe
stripe.api_key = settings.stripe_api_key


class StripeConnectService:
    """Service for managing Stripe Connect seller accounts and payouts"""
    
    def __init__(self):
        self.api_key = settings.stripe_api_key
        self.webhook_secret = settings.stripe_webhook_secret
        self.frontend_url = settings.frontend_url
        
        if not self.api_key:
            logger.warning("STRIPE_API_KEY not set - Stripe Connect will not work")
    
    async def create_express_account(self, seller_email: str, seller_id: str) -> Optional[Dict[str, Any]]:
        """
        Create a Stripe Express account for a new seller
        
        Express accounts are the easiest way to onboard sellers - Stripe handles
        all the identity verification, tax forms, and compliance.
        """
        if not self.api_key:
            return None
        
        try:
            account = stripe.Account.create(
                type="express",
                country="US",  # Default to US, can be changed based on seller location
                email=seller_email,
                capabilities={
                    "card_payments": {"requested": True},
                    "transfers": {"requested": True},
                },
                business_type="individual",
                metadata={
                    "seller_id": seller_id,
                    "platform": "miclocker"
                }
            )
            
            logger.info(f"Created Stripe Express account {account.id} for seller {seller_id}")
            return {
                "account_id": account.id,
                "type": account.type,
                "email": account.email,
                "charges_enabled": account.charges_enabled,
                "payouts_enabled": account.payouts_enabled,
                "details_submitted": account.details_submitted
            }
            
        except stripe.error.InvalidRequestError as e:
            if "signed up for Connect" in str(e):
                logger.error(f"Stripe Connect not enabled for this account. Please enable it at https://dashboard.stripe.com/connect/onboarding")
            else:
                logger.error(f"Invalid request error creating Stripe account: {e}")
            return None
        except stripe.error.StripeError as e:
            logger.error(f"Error creating Stripe account: {e}")
            return None
    
    async def create_account_link(self, account_id: str, seller_id: str, origin_url: str = None) -> Optional[str]:
        """
        Create an account link for seller onboarding
        
        This generates a URL that the seller visits to complete their
        Stripe Express account setup (identity verification, bank account, etc.)
        
        Args:
            account_id: Stripe account ID
            seller_id: Internal seller ID
            origin_url: The origin URL for redirects (e.g., from request.headers.get('origin'))
                       Falls back to FRONTEND_URL if not provided
        """
        if not self.api_key:
            return None
        
        try:
            # Use provided origin URL or fall back to configured frontend URL
            base_url = origin_url or self.frontend_url
            if not base_url:
                logger.error("No origin URL or FRONTEND_URL configured for Stripe redirects")
                return None
            
            # Ensure no trailing slash
            base_url = base_url.rstrip('/')
            
            account_link = stripe.AccountLink.create(
                account=account_id,
                refresh_url=f"{base_url}/dashboard?stripe_refresh=true",
                return_url=f"{base_url}/dashboard?stripe_onboarding=complete",
                type="account_onboarding",
            )
            
            logger.info(f"Created account link for {account_id}")
            return account_link.url
            
        except stripe.error.StripeError as e:
            logger.error(f"Error creating account link: {e}")
            return None
    
    async def get_account_status(self, account_id: str) -> Optional[Dict[str, Any]]:
        """Get the status of a connected Stripe account"""
        if not self.api_key:
            return None
        
        try:
            account = stripe.Account.retrieve(account_id)
            
            return {
                "account_id": account.id,
                "charges_enabled": account.charges_enabled,
                "payouts_enabled": account.payouts_enabled,
                "details_submitted": account.details_submitted,
                "requirements": {
                    "currently_due": account.requirements.currently_due if account.requirements else [],
                    "eventually_due": account.requirements.eventually_due if account.requirements else [],
                    "pending_verification": account.requirements.pending_verification if account.requirements else []
                }
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Error retrieving account: {e}")
            return None
    
    async def transfer_funds_to_seller(
        self,
        seller_stripe_account_id: str,
        amount_cents: int,
        order_id: str,
        description: str = "MicLocker sale payout"
    ) -> Optional[Dict[str, Any]]:
        """
        Transfer funds to a seller's connected Stripe account
        
        This creates a transfer from your platform's Stripe balance
        to the seller's connected account.
        
        Args:
            seller_stripe_account_id: The seller's Stripe Connect account ID
            amount_cents: Amount in cents to transfer
            order_id: The order ID for tracking
            description: Description for the transfer
        """
        if not self.api_key:
            return None
        
        try:
            transfer = stripe.Transfer.create(
                amount=amount_cents,
                currency="usd",
                destination=seller_stripe_account_id,
                transfer_group=f"order_{order_id}",
                metadata={
                    "order_id": order_id,
                    "platform": "miclocker"
                },
                description=description
            )
            
            logger.info(f"Created transfer {transfer.id} for ${amount_cents/100:.2f} to {seller_stripe_account_id}")
            return {
                "transfer_id": transfer.id,
                "amount": transfer.amount,
                "currency": transfer.currency,
                "destination": transfer.destination,
                "created": transfer.created
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Error creating transfer: {e}")
            return None
    
    async def create_payout(
        self,
        seller_stripe_account_id: str,
        amount_cents: int
    ) -> Optional[Dict[str, Any]]:
        """
        Create a payout from the seller's Stripe account to their bank
        
        Note: This is usually handled automatically by Stripe based on
        the seller's payout schedule. This method is for manual payouts.
        """
        if not self.api_key:
            return None
        
        try:
            payout = stripe.Payout.create(
                amount=amount_cents,
                currency="usd",
                stripe_account=seller_stripe_account_id
            )
            
            logger.info(f"Created payout {payout.id} for ${amount_cents/100:.2f}")
            return {
                "payout_id": payout.id,
                "amount": payout.amount,
                "status": payout.status,
                "arrival_date": payout.arrival_date
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Error creating payout: {e}")
            return None
    
    async def get_balance(self, account_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Get the balance of the platform or a connected account"""
        if not self.api_key:
            return None
        
        try:
            if account_id:
                balance = stripe.Balance.retrieve(stripe_account=account_id)
            else:
                balance = stripe.Balance.retrieve()
            
            return {
                "available": [{"amount": b.amount, "currency": b.currency} for b in balance.available],
                "pending": [{"amount": b.amount, "currency": b.currency} for b in balance.pending]
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Error retrieving balance: {e}")
            return None
    
    def verify_webhook_signature(self, payload: bytes, sig_header: str) -> Optional[stripe.Event]:
        """Verify and construct a Stripe webhook event"""
        if not self.webhook_secret:
            # In test mode without webhook secret, construct event directly
            try:
                return stripe.Event.construct_from(
                    stripe.util.json.loads(payload),
                    stripe.api_key
                )
            except Exception as e:
                logger.error(f"Error constructing event: {e}")
                return None
        
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, self.webhook_secret
            )
            return event
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"Webhook signature verification failed: {e}")
            return None


# Singleton instance
stripe_connect_service = StripeConnectService()


def get_stripe_connect_service() -> StripeConnectService:
    """Get the Stripe Connect service instance"""
    return stripe_connect_service
