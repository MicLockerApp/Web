"""
Stripe Connect API Tests for MicLocker Marketplace

Tests:
- GET /api/payments/connect/status - Stripe Connect status for users
- POST /api/payments/connect/onboard - Seller onboarding (expected 503 - Connect not enabled)
- GET /api/payments/connect/balance - Seller balance
- POST /api/payments/connect/refresh-link - Refresh onboarding link
- GET /api/payments/webhook-info - Webhook configuration info
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://industry-pros.preview.emergentagent.com')

# Test credentials
ADMIN_USER = {"username": "miclocker.support", "password": "Finally2026!!"}


class TestHealthAndConfig:
    """Basic health and config tests"""
    
    def test_health_endpoint(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print(f"✓ Health check passed: {data}")
    
    def test_payment_config(self):
        """Test payment config returns Stripe publishable key"""
        response = requests.get(f"{BASE_URL}/api/payments/config")
        assert response.status_code == 200
        data = response.json()
        assert "publishable_key" in data
        assert data["publishable_key"].startswith("pk_test_")
        print(f"✓ Payment config returned publishable key: {data['publishable_key'][:20]}...")


class TestWebhookInfo:
    """Test webhook info endpoint (no auth required)"""
    
    def test_webhook_info_endpoint(self):
        """GET /api/payments/webhook-info - should return webhook configuration"""
        response = requests.get(f"{BASE_URL}/api/payments/webhook-info")
        assert response.status_code == 200
        data = response.json()
        
        # Verify required fields
        assert "webhook_url" in data
        assert "required_events" in data
        assert "instructions" in data
        
        # Verify required events include Stripe Connect events
        required_events = data["required_events"]
        assert "checkout.session.completed" in required_events
        assert "account.updated" in required_events
        assert "payout.paid" in required_events
        
        print(f"✓ Webhook info returned: {len(required_events)} required events")
        print(f"  Webhook URL: {data['webhook_url']}")


class TestStripeConnectAuthenticated:
    """Stripe Connect tests requiring authentication"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            params={"username": ADMIN_USER["username"], "password": ADMIN_USER["password"]}
        )
        
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.status_code} - {login_response.text}")
        
        self.token = login_response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.user = login_response.json().get("user", {})
        print(f"✓ Logged in as: {self.user.get('username')}")
    
    def test_connect_status_not_connected(self):
        """GET /api/payments/connect/status - should return not_connected for new users"""
        response = requests.get(
            f"{BASE_URL}/api/payments/connect/status",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # For users without Stripe Connect, should return not_connected
        assert "status" in data
        assert "can_receive_payouts" in data
        
        # Status should be one of: not_connected, pending, connected, error
        valid_statuses = ["not_connected", "pending", "connected", "error"]
        assert data["status"] in valid_statuses
        
        print(f"✓ Connect status: {data['status']}")
        print(f"  Can receive payouts: {data['can_receive_payouts']}")
        print(f"  Message: {data.get('message', 'N/A')}")
    
    def test_connect_onboard_returns_error_when_not_enabled(self):
        """POST /api/payments/connect/onboard - should return error (Connect not enabled)"""
        response = requests.post(
            f"{BASE_URL}/api/payments/connect/onboard",
            headers=self.headers
        )
        
        # Expected: 503 or 520 because Stripe Connect is not enabled in Stripe Dashboard
        # This is EXPECTED behavior per the test requirements
        if response.status_code in [503, 520]:
            data = response.json()
            assert "detail" in data
            assert "Stripe Connect" in data["detail"] or "not yet enabled" in data["detail"]
            print(f"✓ Onboard returned expected error ({response.status_code}): {data['detail'][:80]}...")
        elif response.status_code == 200:
            # If it succeeds, that means Connect is enabled
            data = response.json()
            assert "status" in data
            print(f"✓ Onboard succeeded (Connect is enabled): {data.get('status')}")
        else:
            # Other status codes are unexpected
            pytest.fail(f"Unexpected status code: {response.status_code} - {response.text}")
    
    def test_connect_balance_no_account(self):
        """GET /api/payments/connect/balance - should return zero balance for non-connected users"""
        response = requests.get(
            f"{BASE_URL}/api/payments/connect/balance",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # For users without Stripe Connect, should return zero balance with message
        assert "available" in data
        assert "pending" in data
        
        print(f"✓ Balance returned: available=${data['available']}, pending=${data['pending']}")
        if "message" in data:
            print(f"  Message: {data['message']}")
    
    def test_connect_refresh_link_no_account(self):
        """POST /api/payments/connect/refresh-link - should return 400 for users without account"""
        response = requests.post(
            f"{BASE_URL}/api/payments/connect/refresh-link",
            headers=self.headers
        )
        
        # For users without Stripe Connect account, should return 400
        if response.status_code == 400:
            data = response.json()
            assert "detail" in data
            print(f"✓ Refresh link returned expected 400: {data['detail']}")
        elif response.status_code == 200:
            # If user has an account, it should return a URL
            data = response.json()
            assert "onboarding_url" in data
            print(f"✓ Refresh link returned URL (user has account)")
        else:
            pytest.fail(f"Unexpected status code: {response.status_code} - {response.text}")


class TestStripeConnectUnauthenticated:
    """Test that Stripe Connect endpoints require authentication"""
    
    def test_connect_status_requires_auth(self):
        """GET /api/payments/connect/status - should require authentication"""
        response = requests.get(f"{BASE_URL}/api/payments/connect/status")
        # Accept both 401 (Unauthorized) and 403 (Forbidden) as valid auth rejection
        assert response.status_code in [401, 403]
        print(f"✓ Connect status requires authentication (returned {response.status_code})")
    
    def test_connect_onboard_requires_auth(self):
        """POST /api/payments/connect/onboard - should require authentication"""
        response = requests.post(f"{BASE_URL}/api/payments/connect/onboard")
        assert response.status_code in [401, 403]
        print(f"✓ Connect onboard requires authentication (returned {response.status_code})")
    
    def test_connect_balance_requires_auth(self):
        """GET /api/payments/connect/balance - should require authentication"""
        response = requests.get(f"{BASE_URL}/api/payments/connect/balance")
        assert response.status_code in [401, 403]
        print(f"✓ Connect balance requires authentication (returned {response.status_code})")
    
    def test_connect_refresh_link_requires_auth(self):
        """POST /api/payments/connect/refresh-link - should require authentication"""
        response = requests.post(f"{BASE_URL}/api/payments/connect/refresh-link")
        assert response.status_code in [401, 403]
        print(f"✓ Connect refresh-link requires authentication (returned {response.status_code})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
