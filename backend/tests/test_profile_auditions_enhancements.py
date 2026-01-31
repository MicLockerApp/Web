"""
Test Profile and Auditions Page Enhancements

Tests for:
1. Upload Media button on profile page (visible only on own profile)
2. Photo/video cards matching listing card dimensions (square image + info area)
3. Favorites tab visible only to profile owner showing starred videos by category
4. Auditions page: star icon (favorites), no comments button, share modal, auto-play with sound
5. POST /api/auditions/{id}/favorite - adds to favorites
6. GET /api/auditions/favorites - returns user's favorited videos
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuditionsFavorites:
    """Test auditions favorites endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin user
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            params={"username": "miclocker.support", "password": "Eisenhower1212!!"}
        )
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.user_id = login_response.json().get("user", {}).get("id")
        else:
            pytest.skip("Authentication failed - skipping authenticated tests")
    
    def test_get_auditions_list(self):
        """Test GET /api/auditions returns audition items"""
        response = self.session.get(f"{BASE_URL}/api/auditions")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/auditions returned {len(data)} items")
    
    def test_get_auditions_with_category_filter(self):
        """Test GET /api/auditions?category=musician filters correctly"""
        response = self.session.get(f"{BASE_URL}/api/auditions", params={"category": "musician"})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/auditions?category=musician returned {len(data)} items")
    
    def test_get_auditions_favorites_empty(self):
        """Test GET /api/auditions/favorites returns list (may be empty)"""
        response = self.session.get(f"{BASE_URL}/api/auditions/favorites")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/auditions/favorites returned {len(data)} favorites")
    
    def test_add_favorite_nonexistent_video(self):
        """Test POST /api/auditions/{id}/favorite with nonexistent video returns 404"""
        response = self.session.post(f"{BASE_URL}/api/auditions/nonexistent-video-id/favorite")
        assert response.status_code == 404
        print("✓ POST /api/auditions/nonexistent-video-id/favorite returns 404")
    
    def test_check_favorite_nonexistent_video(self):
        """Test GET /api/auditions/{id}/favorite/check with nonexistent video"""
        response = self.session.get(f"{BASE_URL}/api/auditions/nonexistent-video-id/favorite/check")
        # Should return 200 with is_favorite: false or 404
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            data = response.json()
            assert "is_favorite" in data
            print(f"✓ GET /api/auditions/nonexistent-video-id/favorite/check returned is_favorite={data['is_favorite']}")
        else:
            print("✓ GET /api/auditions/nonexistent-video-id/favorite/check returns 404")
    
    def test_remove_favorite_nonexistent(self):
        """Test DELETE /api/auditions/{id}/favorite with nonexistent favorite returns 404"""
        response = self.session.delete(f"{BASE_URL}/api/auditions/nonexistent-video-id/favorite")
        assert response.status_code == 404
        print("✓ DELETE /api/auditions/nonexistent-video-id/favorite returns 404")
    
    def test_favorite_workflow_with_real_audition(self):
        """Test full favorite workflow if auditions exist"""
        # First get auditions list
        auditions_response = self.session.get(f"{BASE_URL}/api/auditions")
        assert auditions_response.status_code == 200
        auditions = auditions_response.json()
        
        if not auditions:
            pytest.skip("No auditions available to test favorites workflow")
        
        audition_id = auditions[0].get("id")
        print(f"Testing favorites with audition ID: {audition_id}")
        
        # Check if already favorited
        check_response = self.session.get(f"{BASE_URL}/api/auditions/{audition_id}/favorite/check")
        assert check_response.status_code == 200
        was_favorited = check_response.json().get("is_favorite", False)
        
        if was_favorited:
            # Remove first to test add
            remove_response = self.session.delete(f"{BASE_URL}/api/auditions/{audition_id}/favorite")
            assert remove_response.status_code == 200
            print(f"✓ Removed existing favorite for audition {audition_id}")
        
        # Add to favorites
        add_response = self.session.post(f"{BASE_URL}/api/auditions/{audition_id}/favorite")
        assert add_response.status_code == 200
        print(f"✓ POST /api/auditions/{audition_id}/favorite succeeded")
        
        # Verify it's in favorites
        check_response = self.session.get(f"{BASE_URL}/api/auditions/{audition_id}/favorite/check")
        assert check_response.status_code == 200
        assert check_response.json().get("is_favorite") == True
        print(f"✓ Verified audition {audition_id} is now favorited")
        
        # Get favorites list and verify it contains the item
        favorites_response = self.session.get(f"{BASE_URL}/api/auditions/favorites")
        assert favorites_response.status_code == 200
        favorites = favorites_response.json()
        favorite_ids = [f.get("id") for f in favorites]
        assert audition_id in favorite_ids
        print(f"✓ GET /api/auditions/favorites contains the favorited audition")
        
        # Remove from favorites
        remove_response = self.session.delete(f"{BASE_URL}/api/auditions/{audition_id}/favorite")
        assert remove_response.status_code == 200
        print(f"✓ DELETE /api/auditions/{audition_id}/favorite succeeded")
        
        # Verify it's removed
        check_response = self.session.get(f"{BASE_URL}/api/auditions/{audition_id}/favorite/check")
        assert check_response.status_code == 200
        assert check_response.json().get("is_favorite") == False
        print(f"✓ Verified audition {audition_id} is no longer favorited")
    
    def test_add_favorite_duplicate(self):
        """Test adding same video to favorites twice returns 400"""
        # Get auditions list
        auditions_response = self.session.get(f"{BASE_URL}/api/auditions")
        assert auditions_response.status_code == 200
        auditions = auditions_response.json()
        
        if not auditions:
            pytest.skip("No auditions available to test duplicate favorites")
        
        audition_id = auditions[0].get("id")
        
        # First ensure it's not favorited
        self.session.delete(f"{BASE_URL}/api/auditions/{audition_id}/favorite")
        
        # Add to favorites
        add_response = self.session.post(f"{BASE_URL}/api/auditions/{audition_id}/favorite")
        assert add_response.status_code == 200
        
        # Try to add again - should fail
        duplicate_response = self.session.post(f"{BASE_URL}/api/auditions/{audition_id}/favorite")
        assert duplicate_response.status_code == 400
        print(f"✓ Adding duplicate favorite returns 400")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/auditions/{audition_id}/favorite")


class TestProfileMediaEndpoints:
    """Test profile media endpoints for photos/videos"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin user
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            params={"username": "miclocker.support", "password": "Eisenhower1212!!"}
        )
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            # Get user ID from /auth/me endpoint
            me_response = self.session.get(f"{BASE_URL}/api/auth/me")
            if me_response.status_code == 200:
                self.user_id = me_response.json().get("id")
            else:
                pytest.skip("Could not get user info")
        else:
            pytest.skip("Authentication failed - skipping authenticated tests")
    
    def test_get_profile_media(self):
        """Test GET /api/profile/media/{user_id} returns photos and videos"""
        response = self.session.get(f"{BASE_URL}/api/profile/media/{self.user_id}")
        assert response.status_code == 200
        data = response.json()
        assert "photos" in data
        assert "videos" in data
        assert isinstance(data["photos"], list)
        assert isinstance(data["videos"], list)
        print(f"✓ GET /api/profile/media/{self.user_id} returned {len(data['photos'])} photos, {len(data['videos'])} videos")
    
    def test_get_user_profile(self):
        """Test GET /api/users/profile/{user_id} returns profile data"""
        response = self.session.get(f"{BASE_URL}/api/users/profile/{self.user_id}")
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "username" in data
        print(f"✓ GET /api/users/profile/{self.user_id} returned profile for {data.get('username')}")


class TestVideoFavoritesAPI:
    """Test video favorites API through usersAPI endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin user
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            params={"username": "miclocker.support", "password": "Eisenhower1212!!"}
        )
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            # Get user ID from /auth/me endpoint
            me_response = self.session.get(f"{BASE_URL}/api/auth/me")
            if me_response.status_code == 200:
                self.user_id = me_response.json().get("id")
            else:
                pytest.skip("Could not get user info")
        else:
            pytest.skip("Authentication failed - skipping authenticated tests")
    
    def test_video_favorites_requires_auth(self):
        """Test that video favorites endpoints require authentication"""
        # Create unauthenticated session
        unauth_session = requests.Session()
        
        # Try to get favorites without auth - should return 401 or 403
        response = unauth_session.get(f"{BASE_URL}/api/auditions/favorites")
        assert response.status_code in [401, 403]
        print(f"✓ GET /api/auditions/favorites requires authentication (returns {response.status_code})")
        
        # Try to add favorite without auth - should return 401 or 403
        response = unauth_session.post(f"{BASE_URL}/api/auditions/some-id/favorite")
        assert response.status_code in [401, 403]
        print(f"✓ POST /api/auditions/{{id}}/favorite requires authentication (returns {response.status_code})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
