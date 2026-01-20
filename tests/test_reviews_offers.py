"""
Test suite for MicLocker Reviews and Offers APIs
- Bidirectional reviews (buyer_to_seller, seller_to_buyer)
- Make an Offer functionality
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test user credentials (from seed data)
TEST_USERS = {
    "guitarking": {
        "email": "guitarking@example.com",
        "password": "password123",
        "id": "29df50dd-25c2-434d-bb2f-67b8eec6ca0f"
    },
    "studiopromax": {
        "email": "studio@example.com",
        "password": "password123",
        "id": "2c2af186-f3ed-4e46-8803-98b903e9fa4a"
    },
    "beatmaker2024": {
        "email": "beats@example.com",
        "password": "password123",
        "id": "0ae64381-b8d1-47f8-a039-4989eac3818e"
    },
    "vintagegear": {
        "email": "vintage@example.com",
        "password": "password123",
        "id": "6118b71b-a0b1-49c4-9cea-017152fde58d"
    }
}

# Known completed orders from seed data
COMPLETED_ORDERS = {
    "order1": {
        "id": "5114028d-ded8-4ba7-82dd-46c18002f1db",
        "buyer_id": "29df50dd-25c2-434d-bb2f-67b8eec6ca0f",  # guitarking
        "seller_id": "0ae64381-b8d1-47f8-a039-4989eac3818e"  # beatmaker2024
    },
    "order2": {
        "id": "8976863e-b911-41de-95d8-33eaf946b398",
        "buyer_id": "6118b71b-a0b1-49c4-9cea-017152fde58d",  # vintagegear
        "seller_id": "2c2af186-f3ed-4e46-8803-98b903e9fa4a"  # studiopromax
    }
}

# Active listings for offer tests
ACTIVE_LISTINGS = {
    "fender_strat": {
        "id": "826c7a22-f78a-441c-87c4-824b25e7363a",
        "seller_id": "29df50dd-25c2-434d-bb2f-67b8eec6ca0f",  # guitarking
        "price": 1350
    },
    "gibson_les_paul": {
        "id": "df299018-d583-48bb-a158-6b70f45d08ed",
        "seller_id": "6118b71b-a0b1-49c4-9cea-017152fde58d",  # vintagegear
        "price": 2299
    },
    "shure_sm7b": {
        "id": "084869e0-0c85-4f8b-b710-92a843b6870b",
        "seller_id": "2c2af186-f3ed-4e46-8803-98b903e9fa4a",  # studiopromax
        "price": 349
    }
}


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


def get_auth_token(api_client, username):
    """Get authentication token for a user"""
    user = TEST_USERS.get(username)
    if not user:
        pytest.skip(f"Unknown user: {username}")
    
    # Login endpoint uses query parameters
    response = api_client.post(
        f"{BASE_URL}/api/auth/login",
        params={"username": user["email"], "password": user["password"]}
    )
    
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Authentication failed for {username}: {response.text}")


@pytest.fixture(scope="module")
def guitarking_token(api_client):
    """Token for guitarking user"""
    return get_auth_token(api_client, "guitarking")


@pytest.fixture(scope="module")
def studiopromax_token(api_client):
    """Token for studiopromax user"""
    return get_auth_token(api_client, "studiopromax")


@pytest.fixture(scope="module")
def beatmaker_token(api_client):
    """Token for beatmaker2024 user"""
    return get_auth_token(api_client, "beatmaker2024")


@pytest.fixture(scope="module")
def vintagegear_token(api_client):
    """Token for vintagegear user"""
    return get_auth_token(api_client, "vintagegear")


# ==================== REVIEWS API TESTS ====================

class TestReviewsGetUserReviews:
    """Test GET /api/reviews/user/{user_id} - Public endpoint for user reviews"""
    
    def test_get_user_reviews_all(self, api_client):
        """Get all reviews for a user (public endpoint)"""
        user_id = TEST_USERS["guitarking"]["id"]
        response = api_client.get(f"{BASE_URL}/api/reviews/user/{user_id}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "reviews" in data
        assert "total" in data
        assert "page" in data
        assert "limit" in data
        assert "average_rating" in data
        assert "rating_distribution" in data
        assert "stats" in data
        
        # Verify stats has bidirectional breakdown
        assert "as_seller" in data["stats"]
        assert "as_buyer" in data["stats"]
        assert "count" in data["stats"]["as_seller"]
        assert "average" in data["stats"]["as_seller"]
        assert "count" in data["stats"]["as_buyer"]
        assert "average" in data["stats"]["as_buyer"]
        
        print(f"User {user_id} has {data['total']} reviews")
        print(f"As seller: {data['stats']['as_seller']['count']} reviews, avg: {data['stats']['as_seller']['average']}")
        print(f"As buyer: {data['stats']['as_buyer']['count']} reviews, avg: {data['stats']['as_buyer']['average']}")
    
    def test_get_user_reviews_as_seller(self, api_client):
        """Get reviews where user was the seller"""
        user_id = TEST_USERS["guitarking"]["id"]
        response = api_client.get(f"{BASE_URL}/api/reviews/user/{user_id}?review_type=as_seller")
        
        assert response.status_code == 200
        data = response.json()
        
        # All returned reviews should be where user was seller
        for review in data["reviews"]:
            assert review["reviewee_id"] == user_id
            assert review["reviewee_role"] == "seller"
        
        print(f"Found {len(data['reviews'])} reviews as seller")
    
    def test_get_user_reviews_as_buyer(self, api_client):
        """Get reviews where user was the buyer"""
        user_id = TEST_USERS["guitarking"]["id"]
        response = api_client.get(f"{BASE_URL}/api/reviews/user/{user_id}?review_type=as_buyer")
        
        assert response.status_code == 200
        data = response.json()
        
        # All returned reviews should be where user was buyer
        for review in data["reviews"]:
            assert review["reviewee_id"] == user_id
            assert review["reviewee_role"] == "buyer"
        
        print(f"Found {len(data['reviews'])} reviews as buyer")
    
    def test_get_user_reviews_pagination(self, api_client):
        """Test pagination for user reviews"""
        user_id = TEST_USERS["guitarking"]["id"]
        response = api_client.get(f"{BASE_URL}/api/reviews/user/{user_id}?page=1&limit=5")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["page"] == 1
        assert data["limit"] == 5
        assert len(data["reviews"]) <= 5
        assert "pages" in data


class TestReviewsGetOrderReviews:
    """Test GET /api/reviews/order/{order_id} - Get reviews for specific order"""
    
    def test_get_order_reviews_as_buyer(self, api_client, guitarking_token):
        """Buyer can view reviews for their order"""
        order_id = COMPLETED_ORDERS["order1"]["id"]
        
        response = api_client.get(
            f"{BASE_URL}/api/reviews/order/{order_id}",
            headers={"Authorization": f"Bearer {guitarking_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "buyer_to_seller" in data
        assert "seller_to_buyer" in data
        assert "can_buyer_review" in data
        assert "can_seller_review" in data
        
        print(f"Order {order_id} reviews:")
        print(f"  buyer_to_seller: {'exists' if data['buyer_to_seller'] else 'none'}")
        print(f"  seller_to_buyer: {'exists' if data['seller_to_buyer'] else 'none'}")
        print(f"  can_buyer_review: {data['can_buyer_review']}")
        print(f"  can_seller_review: {data['can_seller_review']}")
    
    def test_get_order_reviews_as_seller(self, api_client, beatmaker_token):
        """Seller can view reviews for their order"""
        order_id = COMPLETED_ORDERS["order1"]["id"]
        
        response = api_client.get(
            f"{BASE_URL}/api/reviews/order/{order_id}",
            headers={"Authorization": f"Bearer {beatmaker_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "buyer_to_seller" in data
        assert "seller_to_buyer" in data
    
    def test_get_order_reviews_unauthorized(self, api_client, studiopromax_token):
        """User not part of order cannot view reviews"""
        order_id = COMPLETED_ORDERS["order1"]["id"]  # guitarking/beatmaker order
        
        response = api_client.get(
            f"{BASE_URL}/api/reviews/order/{order_id}",
            headers={"Authorization": f"Bearer {studiopromax_token}"}
        )
        
        assert response.status_code == 403
    
    def test_get_order_reviews_not_found(self, api_client, guitarking_token):
        """Non-existent order returns 404"""
        response = api_client.get(
            f"{BASE_URL}/api/reviews/order/nonexistent-order-id",
            headers={"Authorization": f"Bearer {guitarking_token}"}
        )
        
        assert response.status_code == 404


class TestReviewsGetSellerReviews:
    """Test GET /api/reviews/seller/{seller_id} - Legacy endpoint"""
    
    def test_get_seller_reviews(self, api_client):
        """Get reviews for a seller (legacy endpoint)"""
        seller_id = TEST_USERS["guitarking"]["id"]
        response = api_client.get(f"{BASE_URL}/api/reviews/seller/{seller_id}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "reviews" in data
        assert "total" in data
        assert "average_rating" in data
        assert "rating_distribution" in data


class TestReviewsCreate:
    """Test POST /api/reviews - Create bidirectional reviews"""
    
    def test_create_review_requires_auth(self, api_client):
        """Creating review requires authentication"""
        response = api_client.post(f"{BASE_URL}/api/reviews", json={
            "order_id": COMPLETED_ORDERS["order1"]["id"],
            "rating": 5,
            "comment": "Great!",
            "review_type": "buyer_to_seller"
        })
        
        # Should return 401 or 403 for unauthenticated
        assert response.status_code in [401, 403]
    
    def test_create_review_invalid_order(self, api_client, guitarking_token):
        """Cannot create review for non-existent order"""
        response = api_client.post(
            f"{BASE_URL}/api/reviews",
            json={
                "order_id": "nonexistent-order-id",
                "rating": 5,
                "comment": "Great!",
                "review_type": "buyer_to_seller"
            },
            headers={"Authorization": f"Bearer {guitarking_token}"}
        )
        
        assert response.status_code == 404
    
    def test_create_review_wrong_role(self, api_client, guitarking_token):
        """Buyer cannot create seller_to_buyer review"""
        response = api_client.post(
            f"{BASE_URL}/api/reviews",
            json={
                "order_id": COMPLETED_ORDERS["order1"]["id"],
                "rating": 5,
                "comment": "Great buyer!",
                "review_type": "seller_to_buyer"  # guitarking is buyer, not seller
            },
            headers={"Authorization": f"Bearer {guitarking_token}"}
        )
        
        assert response.status_code == 400
        assert "seller" in response.json().get("detail", "").lower()


# ==================== OFFERS API TESTS ====================

class TestOffersCreate:
    """Test POST /api/offers - Create offer on listing"""
    
    def test_create_offer_requires_auth(self, api_client):
        """Creating offer requires authentication"""
        response = api_client.post(f"{BASE_URL}/api/offers", json={
            "listing_id": ACTIVE_LISTINGS["fender_strat"]["id"],
            "offer_price": 1200,
            "message": "Would you accept this?"
        })
        
        assert response.status_code in [401, 403]
    
    def test_create_offer_on_own_listing(self, api_client, guitarking_token):
        """Cannot make offer on own listing"""
        response = api_client.post(
            f"{BASE_URL}/api/offers",
            json={
                "listing_id": ACTIVE_LISTINGS["fender_strat"]["id"],  # guitarking's listing
                "offer_price": 1200,
                "message": "Would you accept this?"
            },
            headers={"Authorization": f"Bearer {guitarking_token}"}
        )
        
        assert response.status_code == 400
        assert "own listing" in response.json().get("detail", "").lower()
    
    def test_create_offer_success(self, api_client, beatmaker_token):
        """Successfully create offer on another user's listing"""
        response = api_client.post(
            f"{BASE_URL}/api/offers",
            json={
                "listing_id": ACTIVE_LISTINGS["gibson_les_paul"]["id"],  # vintagegear's listing
                "offer_price": 2000,
                "message": "Would you consider $2000?"
            },
            headers={"Authorization": f"Bearer {beatmaker_token}"}
        )
        
        # Could be 200/201 for success, or 400 if already has pending offer
        if response.status_code in [200, 201]:
            data = response.json()
            assert "id" in data
            assert data["offer_price"] == 2000
            assert data["status"] == "pending"
            assert data["listing_id"] == ACTIVE_LISTINGS["gibson_les_paul"]["id"]
            print(f"Created offer: {data['id']}")
        elif response.status_code == 400:
            # Already has pending offer - this is acceptable
            assert "pending offer" in response.json().get("detail", "").lower()
            print("User already has pending offer on this listing")
        else:
            pytest.fail(f"Unexpected status: {response.status_code}")
    
    def test_create_offer_invalid_listing(self, api_client, beatmaker_token):
        """Cannot create offer on non-existent listing"""
        response = api_client.post(
            f"{BASE_URL}/api/offers",
            json={
                "listing_id": "nonexistent-listing-id",
                "offer_price": 100,
                "message": "Test"
            },
            headers={"Authorization": f"Bearer {beatmaker_token}"}
        )
        
        assert response.status_code == 404


class TestOffersGet:
    """Test GET /api/offers - Get offers (received/sent)"""
    
    def test_get_received_offers(self, api_client, guitarking_token):
        """Seller can get offers received on their listings"""
        response = api_client.get(
            f"{BASE_URL}/api/offers?type=received",
            headers={"Authorization": f"Bearer {guitarking_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "offers" in data
        assert "total" in data
        assert "page" in data
        assert "limit" in data
        
        # All offers should be where user is seller
        for offer in data["offers"]:
            assert offer["seller_id"] == TEST_USERS["guitarking"]["id"]
        
        print(f"Received {data['total']} offers")
    
    def test_get_sent_offers(self, api_client, guitarking_token):
        """Buyer can get offers they sent"""
        response = api_client.get(
            f"{BASE_URL}/api/offers?type=sent",
            headers={"Authorization": f"Bearer {guitarking_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "offers" in data
        
        # All offers should be where user is buyer
        for offer in data["offers"]:
            assert offer["buyer_id"] == TEST_USERS["guitarking"]["id"]
        
        print(f"Sent {data['total']} offers")
    
    def test_get_offers_with_status_filter(self, api_client, guitarking_token):
        """Can filter offers by status"""
        response = api_client.get(
            f"{BASE_URL}/api/offers?type=received&status=pending",
            headers={"Authorization": f"Bearer {guitarking_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # All offers should have pending status
        for offer in data["offers"]:
            assert offer["status"] == "pending"


class TestOffersGetById:
    """Test GET /api/offers/{offer_id} - Get specific offer"""
    
    def test_get_offer_not_found(self, api_client, guitarking_token):
        """Non-existent offer returns 404"""
        response = api_client.get(
            f"{BASE_URL}/api/offers/nonexistent-offer-id",
            headers={"Authorization": f"Bearer {guitarking_token}"}
        )
        
        assert response.status_code == 404


class TestOffersActions:
    """Test offer actions: counter, accept, decline, withdraw"""
    
    def test_counter_offer_not_found(self, api_client, guitarking_token):
        """Counter on non-existent offer returns 404"""
        response = api_client.post(
            f"{BASE_URL}/api/offers/nonexistent-offer-id/counter",
            json={"counter_price": 1000, "message": "How about this?"},
            headers={"Authorization": f"Bearer {guitarking_token}"}
        )
        
        assert response.status_code == 404
    
    def test_accept_offer_not_found(self, api_client, guitarking_token):
        """Accept on non-existent offer returns 404"""
        response = api_client.post(
            f"{BASE_URL}/api/offers/nonexistent-offer-id/accept",
            headers={"Authorization": f"Bearer {guitarking_token}"}
        )
        
        assert response.status_code == 404
    
    def test_decline_offer_not_found(self, api_client, guitarking_token):
        """Decline on non-existent offer returns 404"""
        response = api_client.post(
            f"{BASE_URL}/api/offers/nonexistent-offer-id/decline",
            headers={"Authorization": f"Bearer {guitarking_token}"}
        )
        
        assert response.status_code == 404
    
    def test_withdraw_offer_not_found(self, api_client, guitarking_token):
        """Withdraw on non-existent offer returns 404"""
        response = api_client.post(
            f"{BASE_URL}/api/offers/nonexistent-offer-id/withdraw",
            headers={"Authorization": f"Bearer {guitarking_token}"}
        )
        
        assert response.status_code == 404


class TestOffersFullFlow:
    """Test complete offer flow: create -> counter -> accept"""
    
    def test_offer_flow(self, api_client, studiopromax_token, vintagegear_token):
        """Test full offer negotiation flow"""
        # Step 1: studiopromax creates offer on vintagegear's listing
        create_response = api_client.post(
            f"{BASE_URL}/api/offers",
            json={
                "listing_id": ACTIVE_LISTINGS["gibson_les_paul"]["id"],
                "offer_price": 1900,
                "message": "Would you take $1900?"
            },
            headers={"Authorization": f"Bearer {studiopromax_token}"}
        )
        
        if create_response.status_code == 400:
            # Already has pending offer - skip this test
            pytest.skip("User already has pending offer on this listing")
        
        assert create_response.status_code in [200, 201]
        offer = create_response.json()
        offer_id = offer["id"]
        
        assert offer["status"] == "pending"
        assert offer["pending_action_from"] == "seller"
        print(f"Created offer {offer_id}")
        
        # Step 2: vintagegear (seller) counters
        counter_response = api_client.post(
            f"{BASE_URL}/api/offers/{offer_id}/counter",
            json={"counter_price": 2100, "message": "How about $2100?"},
            headers={"Authorization": f"Bearer {vintagegear_token}"}
        )
        
        assert counter_response.status_code == 200
        counter_data = counter_response.json()
        assert counter_data["counter_price"] == 2100
        assert counter_data["pending_action_from"] == "buyer"
        print("Seller countered with $2100")
        
        # Step 3: studiopromax (buyer) accepts the counter
        accept_response = api_client.post(
            f"{BASE_URL}/api/offers/{offer_id}/accept",
            headers={"Authorization": f"Bearer {studiopromax_token}"}
        )
        
        assert accept_response.status_code == 200
        accept_data = accept_response.json()
        assert accept_data["final_price"] == 2100
        print(f"Buyer accepted at ${accept_data['final_price']}")
        
        # Verify offer status
        get_response = api_client.get(
            f"{BASE_URL}/api/offers/{offer_id}",
            headers={"Authorization": f"Bearer {studiopromax_token}"}
        )
        
        assert get_response.status_code == 200
        final_offer = get_response.json()
        assert final_offer["status"] == "accepted"


class TestReviewResponseStructure:
    """Test review response structure and data integrity"""
    
    def test_review_response_has_all_fields(self, api_client):
        """Verify review response contains all required fields"""
        user_id = TEST_USERS["guitarking"]["id"]
        response = api_client.get(f"{BASE_URL}/api/reviews/user/{user_id}")
        
        assert response.status_code == 200
        data = response.json()
        
        if data["reviews"]:
            review = data["reviews"][0]
            
            # Check all required fields
            required_fields = [
                "id", "order_id", "listing_id", "listing_title",
                "reviewer_id", "reviewer_username", "reviewer_role",
                "reviewee_id", "reviewee_username", "reviewee_role",
                "buyer_id", "buyer_username", "seller_id", "seller_username",
                "rating", "review_type", "is_public", "created_at"
            ]
            
            for field in required_fields:
                assert field in review, f"Missing field: {field}"
            
            # Verify rating is 1-5
            assert 1 <= review["rating"] <= 5
            
            # Verify review_type is valid
            assert review["review_type"] in ["buyer_to_seller", "seller_to_buyer"]
            
            # Verify is_public is True (reviews are always public)
            assert review["is_public"] == True
            
            print(f"Review structure validated: {review['id']}")


class TestOfferResponseStructure:
    """Test offer response structure"""
    
    def test_offer_response_has_all_fields(self, api_client, guitarking_token):
        """Verify offer response contains all required fields"""
        response = api_client.get(
            f"{BASE_URL}/api/offers?type=sent",
            headers={"Authorization": f"Bearer {guitarking_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        if data["offers"]:
            offer = data["offers"][0]
            
            # Check required fields
            required_fields = [
                "id", "listing_id", "listing_title", "listing_price",
                "buyer_id", "buyer_username", "seller_id", "seller_username",
                "offer_price", "status", "created_at", "updated_at"
            ]
            
            for field in required_fields:
                assert field in offer, f"Missing field: {field}"
            
            # Verify status is valid
            valid_statuses = ["pending", "countered", "accepted", "declined", "withdrawn", "expired", "ordered"]
            assert offer["status"] in valid_statuses
            
            print(f"Offer structure validated: {offer['id']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
