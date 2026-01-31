"""
Profile Media API Tests

Tests for the profile photos and videos feature:
- GET /api/profile/media/{user_id} - Get user's photos and videos
- POST /api/profile/media/photo - Upload a photo
- POST /api/profile/media/video - Upload a video
- DELETE /api/profile/media/{media_id} - Delete a media item
"""

import pytest
import requests
import os
from io import BytesIO
from PIL import Image

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestProfileMediaAPI:
    """Profile Media endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin to get token
        login_resp = self.session.post(
            f"{BASE_URL}/api/auth/login",
            params={"username": "miclocker.support", "password": "Eisenhower1212!!"}
        )
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        self.token = login_resp.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
        # Get user info
        me_resp = self.session.get(f"{BASE_URL}/api/auth/me")
        assert me_resp.status_code == 200
        self.user_id = me_resp.json().get("id")
        
        # Track created media for cleanup
        self.created_media_ids = []
        
        yield
        
        # Cleanup: Delete any media created during tests
        for media_id in self.created_media_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/profile/media/{media_id}")
            except:
                pass
    
    def _create_test_image(self):
        """Create a test image file"""
        img = Image.new('RGB', (100, 100), color='blue')
        buffer = BytesIO()
        img.save(buffer, format='JPEG')
        buffer.seek(0)
        return buffer
    
    def _create_test_video(self):
        """Create a minimal test video file (MP4 header)"""
        # Minimal MP4 file structure
        mp4_data = b'\x00\x00\x00\x1c\x66\x74\x79\x70\x69\x73\x6f\x6d\x00\x00\x02\x00\x69\x73\x6f\x6d\x69\x73\x6f\x32\x6d\x70\x34\x31'
        mp4_data += b'\x00\x00\x00\x08\x6d\x6f\x6f\x76'
        return BytesIO(mp4_data)
    
    # ==================== GET Media Tests ====================
    
    def test_get_user_media_success(self):
        """Test GET /api/profile/media/{user_id} returns photos and videos arrays"""
        response = self.session.get(f"{BASE_URL}/api/profile/media/{self.user_id}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "photos" in data, "Response should contain 'photos' array"
        assert "videos" in data, "Response should contain 'videos' array"
        assert isinstance(data["photos"], list), "photos should be a list"
        assert isinstance(data["videos"], list), "videos should be a list"
        
        print(f"SUCCESS: GET /api/profile/media/{self.user_id} - photos: {len(data['photos'])}, videos: {len(data['videos'])}")
    
    def test_get_user_media_nonexistent_user(self):
        """Test GET /api/profile/media/{user_id} with non-existent user returns 404"""
        response = self.session.get(f"{BASE_URL}/api/profile/media/nonexistent-user-id-12345")
        
        assert response.status_code == 404
        print("SUCCESS: GET /api/profile/media/nonexistent-user returns 404")
    
    def test_get_user_media_public_access(self):
        """Test GET /api/profile/media/{user_id} works without authentication"""
        # Create a new session without auth
        public_session = requests.Session()
        response = public_session.get(f"{BASE_URL}/api/profile/media/{self.user_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert "photos" in data
        assert "videos" in data
        print("SUCCESS: GET /api/profile/media works without authentication (public endpoint)")
    
    # ==================== POST Photo Tests ====================
    
    def test_upload_photo_success(self):
        """Test POST /api/profile/media/photo uploads a photo successfully"""
        image_buffer = self._create_test_image()
        
        files = {"file": ("test_photo.jpg", image_buffer, "image/jpeg")}
        
        # Remove Content-Type header for multipart upload
        headers = {"Authorization": f"Bearer {self.token}"}
        response = requests.post(
            f"{BASE_URL}/api/profile/media/photo",
            files=files,
            headers=headers
        )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data.get("success") == True
        assert "item" in data
        item = data["item"]
        assert "id" in item
        assert "url" in item
        assert item["type"] == "photo"
        assert "filename" in item
        assert "size" in item
        assert "uploaded_at" in item
        
        # Track for cleanup
        self.created_media_ids.append(item["id"])
        
        print(f"SUCCESS: POST /api/profile/media/photo - uploaded photo ID: {item['id']}")
    
    def test_upload_photo_invalid_type(self):
        """Test POST /api/profile/media/photo rejects invalid file types"""
        # Try to upload a text file as image
        files = {"file": ("test.txt", BytesIO(b"not an image"), "text/plain")}
        
        headers = {"Authorization": f"Bearer {self.token}"}
        response = requests.post(
            f"{BASE_URL}/api/profile/media/photo",
            files=files,
            headers=headers
        )
        
        assert response.status_code == 400
        assert "Invalid file type" in response.json().get("detail", "")
        print("SUCCESS: POST /api/profile/media/photo rejects invalid file types")
    
    def test_upload_photo_requires_auth(self):
        """Test POST /api/profile/media/photo requires authentication"""
        image_buffer = self._create_test_image()
        files = {"file": ("test_photo.jpg", image_buffer, "image/jpeg")}
        
        # No auth header
        response = requests.post(
            f"{BASE_URL}/api/profile/media/photo",
            files=files
        )
        
        # Accept both 401 (Unauthorized) and 403 (Forbidden) as valid auth rejection
        assert response.status_code in [401, 403], f"Expected 401 or 403, got {response.status_code}"
        print("SUCCESS: POST /api/profile/media/photo requires authentication")
    
    # ==================== POST Video Tests ====================
    
    def test_upload_video_success(self):
        """Test POST /api/profile/media/video uploads a video successfully"""
        video_buffer = self._create_test_video()
        
        files = {"file": ("test_video.mp4", video_buffer, "video/mp4")}
        
        headers = {"Authorization": f"Bearer {self.token}"}
        response = requests.post(
            f"{BASE_URL}/api/profile/media/video",
            files=files,
            headers=headers
        )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data.get("success") == True
        assert "item" in data
        item = data["item"]
        assert "id" in item
        assert "url" in item
        assert item["type"] == "video"
        assert "filename" in item
        assert "size" in item
        assert "uploaded_at" in item
        
        # Track for cleanup
        self.created_media_ids.append(item["id"])
        
        print(f"SUCCESS: POST /api/profile/media/video - uploaded video ID: {item['id']}")
    
    def test_upload_video_invalid_type(self):
        """Test POST /api/profile/media/video rejects invalid file types"""
        # Try to upload a text file as video
        files = {"file": ("test.txt", BytesIO(b"not a video"), "text/plain")}
        
        headers = {"Authorization": f"Bearer {self.token}"}
        response = requests.post(
            f"{BASE_URL}/api/profile/media/video",
            files=files,
            headers=headers
        )
        
        assert response.status_code == 400
        assert "Invalid file type" in response.json().get("detail", "")
        print("SUCCESS: POST /api/profile/media/video rejects invalid file types")
    
    def test_upload_video_requires_auth(self):
        """Test POST /api/profile/media/video requires authentication"""
        video_buffer = self._create_test_video()
        files = {"file": ("test_video.mp4", video_buffer, "video/mp4")}
        
        # No auth header
        response = requests.post(
            f"{BASE_URL}/api/profile/media/video",
            files=files
        )
        
        # Accept both 401 (Unauthorized) and 403 (Forbidden) as valid auth rejection
        assert response.status_code in [401, 403], f"Expected 401 or 403, got {response.status_code}"
        print("SUCCESS: POST /api/profile/media/video requires authentication")
    
    # ==================== DELETE Media Tests ====================
    
    def test_delete_media_success(self):
        """Test DELETE /api/profile/media/{media_id} deletes media successfully"""
        # First upload a photo
        image_buffer = self._create_test_image()
        files = {"file": ("test_delete.jpg", image_buffer, "image/jpeg")}
        headers = {"Authorization": f"Bearer {self.token}"}
        
        upload_resp = requests.post(
            f"{BASE_URL}/api/profile/media/photo",
            files=files,
            headers=headers
        )
        assert upload_resp.status_code == 200
        media_id = upload_resp.json()["item"]["id"]
        
        # Now delete it
        delete_resp = self.session.delete(f"{BASE_URL}/api/profile/media/{media_id}")
        
        assert delete_resp.status_code == 200
        data = delete_resp.json()
        assert data.get("success") == True
        assert "deleted" in data.get("message", "").lower()
        
        # Verify it's gone from the list
        list_resp = self.session.get(f"{BASE_URL}/api/profile/media/{self.user_id}")
        photos = list_resp.json().get("photos", [])
        photo_ids = [p["id"] for p in photos]
        assert media_id not in photo_ids, "Deleted photo should not appear in list"
        
        print(f"SUCCESS: DELETE /api/profile/media/{media_id} - media deleted and verified")
    
    def test_delete_media_nonexistent(self):
        """Test DELETE /api/profile/media/{media_id} with non-existent ID returns 404"""
        response = self.session.delete(f"{BASE_URL}/api/profile/media/nonexistent-media-id-12345")
        
        assert response.status_code == 404
        print("SUCCESS: DELETE /api/profile/media/nonexistent returns 404")
    
    def test_delete_media_requires_auth(self):
        """Test DELETE /api/profile/media/{media_id} requires authentication"""
        # First upload a photo
        image_buffer = self._create_test_image()
        files = {"file": ("test_auth.jpg", image_buffer, "image/jpeg")}
        headers = {"Authorization": f"Bearer {self.token}"}
        
        upload_resp = requests.post(
            f"{BASE_URL}/api/profile/media/photo",
            files=files,
            headers=headers
        )
        assert upload_resp.status_code == 200
        media_id = upload_resp.json()["item"]["id"]
        self.created_media_ids.append(media_id)
        
        # Try to delete without auth
        public_session = requests.Session()
        delete_resp = public_session.delete(f"{BASE_URL}/api/profile/media/{media_id}")
        
        # Accept both 401 (Unauthorized) and 403 (Forbidden) as valid auth rejection
        assert delete_resp.status_code in [401, 403], f"Expected 401 or 403, got {delete_resp.status_code}"
        print("SUCCESS: DELETE /api/profile/media requires authentication")
    
    # ==================== Integration Tests ====================
    
    def test_upload_photo_appears_in_list(self):
        """Test that uploaded photo appears in GET media list"""
        # Upload a photo
        image_buffer = self._create_test_image()
        files = {"file": ("test_list.jpg", image_buffer, "image/jpeg")}
        headers = {"Authorization": f"Bearer {self.token}"}
        
        upload_resp = requests.post(
            f"{BASE_URL}/api/profile/media/photo",
            files=files,
            headers=headers
        )
        assert upload_resp.status_code == 200
        media_id = upload_resp.json()["item"]["id"]
        self.created_media_ids.append(media_id)
        
        # Verify it appears in the list
        list_resp = self.session.get(f"{BASE_URL}/api/profile/media/{self.user_id}")
        assert list_resp.status_code == 200
        
        photos = list_resp.json().get("photos", [])
        photo_ids = [p["id"] for p in photos]
        assert media_id in photo_ids, "Uploaded photo should appear in list"
        
        print(f"SUCCESS: Uploaded photo {media_id} appears in GET media list")
    
    def test_upload_video_appears_in_list(self):
        """Test that uploaded video appears in GET media list"""
        # Upload a video
        video_buffer = self._create_test_video()
        files = {"file": ("test_list.mp4", video_buffer, "video/mp4")}
        headers = {"Authorization": f"Bearer {self.token}"}
        
        upload_resp = requests.post(
            f"{BASE_URL}/api/profile/media/video",
            files=files,
            headers=headers
        )
        assert upload_resp.status_code == 200
        media_id = upload_resp.json()["item"]["id"]
        self.created_media_ids.append(media_id)
        
        # Verify it appears in the list
        list_resp = self.session.get(f"{BASE_URL}/api/profile/media/{self.user_id}")
        assert list_resp.status_code == 200
        
        videos = list_resp.json().get("videos", [])
        video_ids = [v["id"] for v in videos]
        assert media_id in video_ids, "Uploaded video should appear in list"
        
        print(f"SUCCESS: Uploaded video {media_id} appears in GET media list")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
