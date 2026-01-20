"""
Stripe Payment Service for MicLocker Marketplace

Features:
- Stripe Checkout integration
- Hold funds until delivery confirmation
- Seller payouts
- Payment status tracking
"""

import os
import logging
from datetime import datetime
from typing import Optional, Dict, Any
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Import Stripe checkout from emergentintegrations
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, 
    CheckoutSessionResponse, 
    CheckoutStatusResponse, 
    CheckoutSessionRequest
)

class StripePaymentService:
    """Service for handling Stripe payments with fund holding"""
    
    def __init__(self):
        self.api_key = os.environ.get("STRIPE_API_KEY")
        self.publishable_key = os.environ.get("STRIPE_PUBLISHABLE_KEY")
        self.webhook_url = None
        self._stripe_checkout = None
        
        if not self.api_key:
            logger.warning("STRIPE_API_KEY not set - payments will not work")
    
    def initialize(self, base_url: str):
        """Initialize Stripe checkout with webhook URL"""
        if not self.api_key:
            return False
        
        self.webhook_url = f"{base_url}/api/webhook/stripe"
        self._stripe_checkout = StripeCheckout(
            api_key=self.api_key,
            webhook_url=self.webhook_url
        )
        logger.info(f"Stripe initialized with webhook: {self.webhook_url}")
        return True
    
    async def create_checkout_session(
        self,
        amount: float,
        order_id: str,
        buyer_id: str,
        seller_id: str,
        listing_title: str,
        success_url: str,
        cancel_url: str,
        metadata: Optional[Dict[str, str]] = None
    ) -> Optional[CheckoutSessionResponse]:
        """
        Create a Stripe checkout session for an order
        
        The funds will be held until delivery is confirmed
        """
        if not self._stripe_checkout:
            logger.error("Stripe not initialized")
            return None
        
        # Build metadata for tracking
        checkout_metadata = {
            "order_id": order_id,
            "buyer_id": buyer_id,
            "seller_id": seller_id,
            "listing_title": listing_title[:100],  # Stripe metadata limit
            "funds_status": "pending",  # Will be "held" after payment, "released" after delivery
            "source": "miclocker_marketplace"
        }
        
        if metadata:
            checkout_metadata.update(metadata)
        
        try:
            request = CheckoutSessionRequest(
                amount=float(amount),
                currency="usd",
                success_url=success_url,
                cancel_url=cancel_url,
                metadata=checkout_metadata,
                payment_methods=["card"]
            )
            
            session = await self._stripe_checkout.create_checkout_session(request)
            logger.info(f"Created checkout session {session.session_id} for order {order_id}")
            return session
            
        except Exception as e:
            logger.error(f"Error creating checkout session: {e}")
            return None
    
    async def get_checkout_status(self, session_id: str) -> Optional[CheckoutStatusResponse]:
        """Get the status of a checkout session"""
        if not self._stripe_checkout:
            return None
        
        try:
            status = await self._stripe_checkout.get_checkout_status(session_id)
            return status
        except Exception as e:
            logger.error(f"Error getting checkout status: {e}")
            return None
    
    async def handle_webhook(self, body: bytes, signature: str) -> Optional[Dict[str, Any]]:
        """Handle Stripe webhook events"""
        if not self._stripe_checkout:
            return None
        
        try:
            response = await self._stripe_checkout.handle_webhook(body, signature)
            return response
        except Exception as e:
            logger.error(f"Error handling webhook: {e}")
            return None


# Singleton instance
stripe_service = StripePaymentService()


async def get_stripe_service() -> StripePaymentService:
    """Get the Stripe service instance"""
    return stripe_service
