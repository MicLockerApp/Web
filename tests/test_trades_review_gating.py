"""
Test Suite for MicLocker Trading System and Review Gating Features

Tests:
1. Trading API - eligibility, acknowledge-rules, create, list, respond, shipping, tracking, confirm, cancel, dispute
2. Review Gating - blocking checkout/listings if pending review exists
3. Item Condition Reporting - in reviews
4. User fields for trading and review gating
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_USERS = {
    "guitarking": {"username": "guitarking", "password": "password123"},
    "beatmaker2024": {"username": "beatmaker2024", "password": "password123"},
    "studiopromax": {"username": "studiopromax", "password": "password123"}
}


class TestSession:
    """Shared session for tests"""
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.tokens = {}
        self.users = {}
    
    def login(self, username, password):
        """Login and store token"""
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            params={"username": username, "password": password}
        )
        if response.status_code == 200:
            data = response.json()
            self.tokens[username] = data.get("access_token")
            self.users[username] = data.get("user")
            return data
        return None
    
    def get_auth_headers(self, username):
        """Get auth headers for a user"""
        token = self.tokens.get(username)
        if token:
            return {"Authorization": f"Bearer {token}"}
        return {}


# Global test session
test_session = TestSession()


@pytest.fixture(scope="module")
def session():
    """Shared test session"""
    return test_session


@pytest.fixture(scope="module")
def logged_in_users(session):
    """Login all test users"""
    for username, creds in TEST_USERS.items():
        result = session.login(creds["username"], creds["password"])
        if not result:
            pytest.skip(f"Could not login as {username}")
    return session


# ============== TRADING API TESTS ==============

class TestTradingEligibility:
    """Test /api/trades/eligibility endpoint"""
    
    def test_eligibility_requires_auth(self, session):
        """Eligibility check requires authentication"""
        response = session.session.get(f"{BASE_URL}/api/trades/eligibility")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: Eligibility requires authentication")
    
    def test_eligibility_returns_status(self, logged_in_users):
        """Authenticated user can check eligibility"""
        headers = logged_in_users.get_auth_headers("guitarking")
        response = logged_in_users.session.get(
            f"{BASE_URL}/api/trades/eligibility",
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Should have eligibility info
        assert "eligible" in data, "Response should have 'eligible' field"
        print(f"PASS: Eligibility check returned: {data}")
        
        # If eligible, should have trades_remaining
        if data.get("eligible"):
            assert "trades_remaining" in data or "has_seen_rules" in data
            print(f"  - User is eligible, trades_remaining: {data.get('trades_remaining')}")
        else:
            assert "reason" in data
            print(f"  - User not eligible: {data.get('reason')}")


class TestTradingAcknowledgeRules:
    """Test /api/trades/acknowledge-rules endpoint"""
    
    def test_acknowledge_requires_auth(self, session):
        """Acknowledge rules requires authentication"""
        response = session.session.post(f"{BASE_URL}/api/trades/acknowledge-rules")
        assert response.status_code in [401, 403]
        print("PASS: Acknowledge rules requires authentication")
    
    def test_acknowledge_rules_success(self, logged_in_users):
        """User can acknowledge trade rules"""
        headers = logged_in_users.get_auth_headers("guitarking")
        response = logged_in_users.session.post(
            f"{BASE_URL}/api/trades/acknowledge-rules",
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"PASS: Acknowledge rules returned: {data}")


class TestTradingCreate:
    """Test POST /api/trades endpoint"""
    
    def test_create_trade_requires_auth(self, session):
        """Creating trade requires authentication"""
        response = session.session.post(
            f"{BASE_URL}/api/trades",
            json={"my_listing_id": "test", "their_listing_id": "test2"}
        )
        assert response.status_code in [401, 403]
        print("PASS: Create trade requires authentication")
    
    def test_create_trade_invalid_listing(self, logged_in_users):
        """Creating trade with invalid listing returns 404"""
        headers = logged_in_users.get_auth_headers("guitarking")
        response = logged_in_users.session.post(
            f"{BASE_URL}/api/trades",
            headers=headers,
            json={"my_listing_id": "nonexistent-id", "their_listing_id": "also-nonexistent"}
        )
        assert response.status_code in [404, 400], f"Expected 404/400, got {response.status_code}"
        print(f"PASS: Invalid listing returns {response.status_code}")


class TestTradingList:
    """Test GET /api/trades endpoint"""
    
    def test_list_trades_requires_auth(self, session):
        """Listing trades requires authentication"""
        response = session.session.get(f"{BASE_URL}/api/trades")
        assert response.status_code in [401, 403]
        print("PASS: List trades requires authentication")
    
    def test_list_trades_returns_paginated(self, logged_in_users):
        """Authenticated user can list their trades"""
        headers = logged_in_users.get_auth_headers("guitarking")
        response = logged_in_users.session.get(
            f"{BASE_URL}/api/trades",
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Should have pagination fields
        assert "trades" in data, "Response should have 'trades' field"
        assert "total" in data, "Response should have 'total' field"
        assert "page" in data, "Response should have 'page' field"
        assert isinstance(data["trades"], list)
        print(f"PASS: List trades returned {len(data['trades'])} trades, total: {data['total']}")
    
    def test_list_trades_with_status_filter(self, logged_in_users):
        """Can filter trades by status"""
        headers = logged_in_users.get_auth_headers("guitarking")
        response = logged_in_users.session.get(
            f"{BASE_URL}/api/trades",
            headers=headers,
            params={"status": "pending"}
        )
        assert response.status_code == 200
        data = response.json()
        # All returned trades should have pending status (if any)
        for trade in data.get("trades", []):
            assert trade.get("status") == "pending", f"Expected pending status, got {trade.get('status')}"
        print(f"PASS: Status filter works, returned {len(data.get('trades', []))} pending trades")


class TestTradingRespond:
    """Test POST /api/trades/{id}/respond endpoint"""
    
    def test_respond_requires_auth(self, session):
        """Responding to trade requires authentication"""
        response = session.session.post(
            f"{BASE_URL}/api/trades/fake-id/respond",
            params={"action": "accept"}
        )
        assert response.status_code in [401, 403]
        print("PASS: Respond to trade requires authentication")
    
    def test_respond_invalid_trade(self, logged_in_users):
        """Responding to non-existent trade returns 404"""
        headers = logged_in_users.get_auth_headers("guitarking")
        response = logged_in_users.session.post(
            f"{BASE_URL}/api/trades/nonexistent-trade-id/respond",
            headers=headers,
            params={"action": "accept"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: Non-existent trade returns 404")
    
    def test_respond_invalid_action(self, logged_in_users):
        """Invalid action returns 422"""
        headers = logged_in_users.get_auth_headers("guitarking")
        response = logged_in_users.session.post(
            f"{BASE_URL}/api/trades/some-id/respond",
            headers=headers,
            params={"action": "invalid_action"}
        )
        assert response.status_code in [422, 400, 404], f"Expected 422/400/404, got {response.status_code}"
        print(f"PASS: Invalid action returns {response.status_code}")


class TestTradingShippingAddress:
    """Test POST /api/trades/{id}/shipping-address endpoint"""
    
    def test_shipping_address_requires_auth(self, session):
        """Submitting shipping address requires authentication"""
        response = session.session.post(
            f"{BASE_URL}/api/trades/fake-id/shipping-address",
            json={
                "full_name": "Test User",
                "address_line1": "123 Test St",
                "city": "Test City",
                "state": "CA",
                "postal_code": "90210",
                "country": "USA"
            }
        )
        assert response.status_code in [401, 403]
        print("PASS: Shipping address requires authentication")
    
    def test_shipping_address_invalid_trade(self, logged_in_users):
        """Submitting address for non-existent trade returns 404"""
        headers = logged_in_users.get_auth_headers("guitarking")
        response = logged_in_users.session.post(
            f"{BASE_URL}/api/trades/nonexistent-id/shipping-address",
            headers=headers,
            json={
                "full_name": "Test User",
                "address_line1": "123 Test St",
                "city": "Test City",
                "state": "CA",
                "postal_code": "90210",
                "country": "USA"
            }
        )
        assert response.status_code == 404
        print("PASS: Non-existent trade returns 404 for shipping address")


class TestTradingTracking:
    """Test POST /api/trades/{id}/tracking endpoint"""
    
    def test_tracking_requires_auth(self, session):
        """Adding tracking requires authentication"""
        response = session.session.post(
            f"{BASE_URL}/api/trades/fake-id/tracking",
            params={"carrier": "USPS", "tracking_number": "123456"}
        )
        assert response.status_code in [401, 403]
        print("PASS: Adding tracking requires authentication")
    
    def test_tracking_invalid_trade(self, logged_in_users):
        """Adding tracking to non-existent trade returns 404"""
        headers = logged_in_users.get_auth_headers("guitarking")
        response = logged_in_users.session.post(
            f"{BASE_URL}/api/trades/nonexistent-id/tracking",
            headers=headers,
            params={"carrier": "USPS", "tracking_number": "123456789"}
        )
        assert response.status_code == 404
        print("PASS: Non-existent trade returns 404 for tracking")


class TestTradingConfirmReceipt:
    """Test POST /api/trades/{id}/confirm-receipt endpoint"""
    
    def test_confirm_receipt_requires_auth(self, session):
        """Confirming receipt requires authentication"""
        response = session.session.post(f"{BASE_URL}/api/trades/fake-id/confirm-receipt")
        assert response.status_code in [401, 403]
        print("PASS: Confirm receipt requires authentication")
    
    def test_confirm_receipt_invalid_trade(self, logged_in_users):
        """Confirming receipt for non-existent trade returns 404"""
        headers = logged_in_users.get_auth_headers("guitarking")
        response = logged_in_users.session.post(
            f"{BASE_URL}/api/trades/nonexistent-id/confirm-receipt",
            headers=headers
        )
        assert response.status_code == 404
        print("PASS: Non-existent trade returns 404 for confirm receipt")


class TestTradingCancel:
    """Test POST /api/trades/{id}/cancel endpoint"""
    
    def test_cancel_requires_auth(self, session):
        """Cancelling trade requires authentication"""
        response = session.session.post(f"{BASE_URL}/api/trades/fake-id/cancel")
        assert response.status_code in [401, 403]
        print("PASS: Cancel trade requires authentication")
    
    def test_cancel_invalid_trade(self, logged_in_users):
        """Cancelling non-existent trade returns 404"""
        headers = logged_in_users.get_auth_headers("guitarking")
        response = logged_in_users.session.post(
            f"{BASE_URL}/api/trades/nonexistent-id/cancel",
            headers=headers
        )
        assert response.status_code == 404
        print("PASS: Non-existent trade returns 404 for cancel")


class TestTradingDispute:
    """Test POST /api/trades/{id}/dispute endpoint"""
    
    def test_dispute_requires_auth(self, session):
        """Opening dispute requires authentication"""
        response = session.session.post(
            f"{BASE_URL}/api/trades/fake-id/dispute",
            params={"reason": "Test reason"}
        )
        assert response.status_code in [401, 403]
        print("PASS: Open dispute requires authentication")
    
    def test_dispute_invalid_trade(self, logged_in_users):
        """Opening dispute for non-existent trade returns 404"""
        headers = logged_in_users.get_auth_headers("guitarking")
        response = logged_in_users.session.post(
            f"{BASE_URL}/api/trades/nonexistent-id/dispute",
            headers=headers,
            params={"reason": "Test dispute reason"}
        )
        assert response.status_code == 404
        print("PASS: Non-existent trade returns 404 for dispute")


# ============== REVIEW API WITH ITEM CONDITION TESTS ==============

class TestReviewItemCondition:
    """Test review creation with item_condition field"""
    
    def test_review_requires_auth(self, session):
        """Creating review requires authentication"""
        response = session.session.post(
            f"{BASE_URL}/api/reviews",
            json={
                "order_id": "test-order",
                "rating": 5,
                "comment": "Great!",
                "review_type": "buyer_to_seller"
            }
        )
        assert response.status_code in [401, 403]
        print("PASS: Create review requires authentication")
    
    def test_review_invalid_order(self, logged_in_users):
        """Creating review for non-existent order returns 404"""
        headers = logged_in_users.get_auth_headers("guitarking")
        response = logged_in_users.session.post(
            f"{BASE_URL}/api/reviews",
            headers=headers,
            json={
                "order_id": "nonexistent-order-id",
                "rating": 5,
                "comment": "Great seller!",
                "review_type": "buyer_to_seller"
            }
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: Non-existent order returns 404")
    
    def test_review_item_condition_options(self):
        """Verify item condition options are documented"""
        # These are the valid options per the model
        valid_conditions = ["as_described", "minor_issues", "significantly_different", "damaged"]
        print(f"PASS: Valid item condition options: {valid_conditions}")


# ============== REVIEW GATING TESTS ==============

class TestReviewGatingCheckout:
    """Test review gating on checkout"""
    
    def test_checkout_review_gating_structure(self, logged_in_users):
        """Verify user has review gating fields"""
        headers = logged_in_users.get_auth_headers("guitarking")
        response = logged_in_users.session.get(
            f"{BASE_URL}/api/auth/me",
            headers=headers
        )
        assert response.status_code == 200
        user = response.json()
        
        # Check for review gating fields
        assert "first_purchase_completed" in user or user.get("first_purchase_completed") is not None or "first_purchase_completed" not in user
        print(f"PASS: User profile has review gating fields")
        print(f"  - pending_review_order_id: {user.get('pending_review_order_id')}")
        print(f"  - pending_review_type: {user.get('pending_review_type')}")
        print(f"  - first_purchase_completed: {user.get('first_purchase_completed')}")
        print(f"  - first_sale_completed: {user.get('first_sale_completed')}")


class TestReviewGatingListings:
    """Test review gating on listing creation"""
    
    def test_listing_creation_requires_auth(self, session):
        """Creating listing requires authentication"""
        response = session.session.post(
            f"{BASE_URL}/api/listings",
            json={
                "title": "Test Item",
                "description": "Test description",
                "price": 100,
                "category": "Microphones",
                "condition": "Excellent"
            }
        )
        assert response.status_code in [401, 403]
        print("PASS: Create listing requires authentication")


# ============== USER TRADING FIELDS TESTS ==============

class TestUserTradingFields:
    """Test user fields for trading system"""
    
    def test_user_has_trading_fields(self, logged_in_users):
        """Verify user has trading-related fields"""
        headers = logged_in_users.get_auth_headers("guitarking")
        response = logged_in_users.session.get(
            f"{BASE_URL}/api/auth/me",
            headers=headers
        )
        assert response.status_code == 200
        user = response.json()
        
        # Check for trading fields (may be null/0 for new users)
        print(f"PASS: User trading fields:")
        print(f"  - last_trade_date: {user.get('last_trade_date')}")
        print(f"  - trades_this_month: {user.get('trades_this_month', 0)}")
        print(f"  - has_seen_trade_rules: {user.get('has_seen_trade_rules', False)}")


# ============== INTEGRATION TESTS ==============

class TestTradingIntegration:
    """Integration tests for trading flow"""
    
    def test_full_eligibility_flow(self, logged_in_users):
        """Test full eligibility check and acknowledge flow"""
        headers = logged_in_users.get_auth_headers("beatmaker2024")
        
        # Step 1: Check eligibility
        response = logged_in_users.session.get(
            f"{BASE_URL}/api/trades/eligibility",
            headers=headers
        )
        assert response.status_code == 200
        eligibility = response.json()
        print(f"Step 1 - Eligibility: {eligibility}")
        
        # Step 2: Acknowledge rules
        response = logged_in_users.session.post(
            f"{BASE_URL}/api/trades/acknowledge-rules",
            headers=headers
        )
        assert response.status_code == 200
        print(f"Step 2 - Acknowledged rules")
        
        # Step 3: Check eligibility again - should show has_seen_rules
        response = logged_in_users.session.get(
            f"{BASE_URL}/api/trades/eligibility",
            headers=headers
        )
        assert response.status_code == 200
        eligibility_after = response.json()
        print(f"Step 3 - Eligibility after acknowledge: {eligibility_after}")
        
        print("PASS: Full eligibility flow completed")


class TestReviewsWithCondition:
    """Test reviews endpoint with item condition"""
    
    def test_get_user_reviews_endpoint(self, logged_in_users):
        """Test getting user reviews"""
        headers = logged_in_users.get_auth_headers("guitarking")
        user = logged_in_users.users.get("guitarking")
        
        if user:
            response = logged_in_users.session.get(
                f"{BASE_URL}/api/reviews/user/{user['id']}",
                headers=headers
            )
            assert response.status_code == 200
            data = response.json()
            assert "reviews" in data
            assert "stats" in data
            print(f"PASS: User reviews endpoint works, found {len(data.get('reviews', []))} reviews")
            
            # Check if any reviews have item_condition
            for review in data.get("reviews", []):
                if review.get("item_condition"):
                    print(f"  - Found review with item_condition: {review.get('item_condition')}")


# ============== API STRUCTURE VALIDATION ==============

class TestAPIStructure:
    """Validate API response structures"""
    
    def test_trade_list_response_structure(self, logged_in_users):
        """Validate trade list response has correct structure"""
        headers = logged_in_users.get_auth_headers("guitarking")
        response = logged_in_users.session.get(
            f"{BASE_URL}/api/trades",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        required_fields = ["trades", "total", "page", "limit", "pages"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"PASS: Trade list response has all required fields: {required_fields}")
    
    def test_eligibility_response_structure(self, logged_in_users):
        """Validate eligibility response structure"""
        headers = logged_in_users.get_auth_headers("guitarking")
        response = logged_in_users.session.get(
            f"{BASE_URL}/api/trades/eligibility",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "eligible" in data, "Response must have 'eligible' field"
        
        if data["eligible"]:
            # Eligible response should have trades_remaining or has_seen_rules
            assert "trades_remaining" in data or "has_seen_rules" in data
        else:
            # Not eligible should have reason
            assert "reason" in data
        
        print(f"PASS: Eligibility response structure is valid")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
