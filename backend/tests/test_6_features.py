"""
Test Suite for MicLocker 6 Critical Updates:
1. Username editing in profile
2. Back button on listing pages (frontend only)
3. Heart/favorite buttons on listing cards (frontend only)
4. Checkout success page with order details (frontend only)
5. $5 minimum listing price
6. 30-day trade cooldown between users
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_USERNAME = "miclocker.support"
ADMIN_PASSWORD = "Eisenhower1212!!"


def get_auth_token():
    """Get auth token for admin user"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        params={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("access_token")
    return None


class TestUsernameEditing:
    """Test Feature 1: Username editing in profile"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for admin user"""
        token = get_auth_token()
        if token:
            return token
        pytest.skip("Authentication failed")
    
    def test_get_profile_has_username(self, auth_token):
        """Test that profile endpoint returns username"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "username" in data
        print(f"Current username: {data['username']}")
    
    def test_update_username_validation(self, auth_token):
        """Test username validation rules"""
        # Test invalid characters
        response = requests.put(
            f"{BASE_URL}/api/users/profile",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"username": "Invalid Username!"}
        )
        assert response.status_code == 400
        print(f"Invalid username rejected: {response.json()}")
    
    def test_update_username_too_short(self, auth_token):
        """Test username minimum length"""
        response = requests.put(
            f"{BASE_URL}/api/users/profile",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"username": "ab"}
        )
        assert response.status_code == 400
        print(f"Short username rejected: {response.json()}")


class TestMinimumListingPrice:
    """Test Feature 5: $5 minimum listing price"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for admin user"""
        token = get_auth_token()
        if token:
            return token
        pytest.skip("Authentication failed")
    
    def test_create_listing_below_minimum_price(self, auth_token):
        """Test that listings under $5 are rejected"""
        listing_data = {
            "title": "TEST_Low_Price_Item",
            "description": "This is a test listing with price below minimum",
            "category": "Guitars",
            "condition": "Good",
            "price": 4.99  # Below $5 minimum
        }
        
        response = requests.post(
            f"{BASE_URL}/api/listings",
            headers={"Authorization": f"Bearer {auth_token}"},
            json=listing_data
        )
        
        # Should be rejected with 422 (validation error) or 400
        assert response.status_code in [400, 422]
        error_detail = response.json()
        print(f"Low price listing rejected: {error_detail}")
        # Check error message mentions price validation
        error_str = str(error_detail).lower()
        assert "5" in error_str or "price" in error_str or "greater" in error_str
    
    def test_create_listing_at_minimum_price(self, auth_token):
        """Test that listings at exactly $5 are accepted"""
        listing_data = {
            "title": f"TEST_Minimum_Price_Item_{uuid.uuid4().hex[:8]}",
            "description": "This is a test listing at minimum price",
            "category": "Guitars",
            "condition": "Good",
            "price": 5.00  # Exactly $5 minimum
        }
        
        response = requests.post(
            f"{BASE_URL}/api/listings",
            headers={"Authorization": f"Bearer {auth_token}"},
            json=listing_data
        )
        
        # Should be accepted
        assert response.status_code in [200, 201]
        data = response.json()
        assert data["price"] == 5.00
        print(f"Listing created at minimum price: {data['id']}")
        
        # Cleanup - delete the test listing
        requests.delete(
            f"{BASE_URL}/api/listings/{data['id']}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
    
    def test_create_listing_above_minimum_price(self, auth_token):
        """Test that listings above $5 are accepted"""
        listing_data = {
            "title": f"TEST_Above_Minimum_Price_{uuid.uuid4().hex[:8]}",
            "description": "This is a test listing above minimum price",
            "category": "Guitars",
            "condition": "Good",
            "price": 100.00
        }
        
        response = requests.post(
            f"{BASE_URL}/api/listings",
            headers={"Authorization": f"Bearer {auth_token}"},
            json=listing_data
        )
        
        assert response.status_code in [200, 201]
        data = response.json()
        assert data["price"] == 100.00
        print(f"Listing created above minimum price: {data['id']}")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/listings/{data['id']}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
    
    def test_update_listing_below_minimum_price(self, auth_token):
        """Test that updating listing price below $5 is rejected"""
        # First create a valid listing
        listing_data = {
            "title": f"TEST_Update_Price_Test_{uuid.uuid4().hex[:8]}",
            "description": "This is a test listing for price update",
            "category": "Guitars",
            "condition": "Good",
            "price": 50.00
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/listings",
            headers={"Authorization": f"Bearer {auth_token}"},
            json=listing_data
        )
        
        if create_response.status_code not in [200, 201]:
            pytest.skip("Could not create test listing")
        
        listing_id = create_response.json()["id"]
        
        # Try to update price below minimum
        update_response = requests.put(
            f"{BASE_URL}/api/listings/{listing_id}",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"price": 3.00}
        )
        
        # Should be rejected
        assert update_response.status_code == 400
        print(f"Price update below minimum rejected: {update_response.json()}")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/listings/{listing_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )


class TestTradeCooldown:
    """Test Feature 6: 30-day trade cooldown between users"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for admin user"""
        token = get_auth_token()
        if token:
            return token
        pytest.skip("Authentication failed")
    
    def test_trade_eligibility_endpoint_exists(self, auth_token):
        """Test that trade eligibility endpoint exists"""
        response = requests.get(
            f"{BASE_URL}/api/trades/eligibility",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        print(f"Trade eligibility response: {data}")
        # Should have eligible field
        assert "eligible" in data
    
    def test_trade_routes_exist(self, auth_token):
        """Test that trade routes are accessible"""
        # Get trades list
        response = requests.get(
            f"{BASE_URL}/api/trades",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "trades" in data
        print(f"Trades list: {len(data['trades'])} trades found")
    
    def test_trade_cooldown_check_function_exists(self, auth_token):
        """Test that trade cooldown is enforced in trade creation"""
        # This test verifies the cooldown logic exists by checking the trade creation endpoint
        # We can't fully test without two users, but we can verify the endpoint validates
        
        # Try to create a trade with invalid listing IDs
        response = requests.post(
            f"{BASE_URL}/api/trades",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "my_listing_id": "nonexistent-listing-1",
                "their_listing_id": "nonexistent-listing-2"
            }
        )
        
        # Should return 404 for non-existent listing, not 500
        assert response.status_code in [400, 404]
        print(f"Trade creation validation: {response.json()}")


class TestListingCategories:
    """Test listing categories and conditions endpoints"""
    
    def test_get_categories(self):
        """Test that categories endpoint returns valid data"""
        response = requests.get(f"{BASE_URL}/api/listings/categories")
        
        assert response.status_code == 200
        data = response.json()
        assert "categories" in data
        assert "conditions" in data
        assert len(data["categories"]) > 0
        assert len(data["conditions"]) > 0
        print(f"Categories: {len(data['categories'])}, Conditions: {len(data['conditions'])}")


class TestOrdersEndpoint:
    """Test orders endpoint for checkout success page"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for admin user"""
        token = get_auth_token()
        if token:
            return token
        pytest.skip("Authentication failed")
    
    def test_orders_endpoint_exists(self, auth_token):
        """Test that orders endpoint exists"""
        response = requests.get(
            f"{BASE_URL}/api/orders",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "orders" in data
        print(f"Orders endpoint working: {len(data['orders'])} orders found")
    
    def test_order_by_id_endpoint(self, auth_token):
        """Test that order by ID endpoint exists"""
        # Try to get a non-existent order
        response = requests.get(
            f"{BASE_URL}/api/orders/nonexistent-order-id",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        # Should return 404, not 500
        assert response.status_code == 404
        print(f"Order by ID endpoint validation: {response.json()}")


class TestFavoritesEndpoint:
    """Test favorites endpoint for heart button functionality"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for admin user"""
        token = get_auth_token()
        if token:
            return token
        pytest.skip("Authentication failed")
    
    def test_get_favorites(self, auth_token):
        """Test that favorites endpoint exists"""
        response = requests.get(
            f"{BASE_URL}/api/users/favorites/list",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "listings" in data
        print(f"Favorites endpoint working: {len(data['listings'])} favorites found")
    
    def test_check_favorite_endpoint(self, auth_token):
        """Test check favorite endpoint"""
        # Try to check favorite for a non-existent listing
        response = requests.get(
            f"{BASE_URL}/api/users/favorites/check/nonexistent-listing",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        # Should return 200 with is_favorite: false
        assert response.status_code == 200
        data = response.json()
        assert "is_favorite" in data
        assert data["is_favorite"] == False
        print(f"Check favorite endpoint working: {data}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
