"""
S3 Upload API Tests for MicLocker
Tests S3 presigned URL generation, direct uploads, and listing creation with S3 media
"""

import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_USERNAME = "miclocker.support"
ADMIN_PASSWORD = "Eisenhower1212!!"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for admin user"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        params={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture
def auth_headers(auth_token):
    """Headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestS3UploadStatus:
    """Test S3 upload status endpoint"""
    
    def test_upload_status_returns_s3_enabled(self):
        """GET /api/uploads/status should return s3_enabled: true"""
        response = requests.get(f"{BASE_URL}/api/uploads/status")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "s3_enabled" in data, "Response should contain s3_enabled field"
        assert data["s3_enabled"] == True, "S3 should be enabled"
        assert data["bucket_name"] == "miclocker-saint-louis-bucket", "Bucket name should match"
        assert data["region"] == "us-east-2", "Region should be us-east-2"
        assert data["local_fallback"] == False, "Local fallback should be false when S3 is enabled"
        print(f"✓ S3 status: enabled={data['s3_enabled']}, bucket={data['bucket_name']}, region={data['region']}")


class TestPresignedUrlGeneration:
    """Test presigned URL generation endpoints"""
    
    def test_presigned_url_requires_auth(self):
        """POST /api/uploads/presigned-url should require authentication"""
        response = requests.post(
            f"{BASE_URL}/api/uploads/presigned-url",
            json={
                "filename": "test.jpg",
                "content_type": "image/jpeg"
            }
        )
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Presigned URL endpoint requires authentication")
    
    def test_presigned_url_generation_with_auth(self, auth_headers):
        """POST /api/uploads/presigned-url should generate presigned URL with auth"""
        response = requests.post(
            f"{BASE_URL}/api/uploads/presigned-url",
            headers=auth_headers,
            json={
                "filename": "test_image.jpg",
                "content_type": "image/jpeg"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "upload_url" in data, "Response should contain upload_url"
        assert "fields" in data, "Response should contain fields for POST upload"
        assert "key" in data, "Response should contain S3 object key"
        assert "public_url" in data, "Response should contain public_url"
        assert "expires_in" in data, "Response should contain expires_in"
        
        # Verify URL structure - upload_url is the S3 bucket URL, public_url has the region
        assert "miclocker-saint-louis-bucket" in data["upload_url"], "Upload URL should contain bucket name"
        assert "s3.us-east-2.amazonaws.com" in data["public_url"], "Public URL should have region"
        assert data["key"].startswith("temp/"), "Key should start with temp/ when no listing_id"
        
        print(f"✓ Presigned URL generated: key={data['key']}, expires_in={data['expires_in']}")
    
    def test_presigned_url_with_listing_id(self, auth_headers):
        """POST /api/uploads/presigned-url with listing_id should use listings/ folder"""
        response = requests.post(
            f"{BASE_URL}/api/uploads/presigned-url",
            headers=auth_headers,
            json={
                "filename": "test_image.jpg",
                "content_type": "image/jpeg",
                "listing_id": "test-listing-123"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["key"].startswith("listings/"), "Key should start with listings/ when listing_id provided"
        print(f"✓ Presigned URL with listing_id: key={data['key']}")
    
    def test_presigned_url_invalid_content_type(self, auth_headers):
        """POST /api/uploads/presigned-url should reject invalid content types"""
        response = requests.post(
            f"{BASE_URL}/api/uploads/presigned-url",
            headers=auth_headers,
            json={
                "filename": "test.exe",
                "content_type": "application/x-msdownload"
            }
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Invalid content type rejected")


class TestPresignedPutUrl:
    """Test presigned PUT URL generation"""
    
    def test_presigned_put_url_requires_auth(self):
        """POST /api/uploads/presigned-put-url should require authentication"""
        response = requests.post(
            f"{BASE_URL}/api/uploads/presigned-put-url",
            json={
                "filename": "test.jpg",
                "content_type": "image/jpeg"
            }
        )
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Presigned PUT URL endpoint requires authentication")
    
    def test_presigned_put_url_generation(self, auth_headers):
        """POST /api/uploads/presigned-put-url should generate PUT URL"""
        response = requests.post(
            f"{BASE_URL}/api/uploads/presigned-put-url",
            headers=auth_headers,
            json={
                "filename": "test_video.mp4",
                "content_type": "video/mp4"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "upload_url" in data, "Response should contain upload_url"
        assert "key" in data, "Response should contain S3 object key"
        assert "public_url" in data, "Response should contain public_url"
        assert "content_type" in data, "Response should contain content_type"
        
        # PUT URL should be a direct S3 URL with signature
        assert "X-Amz-Signature" in data["upload_url"], "PUT URL should contain signature"
        
        print(f"✓ Presigned PUT URL generated: key={data['key']}")


class TestDirectUpload:
    """Test direct upload endpoint"""
    
    def test_direct_upload_requires_auth(self):
        """POST /api/uploads/direct should require authentication"""
        # Create a small test file
        files = {
            'file': ('test.jpg', b'fake image content', 'image/jpeg')
        }
        
        response = requests.post(
            f"{BASE_URL}/api/uploads/direct",
            files=files
        )
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Direct upload endpoint requires authentication")
    
    def test_direct_upload_with_auth(self, auth_token):
        """POST /api/uploads/direct should upload file to S3"""
        # Create a small test image (1x1 pixel PNG)
        png_data = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  # PNG signature
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,  # IHDR chunk
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,  # 1x1 dimensions
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
            0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
            0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F,
            0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59,
            0xE7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
            0x44, 0xAE, 0x42, 0x60, 0x82
        ])
        
        files = {
            'file': ('test_upload.png', png_data, 'image/png')
        }
        
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/uploads/direct",
            headers=headers,
            files=files
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] == True, "Upload should be successful"
        assert "key" in data, "Response should contain S3 key"
        assert "url" in data, "Response should contain public URL"
        assert data["filename"] == "test_upload.png", "Filename should match"
        assert data["content_type"] == "image/png", "Content type should match"
        assert data["size"] > 0, "Size should be greater than 0"
        
        # Verify URL is S3 URL
        assert "miclocker-saint-louis-bucket.s3.us-east-2.amazonaws.com" in data["url"], "URL should be S3 URL"
        
        print(f"✓ Direct upload successful: key={data['key']}, url={data['url']}")
        
        return data["key"]  # Return key for cleanup
    
    def test_direct_upload_invalid_file_type(self, auth_token):
        """POST /api/uploads/direct should reject invalid file types"""
        files = {
            'file': ('test.exe', b'fake executable', 'application/x-msdownload')
        }
        
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/uploads/direct",
            headers=headers,
            files=files
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Invalid file type rejected for direct upload")


class TestListingWithS3Media:
    """Test listing creation with S3 media URLs"""
    
    def test_create_listing_with_s3_media(self, auth_headers):
        """POST /api/listings should accept media array with S3 URLs"""
        listing_data = {
            "title": "TEST_S3_Upload Test Guitar",
            "description": "This is a test listing to verify S3 media integration works correctly.",
            "brand": "Fender",
            "model": "Stratocaster",
            "category": "Guitars",
            "condition": "Excellent",
            "price": 999.99,
            "quantity": 1,
            "accepts_offers": True,
            "shipping": {
                "method": "Standard",
                "price": 25.00,
                "estimated_days": "3-5 business days"
            },
            "tags": ["test", "s3", "upload"],
            "media": [
                {
                    "url": "https://miclocker-saint-louis-bucket.s3.us-east-2.amazonaws.com/listings/test/image1.jpg",
                    "key": "listings/test/image1.jpg",
                    "type": "image",
                    "is_primary": True
                },
                {
                    "url": "https://miclocker-saint-louis-bucket.s3.us-east-2.amazonaws.com/listings/test/image2.jpg",
                    "key": "listings/test/image2.jpg",
                    "type": "image",
                    "is_primary": False
                }
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/listings",
            headers=auth_headers,
            json=listing_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain listing id"
        assert data["title"] == listing_data["title"], "Title should match"
        assert "media" in data, "Response should contain media array"
        assert len(data["media"]) == 2, "Should have 2 media items"
        
        # Verify media structure
        primary_media = next((m for m in data["media"] if m.get("is_primary")), None)
        assert primary_media is not None, "Should have a primary media item"
        assert "url" in primary_media, "Media should have url"
        
        print(f"✓ Listing created with S3 media: id={data['id']}, media_count={len(data['media'])}")
        
        # Cleanup - delete the test listing
        listing_id = data["id"]
        delete_response = requests.delete(
            f"{BASE_URL}/api/listings/{listing_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200, f"Failed to cleanup test listing: {delete_response.status_code}"
        print(f"✓ Test listing cleaned up: id={listing_id}")
    
    def test_create_listing_without_media(self, auth_headers):
        """POST /api/listings should work without media array"""
        listing_data = {
            "title": "TEST_S3_No Media Listing",
            "description": "This is a test listing without any media to verify it still works.",
            "category": "Accessories",
            "condition": "Brand New",
            "price": 49.99,
            "quantity": 1,
            "accepts_offers": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/listings",
            headers=auth_headers,
            json=listing_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain listing id"
        assert data["media"] == [] or data["media"] is None or len(data["media"]) == 0, "Media should be empty"
        
        print(f"✓ Listing created without media: id={data['id']}")
        
        # Cleanup
        listing_id = data["id"]
        requests.delete(f"{BASE_URL}/api/listings/{listing_id}", headers=auth_headers)
        print(f"✓ Test listing cleaned up: id={listing_id}")


class TestListingFilesEndpoint:
    """Test listing files retrieval endpoint"""
    
    def test_get_listing_files(self):
        """GET /api/uploads/listing/{listing_id} should return files for a listing"""
        # Use a fake listing ID - should return empty list
        response = requests.get(f"{BASE_URL}/api/uploads/listing/test-listing-123")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "listing_id" in data, "Response should contain listing_id"
        assert "files" in data, "Response should contain files array"
        assert "storage" in data, "Response should contain storage type"
        assert data["storage"] == "s3", "Storage should be s3"
        
        print(f"✓ Listing files endpoint works: storage={data['storage']}, files_count={len(data['files'])}")


class TestAllowedFileTypes:
    """Test that all allowed file types work"""
    
    def test_allowed_image_types(self, auth_headers):
        """Presigned URL should work for all allowed image types"""
        allowed_types = [
            ("test.jpg", "image/jpeg"),
            ("test.png", "image/png"),
            ("test.webp", "image/webp"),
            ("test.gif", "image/gif")
        ]
        
        for filename, content_type in allowed_types:
            response = requests.post(
                f"{BASE_URL}/api/uploads/presigned-url",
                headers=auth_headers,
                json={"filename": filename, "content_type": content_type}
            )
            
            assert response.status_code == 200, f"Failed for {content_type}: {response.status_code}"
            print(f"✓ {content_type} accepted")
    
    def test_allowed_video_types(self, auth_headers):
        """Presigned URL should work for all allowed video types"""
        allowed_types = [
            ("test.mp4", "video/mp4"),
            ("test.mov", "video/quicktime"),
            ("test.webm", "video/webm")
        ]
        
        for filename, content_type in allowed_types:
            response = requests.post(
                f"{BASE_URL}/api/uploads/presigned-url",
                headers=auth_headers,
                json={"filename": filename, "content_type": content_type}
            )
            
            assert response.status_code == 200, f"Failed for {content_type}: {response.status_code}"
            print(f"✓ {content_type} accepted")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
