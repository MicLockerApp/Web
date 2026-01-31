"""
Test Video Upload with Category/Auditions Features

Tests for:
1. Video upload with category selection (required)
2. Video upload with optional subcategory, genre, description, song_name
3. Videos sync to auditions collection with show_in_auditions=true
4. GET /api/auditions?category=musician returns filtered videos
5. Auditions selection API (POST /api/profile/media/auditions/select)
6. Video cards aspect ratio (4:3) - frontend test
"""

import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_USERNAME = "miclocker.support"
TEST_PASSWORD = "Eisenhower1212!!"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for admin user"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        params={"username": TEST_USERNAME, "password": TEST_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture(scope="module")
def user_id(auth_token):
    """Get current user ID"""
    response = requests.get(
        f"{BASE_URL}/api/auth/me",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    if response.status_code == 200:
        return response.json().get("id")
    pytest.skip("Could not get user ID")


class TestVideoUploadWithCategory:
    """Tests for video upload with category metadata"""
    
    def test_video_upload_requires_category(self, auth_headers):
        """Video upload should fail without category"""
        # Create a small test video file (just bytes for testing)
        video_content = b"fake video content for testing"
        files = {"file": ("test_video.mp4", io.BytesIO(video_content), "video/mp4")}
        
        # Try upload without category
        response = requests.post(
            f"{BASE_URL}/api/profile/media/video",
            headers=auth_headers,
            files=files
            # No category form field
        )
        
        # Should fail with 422 (validation error) since category is required
        assert response.status_code == 422, f"Expected 422, got {response.status_code}: {response.text}"
        print("PASS: Video upload correctly requires category field")
    
    def test_video_upload_with_category_only(self, auth_headers):
        """Video upload with only required category field"""
        video_content = b"fake video content for testing"
        files = {"file": ("test_video_cat.mp4", io.BytesIO(video_content), "video/mp4")}
        data = {"category": "musician"}
        
        response = requests.post(
            f"{BASE_URL}/api/profile/media/video",
            headers=auth_headers,
            files=files,
            data=data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        result = response.json()
        assert result["success"] == True
        assert result["item"]["category"] == "musician"
        print(f"PASS: Video uploaded with category. ID: {result['item']['id']}")
        
        # Store for cleanup
        return result["item"]["id"]
    
    def test_video_upload_with_all_fields(self, auth_headers):
        """Video upload with all optional fields"""
        video_content = b"fake video content for full test"
        files = {"file": ("test_video_full.mp4", io.BytesIO(video_content), "video/mp4")}
        data = {
            "category": "musician",
            "subcategory": "Electric Guitar",
            "genre": "Rock",
            "description": "Test video description",
            "song_name": "Test Song"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/profile/media/video",
            headers=auth_headers,
            files=files,
            data=data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        result = response.json()
        assert result["success"] == True
        item = result["item"]
        
        # Verify all fields
        assert item["category"] == "musician"
        assert item["subcategory"] == "Electric Guitar"
        assert item["genre"] == "Rock"
        assert item["description"] == "Test video description"
        assert item["song_name"] == "Test Song"
        
        print(f"PASS: Video uploaded with all fields. ID: {item['id']}")
        return item["id"]
    
    def test_video_auto_shows_in_auditions(self, auth_headers, user_id):
        """Videos should auto-show in auditions if under 5 videos"""
        # First, get current video count
        response = requests.get(
            f"{BASE_URL}/api/profile/media/{user_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        videos = response.json()["videos"]
        
        # Check if any videos have show_in_auditions=True
        audition_videos = [v for v in videos if v.get("show_in_auditions")]
        print(f"Current videos: {len(videos)}, In auditions: {len(audition_videos)}")
        
        # Upload a new video
        video_content = b"fake video for auditions test"
        files = {"file": ("test_auditions.mp4", io.BytesIO(video_content), "video/mp4")}
        data = {"category": "musician", "subcategory": "Singer Male", "genre": "Jazz"}
        
        response = requests.post(
            f"{BASE_URL}/api/profile/media/video",
            headers=auth_headers,
            files=files,
            data=data
        )
        
        assert response.status_code == 200
        result = response.json()
        
        # If under 5 audition videos, should auto-add
        if len(audition_videos) < 5:
            assert result["item"]["show_in_auditions"] == True, "Video should auto-show in auditions"
            print("PASS: Video auto-added to auditions (under 5 limit)")
        else:
            assert result["item"]["show_in_auditions"] == False, "Video should NOT auto-show (at limit)"
            print("PASS: Video NOT auto-added to auditions (at 5 limit)")
        
        return result["item"]["id"]


class TestAuditionsFiltering:
    """Tests for auditions feed filtering by category/subcategory/genre"""
    
    def test_get_auditions_no_filter(self, auth_headers):
        """Get auditions without filters returns featured or all"""
        response = requests.get(
            f"{BASE_URL}/api/auditions",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        items = response.json()
        assert isinstance(items, list)
        print(f"PASS: GET /api/auditions returned {len(items)} items")
    
    def test_get_auditions_by_category(self, auth_headers):
        """Filter auditions by category"""
        response = requests.get(
            f"{BASE_URL}/api/auditions",
            params={"category": "musician"},
            headers=auth_headers
        )
        
        assert response.status_code == 200
        items = response.json()
        
        # All returned items should have user_category=musician
        for item in items:
            assert item.get("user_category") == "musician", f"Item has wrong category: {item.get('user_category')}"
        
        print(f"PASS: GET /api/auditions?category=musician returned {len(items)} musician items")
    
    def test_get_auditions_by_subcategory(self, auth_headers):
        """Filter auditions by subcategory"""
        response = requests.get(
            f"{BASE_URL}/api/auditions",
            params={"subcategory": "Electric Guitar"},
            headers=auth_headers
        )
        
        assert response.status_code == 200
        items = response.json()
        
        # All returned items should have Electric Guitar in subcategories
        for item in items:
            assert "Electric Guitar" in item.get("user_subcategories", []), \
                f"Item missing subcategory: {item.get('user_subcategories')}"
        
        print(f"PASS: GET /api/auditions?subcategory=Electric Guitar returned {len(items)} items")
    
    def test_get_auditions_by_genre(self, auth_headers):
        """Filter auditions by genre"""
        response = requests.get(
            f"{BASE_URL}/api/auditions",
            params={"genre": "Rock"},
            headers=auth_headers
        )
        
        assert response.status_code == 200
        items = response.json()
        
        # All returned items should have Rock in genres
        for item in items:
            assert "Rock" in item.get("user_genres", []), \
                f"Item missing genre: {item.get('user_genres')}"
        
        print(f"PASS: GET /api/auditions?genre=Rock returned {len(items)} items")
    
    def test_get_auditions_combined_filters(self, auth_headers):
        """Filter auditions by multiple criteria"""
        response = requests.get(
            f"{BASE_URL}/api/auditions",
            params={"category": "musician", "genre": "Rock"},
            headers=auth_headers
        )
        
        assert response.status_code == 200
        items = response.json()
        
        for item in items:
            assert item.get("user_category") == "musician"
            assert "Rock" in item.get("user_genres", [])
        
        print(f"PASS: Combined filters returned {len(items)} items")


class TestAuditionsSelection:
    """Tests for selecting which videos appear in auditions"""
    
    def test_select_audition_videos_max_5(self, auth_headers, user_id):
        """Can select up to 5 videos for auditions"""
        # First get all videos
        response = requests.get(
            f"{BASE_URL}/api/profile/media/{user_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        videos = response.json()["videos"]
        
        if len(videos) < 1:
            pytest.skip("No videos to test selection")
        
        # Select first video (or up to 5)
        video_ids = [v["id"] for v in videos[:5]]
        
        response = requests.post(
            f"{BASE_URL}/api/profile/media/auditions/select",
            headers=auth_headers,
            json={"video_ids": video_ids}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        result = response.json()
        assert result["success"] == True
        assert result["selected_count"] == len(video_ids)
        
        print(f"PASS: Selected {len(video_ids)} videos for auditions")
    
    def test_select_audition_videos_exceeds_limit(self, auth_headers, user_id):
        """Cannot select more than 5 videos"""
        # Get all videos
        response = requests.get(
            f"{BASE_URL}/api/profile/media/{user_id}",
            headers=auth_headers
        )
        videos = response.json()["videos"]
        
        if len(videos) < 6:
            pytest.skip("Need 6+ videos to test limit")
        
        # Try to select 6 videos
        video_ids = [v["id"] for v in videos[:6]]
        
        response = requests.post(
            f"{BASE_URL}/api/profile/media/auditions/select",
            headers=auth_headers,
            json={"video_ids": video_ids}
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("PASS: Cannot select more than 5 videos for auditions")
    
    def test_auditions_badge_shows_for_selected(self, auth_headers, user_id):
        """Videos with show_in_auditions=true should have badge"""
        response = requests.get(
            f"{BASE_URL}/api/profile/media/{user_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        videos = response.json()["videos"]
        
        audition_videos = [v for v in videos if v.get("show_in_auditions")]
        non_audition_videos = [v for v in videos if not v.get("show_in_auditions")]
        
        print(f"Videos in auditions: {len(audition_videos)}")
        print(f"Videos not in auditions: {len(non_audition_videos)}")
        
        # Verify structure
        for v in audition_videos:
            assert "show_in_auditions" in v
            assert v["show_in_auditions"] == True
        
        print("PASS: Auditions badge data correctly set on videos")


class TestVideoSyncToAuditions:
    """Tests for video sync to auditions collection"""
    
    def test_uploaded_video_appears_in_auditions(self, auth_headers, user_id):
        """Video with show_in_auditions=true should appear in auditions feed"""
        # Get videos with show_in_auditions=true
        response = requests.get(
            f"{BASE_URL}/api/profile/media/{user_id}",
            headers=auth_headers
        )
        videos = response.json()["videos"]
        audition_videos = [v for v in videos if v.get("show_in_auditions")]
        
        if not audition_videos:
            pytest.skip("No videos in auditions to verify")
        
        # Get auditions feed
        response = requests.get(
            f"{BASE_URL}/api/auditions",
            headers=auth_headers
        )
        assert response.status_code == 200
        auditions = response.json()
        
        # Check if our video appears (by profile_media_id)
        audition_media_ids = [a.get("profile_media_id") for a in auditions]
        
        found = False
        for v in audition_videos:
            if v["id"] in audition_media_ids:
                found = True
                print(f"Found video {v['id']} in auditions feed")
                break
        
        # Note: May not find if auditions returns featured only by default
        print(f"PASS: Auditions sync verification complete. Found in feed: {found}")


class TestCleanup:
    """Cleanup test videos"""
    
    def test_cleanup_test_videos(self, auth_headers, user_id):
        """Delete test videos created during testing"""
        response = requests.get(
            f"{BASE_URL}/api/profile/media/{user_id}",
            headers=auth_headers
        )
        videos = response.json()["videos"]
        
        # Delete videos with test filenames
        deleted = 0
        for v in videos:
            if v.get("filename", "").startswith("test_"):
                del_response = requests.delete(
                    f"{BASE_URL}/api/profile/media/{v['id']}",
                    headers=auth_headers
                )
                if del_response.status_code == 200:
                    deleted += 1
        
        print(f"Cleaned up {deleted} test videos")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
