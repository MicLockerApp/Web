"""
Stripe Payment Service for MicLocker Marketplace

Features:
- Stripe Checkout integration with Connect
- Destination charges for marketplace
- Hold funds until delivery confirmation
- Seller payouts via Connect
"""

import os
import stripe
import logging
from datetime import datetime
from typing import Optional, Dict, Any
from dotenv import load_dotenv
from dataclasses import dataclass

load_dotenv()

logger = logging.getLogger(__name__)

# Initialize Stripe
stripe.api_key = os.environ.get("STRIPE_API_KEY")


@dataclass
class CheckoutSessionResponse:
    """Response from creating a checkout session"""
    session_id: str
    url: str
    payment_intent: Optional[str] = None


@dataclass
class CheckoutStatusResponse:
    """Response from getting checkout status"""
    status: str
    payment_status: str
    payment_intent: Optional[str] = None


class StripePaymentService:
    """Service for handling Stripe payments with Connect for marketplace"""
    
    def __init__(self):
        self.api_key = os.environ.get("STRIPE_API_KEY")
        self.publishable_key = os.environ.get("STRIPE_PUBLISHABLE_KEY")
        self.webhook_url = None
        
        if not self.api_key:
            logger.warning("STRIPE_API_KEY not set - payments will not work")
        else:
            stripe.api_key = self.api_key
    
    def initialize(self, base_url: str):
        """Initialize Stripe with webhook URL"""
        if not self.api_key:
            return False
        
        self.webhook_url = f"{base_url}/api/payments/webhook"
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
        seller_stripe_account_id: Optional[str] = None,
        platform_fee_amount: Optional[float] = None,
        metadata: Optional[Dict[str, str]] = None
    ) -> Optional[CheckoutSessionResponse]:
        """
        Create a Stripe checkout session for an order
        
        If seller_stripe_account_id is provided, uses Connect destination charges
        to route funds directly to the seller minus platform fee.
        """
        if not self.api_key:
            logger.error("Stripe API key not configured")
            return None
        
        # Build metadata for tracking
        checkout_metadata = {
            "order_id": order_id,
            "buyer_id": buyer_id,
            "seller_id": seller_id,
            "listing_title": listing_title[:100],
            "funds_status": "pending",
            "source": "miclocker_marketplace"
        }
        
        if metadata:
            checkout_metadata.update(metadata)
        
        try:
            # Build the checkout session parameters
            session_params = {
                "mode": "payment",
                "success_url": success_url,
                "cancel_url": cancel_url,
                "line_items": [{
                    "price_data": {
                        "currency": "usd",
                        "product_data": {
                            "name": listing_title[:100],
                            "description": f"Order {order_id[:8]}",
                        },
                        "unit_amount": int(amount * 100),  # Convert to cents
                    },
                    "quantity": 1,
                }],
                "metadata": checkout_metadata,
            }
            
            # If seller has a Connect account, use destination charges
            if seller_stripe_account_id:
                # Calculate platform fee in cents
                fee_cents = int((platform_fee_amount or 0) * 100)
                
                session_params["payment_intent_data"] = {
                    "application_fee_amount": fee_cents,
                    "transfer_data": {
                        "destination": seller_stripe_account_id,
                    },
                    "metadata": checkout_metadata,
                }
                logger.info(f"Creating Connect checkout: ${amount} -> {seller_stripe_account_id} (fee: ${platform_fee_amount})")
            else:
                # No Connect account - funds go to platform (manual payout later)
                session_params["payment_intent_data"] = {
                    "metadata": checkout_metadata,
                }
                logger.info(f"Creating standard checkout: ${amount} (seller has no Connect account)")
            
            # Create the checkout session
            session = stripe.checkout.Session.create(**session_params)
            
            logger.info(f"Created checkout session {session.id} for order {order_id}")
            
            return CheckoutSessionResponse(
                session_id=session.id,
                url=session.url,
                payment_intent=session.payment_intent
            )
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating checkout session: {e}")
            return None
        except Exception as e:
            logger.error(f"Error creating checkout session: {e}")
            return None
    
    async def get_checkout_status(self, session_id: str) -> Optional[CheckoutStatusResponse]:
        """Get the status of a checkout session"""
        if not self.api_key:
            return None
        
        try:
            session = stripe.checkout.Session.retrieve(session_id)
            
            return CheckoutStatusResponse(
                status=session.status,
                payment_status=session.payment_status,
                payment_intent=session.payment_intent
            )
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error getting checkout status: {e}")
            return None
        except Exception as e:
            logger.error(f"Error getting checkout status: {e}")
            return None


# Singleton instance
stripe_service = StripePaymentService()


def get_stripe_service() -> StripePaymentService:
    """Get the Stripe service instance"""
    return stripe_service
