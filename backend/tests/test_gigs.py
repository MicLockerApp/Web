"""
Gig Board API Tests for MicLocker
Tests all gig CRUD operations, filtering, and authorization
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://videoauditions.preview.emergentagent.com').rstrip('/')

# Test credentials
ADMIN_USERNAME = "miclocker.support"
ADMIN_PASSWORD = "Eisenhower1212!!"


class TestGigCategories:
    """Test GET /api/gigs/categories endpoint"""
    
    def test_get_categories_returns_gig_types(self):
        """Categories endpoint should return gig types"""
        response = requests.get(f"{BASE_URL}/api/gigs/categories")
        assert response.status_code == 200
        
        data = response.json()
        assert "gig_types" in data
        assert len(data["gig_types"]) == 2
        
        gig_type_values = [gt["value"] for gt in data["gig_types"]]
        assert "looking_for" in gig_type_values
        assert "can_provide" in gig_type_values
    
    def test_get_categories_returns_main_categories(self):
        """Categories endpoint should return 5 main categories"""
        response = requests.get(f"{BASE_URL}/api/gigs/categories")
        assert response.status_code == 200
        
        data = response.json()
        assert "categories" in data
        assert len(data["categories"]) == 5
        
        category_values = [c["value"] for c in data["categories"]]
        assert "musician" in category_values
        assert "audio_engineer" in category_values
        assert "recording_studio" in category_values
        assert "venue" in category_values
        assert "merchant" in category_values
    
    def test_get_categories_returns_subcategories(self):
        """Categories endpoint should return subcategories for each category"""
        response = requests.get(f"{BASE_URL}/api/gigs/categories")
        assert response.status_code == 200
        
        data = response.json()
        assert "subcategories" in data
        
        # Check each category has subcategories
        assert "musician" in data["subcategories"]
        assert "audio_engineer" in data["subcategories"]
        assert "recording_studio" in data["subcategories"]
        assert "venue" in data["subcategories"]
        assert "merchant" in data["subcategories"]
        
        # Verify some specific subcategories exist
        assert "Electric Guitar" in data["subcategories"]["musician"]
        assert "Mixing Engineers" in data["subcategories"]["audio_engineer"]
        assert "Concert Hall" in data["subcategories"]["venue"]


class TestGigsList:
    """Test GET /api/gigs endpoint with filters"""
    
    def test_get_gigs_returns_list(self):
        """Get gigs should return a list with pagination info"""
        response = requests.get(f"{BASE_URL}/api/gigs")
        assert response.status_code == 200
        
        data = response.json()
        assert "gigs" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data
        assert "limit" in data
        assert isinstance(data["gigs"], list)
    
    def test_get_gigs_filter_by_gig_type_looking_for(self):
        """Filter gigs by gig_type=looking_for"""
        response = requests.get(f"{BASE_URL}/api/gigs?gig_type=looking_for")
        assert response.status_code == 200
        
        data = response.json()
        for gig in data["gigs"]:
            assert gig["gig_type"] == "looking_for"
    
    def test_get_gigs_filter_by_gig_type_can_provide(self):
        """Filter gigs by gig_type=can_provide"""
        response = requests.get(f"{BASE_URL}/api/gigs?gig_type=can_provide")
        assert response.status_code == 200
        
        data = response.json()
        for gig in data["gigs"]:
            assert gig["gig_type"] == "can_provide"
    
    def test_get_gigs_invalid_gig_type_returns_400(self):
        """Invalid gig_type should return 400"""
        response = requests.get(f"{BASE_URL}/api/gigs?gig_type=invalid_type")
        assert response.status_code == 400
    
    def test_get_gigs_filter_by_category(self):
        """Filter gigs by category"""
        response = requests.get(f"{BASE_URL}/api/gigs?categories=musician")
        assert response.status_code == 200
        
        data = response.json()
        for gig in data["gigs"]:
            assert gig["category"] == "musician"
    
    def test_get_gigs_filter_by_multiple_categories(self):
        """Filter gigs by multiple categories"""
        response = requests.get(f"{BASE_URL}/api/gigs?categories=musician,audio_engineer")
        assert response.status_code == 200
        
        data = response.json()
        for gig in data["gigs"]:
            assert gig["category"] in ["musician", "audio_engineer"]
    
    def test_get_gigs_pagination(self):
        """Test pagination parameters"""
        response = requests.get(f"{BASE_URL}/api/gigs?page=1&limit=5")
        assert response.status_code == 200
        
        data = response.json()
        assert data["page"] == 1
        assert data["limit"] == 5
        assert len(data["gigs"]) <= 5


class TestGigCRUD:
    """Test gig CRUD operations (requires authentication)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get auth token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login?username={ADMIN_USERNAME}&password={ADMIN_PASSWORD}"
        )
        if login_response.status_code == 200:
            self.token = login_response.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed - skipping authenticated tests")
    
    def test_create_gig_requires_auth(self):
        """Creating a gig without auth should return 401 or 403"""
        gig_data = {
            "gig_type": "looking_for",
            "title": "Test Gig Title",
            "description": "This is a test gig description that is at least 20 characters long.",
            "category": "musician"
        }
        response = requests.post(f"{BASE_URL}/api/gigs", json=gig_data)
        assert response.status_code in [401, 403]
    
    def test_create_gig_success(self):
        """Create a new gig with all required fields"""
        unique_id = str(uuid.uuid4())[:8]
        gig_data = {
            "gig_type": "looking_for",
            "title": f"TEST_Looking for a Guitarist {unique_id}",
            "description": "We need an experienced guitarist for our upcoming tour. Must be proficient in rock and blues styles.",
            "category": "musician",
            "subcategories": ["Electric Guitar", "Acoustic Guitar"],
            "location": "New York, NY",
            "budget_range": "$500-1000",
            "contact_email": "test@example.com",
            "contact_phone": "555-555-5555"
        }
        
        response = requests.post(f"{BASE_URL}/api/gigs", json=gig_data, headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["title"] == gig_data["title"]
        assert data["gig_type"] == "looking_for"
        assert data["category"] == "musician"
        assert "Electric Guitar" in data["subcategories"]
        assert data["location"] == "New York, NY"
        assert data["budget_range"] == "$500-1000"
        assert "id" in data
        assert "created_at" in data
        
        # Store gig ID for cleanup
        self.created_gig_id = data["id"]
        
        # Cleanup: Delete the test gig
        requests.delete(f"{BASE_URL}/api/gigs/{self.created_gig_id}", headers=self.headers)
    
    def test_create_gig_can_provide(self):
        """Create a 'can_provide' type gig"""
        unique_id = str(uuid.uuid4())[:8]
        gig_data = {
            "gig_type": "can_provide",
            "title": f"TEST_Professional Mixing Services {unique_id}",
            "description": "I offer professional mixing and mastering services with 10 years of experience in the industry.",
            "category": "audio_engineer",
            "subcategories": ["Mixing Engineers", "Mastering Engineers"],
            "location": "Remote",
            "budget_range": "$200-500 per track"
        }
        
        response = requests.post(f"{BASE_URL}/api/gigs", json=gig_data, headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["gig_type"] == "can_provide"
        assert data["category"] == "audio_engineer"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/gigs/{data['id']}", headers=self.headers)
    
    def test_create_gig_with_social_links(self):
        """Create a gig with social media links"""
        unique_id = str(uuid.uuid4())[:8]
        gig_data = {
            "gig_type": "can_provide",
            "title": f"TEST_Venue for Hire {unique_id}",
            "description": "Beautiful concert hall available for events, concerts, and private parties.",
            "category": "venue",
            "subcategories": ["Concert Hall"],
            "social_links": {
                "website": "https://example.com",
                "instagram": "https://instagram.com/venue",
                "facebook": "https://facebook.com/venue"
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/gigs", json=gig_data, headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["social_links"] is not None
        assert data["social_links"]["website"] == "https://example.com"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/gigs/{data['id']}", headers=self.headers)
    
    def test_create_gig_invalid_category(self):
        """Creating gig with invalid category should return 400"""
        gig_data = {
            "gig_type": "looking_for",
            "title": "Test Invalid Category",
            "description": "This is a test gig with an invalid category.",
            "category": "invalid_category"
        }
        
        response = requests.post(f"{BASE_URL}/api/gigs", json=gig_data, headers=self.headers)
        assert response.status_code == 400
    
    def test_create_gig_invalid_gig_type(self):
        """Creating gig with invalid gig_type should return 400"""
        gig_data = {
            "gig_type": "invalid_type",
            "title": "Test Invalid Gig Type",
            "description": "This is a test gig with an invalid gig type.",
            "category": "musician"
        }
        
        response = requests.post(f"{BASE_URL}/api/gigs", json=gig_data, headers=self.headers)
        assert response.status_code == 400
    
    def test_create_gig_invalid_subcategory(self):
        """Creating gig with invalid subcategory should return 400"""
        gig_data = {
            "gig_type": "looking_for",
            "title": "Test Invalid Subcategory",
            "description": "This is a test gig with an invalid subcategory.",
            "category": "musician",
            "subcategories": ["Invalid Subcategory"]
        }
        
        response = requests.post(f"{BASE_URL}/api/gigs", json=gig_data, headers=self.headers)
        assert response.status_code == 400
    
    def test_create_gig_title_too_short(self):
        """Creating gig with title < 5 chars should return 422"""
        gig_data = {
            "gig_type": "looking_for",
            "title": "Test",  # Only 4 chars
            "description": "This is a test gig description that is at least 20 characters long.",
            "category": "musician"
        }
        
        response = requests.post(f"{BASE_URL}/api/gigs", json=gig_data, headers=self.headers)
        assert response.status_code == 422
    
    def test_create_gig_description_too_short(self):
        """Creating gig with description < 20 chars should return 422"""
        gig_data = {
            "gig_type": "looking_for",
            "title": "Test Gig Title",
            "description": "Too short",  # Less than 20 chars
            "category": "musician"
        }
        
        response = requests.post(f"{BASE_URL}/api/gigs", json=gig_data, headers=self.headers)
        assert response.status_code == 422


class TestGigDetail:
    """Test GET /api/gigs/{id} endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get auth token and create a test gig"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login?username={ADMIN_USERNAME}&password={ADMIN_PASSWORD}"
        )
        if login_response.status_code == 200:
            self.token = login_response.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
        
        # Create a test gig
        unique_id = str(uuid.uuid4())[:8]
        gig_data = {
            "gig_type": "looking_for",
            "title": f"TEST_Detail Test Gig {unique_id}",
            "description": "This is a test gig for testing the detail endpoint.",
            "category": "musician",
            "subcategories": ["Electric Guitar"]
        }
        response = requests.post(f"{BASE_URL}/api/gigs", json=gig_data, headers=self.headers)
        if response.status_code == 200:
            self.test_gig_id = response.json()["id"]
        else:
            pytest.skip("Failed to create test gig")
        
        yield
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/gigs/{self.test_gig_id}", headers=self.headers)
    
    def test_get_gig_by_id(self):
        """Get a specific gig by ID"""
        response = requests.get(f"{BASE_URL}/api/gigs/{self.test_gig_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == self.test_gig_id
        assert "title" in data
        assert "description" in data
        assert "category" in data
        assert "gig_type" in data
    
    def test_get_gig_increments_view_count(self):
        """Getting a gig should increment view count"""
        # Get initial view count
        response1 = requests.get(f"{BASE_URL}/api/gigs/{self.test_gig_id}")
        initial_views = response1.json()["view_count"]
        
        # Get again
        response2 = requests.get(f"{BASE_URL}/api/gigs/{self.test_gig_id}")
        new_views = response2.json()["view_count"]
        
        # View count should have increased
        assert new_views > initial_views
    
    def test_get_gig_not_found(self):
        """Getting non-existent gig should return 404"""
        response = requests.get(f"{BASE_URL}/api/gigs/non-existent-id-12345")
        assert response.status_code == 404


class TestMyGigs:
    """Test GET /api/gigs/my-gigs endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get auth token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login?username={ADMIN_USERNAME}&password={ADMIN_PASSWORD}"
        )
        if login_response.status_code == 200:
            self.token = login_response.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
    
    def test_get_my_gigs_requires_auth(self):
        """Getting my gigs without auth should return 401 or 403"""
        response = requests.get(f"{BASE_URL}/api/gigs/my-gigs")
        assert response.status_code in [401, 403]
    
    def test_get_my_gigs_returns_list(self):
        """Get my gigs should return a list"""
        response = requests.get(f"{BASE_URL}/api/gigs/my-gigs", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "gigs" in data
        assert isinstance(data["gigs"], list)
    
    def test_get_my_gigs_filter_by_type(self):
        """Filter my gigs by gig_type"""
        response = requests.get(f"{BASE_URL}/api/gigs/my-gigs?gig_type=looking_for", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        for gig in data["gigs"]:
            assert gig["gig_type"] == "looking_for"


class TestDeleteGig:
    """Test DELETE /api/gigs/{id} endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get auth token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login?username={ADMIN_USERNAME}&password={ADMIN_PASSWORD}"
        )
        if login_response.status_code == 200:
            self.token = login_response.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
    
    def test_delete_gig_requires_auth(self):
        """Deleting a gig without auth should return 401 or 403"""
        response = requests.delete(f"{BASE_URL}/api/gigs/some-gig-id")
        assert response.status_code in [401, 403]
    
    def test_delete_own_gig_success(self):
        """Delete own gig should succeed"""
        # First create a gig
        unique_id = str(uuid.uuid4())[:8]
        gig_data = {
            "gig_type": "looking_for",
            "title": f"TEST_Gig to Delete {unique_id}",
            "description": "This gig will be deleted in the test.",
            "category": "musician"
        }
        create_response = requests.post(f"{BASE_URL}/api/gigs", json=gig_data, headers=self.headers)
        assert create_response.status_code == 200
        gig_id = create_response.json()["id"]
        
        # Delete the gig
        delete_response = requests.delete(f"{BASE_URL}/api/gigs/{gig_id}", headers=self.headers)
        assert delete_response.status_code == 200
        
        # Verify it's deleted
        get_response = requests.get(f"{BASE_URL}/api/gigs/{gig_id}")
        assert get_response.status_code == 404
    
    def test_delete_nonexistent_gig_returns_404(self):
        """Deleting non-existent gig should return 404"""
        response = requests.delete(f"{BASE_URL}/api/gigs/non-existent-id-12345", headers=self.headers)
        assert response.status_code == 404


class TestUpdateGig:
    """Test PUT /api/gigs/{id} endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get auth token and create a test gig"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login?username={ADMIN_USERNAME}&password={ADMIN_PASSWORD}"
        )
        if login_response.status_code == 200:
            self.token = login_response.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
        
        # Create a test gig
        unique_id = str(uuid.uuid4())[:8]
        gig_data = {
            "gig_type": "looking_for",
            "title": f"TEST_Update Test Gig {unique_id}",
            "description": "This is a test gig for testing the update endpoint.",
            "category": "musician"
        }
        response = requests.post(f"{BASE_URL}/api/gigs", json=gig_data, headers=self.headers)
        if response.status_code == 200:
            self.test_gig_id = response.json()["id"]
        else:
            pytest.skip("Failed to create test gig")
        
        yield
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/gigs/{self.test_gig_id}", headers=self.headers)
    
    def test_update_gig_title(self):
        """Update gig title"""
        update_data = {"title": "Updated Test Gig Title"}
        response = requests.put(
            f"{BASE_URL}/api/gigs/{self.test_gig_id}",
            json=update_data,
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["title"] == "Updated Test Gig Title"
    
    def test_update_gig_description(self):
        """Update gig description"""
        update_data = {"description": "This is an updated description that is at least 20 characters."}
        response = requests.put(
            f"{BASE_URL}/api/gigs/{self.test_gig_id}",
            json=update_data,
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "updated description" in data["description"]
    
    def test_update_gig_location_and_budget(self):
        """Update gig location and budget"""
        update_data = {
            "location": "Chicago, IL",
            "budget_range": "$1000-2000"
        }
        response = requests.put(
            f"{BASE_URL}/api/gigs/{self.test_gig_id}",
            json=update_data,
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["location"] == "Chicago, IL"
        assert data["budget_range"] == "$1000-2000"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
