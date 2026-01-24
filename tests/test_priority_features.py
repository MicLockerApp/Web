"""
Test Priority 1-3 Features for MicLocker:
1. Listing Flagging System Admin Actions
2. Admin User Deletion Feedback
3. Support Ticket Attachments with S3 (Help Center)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_USERNAME = "miclocker.support"
ADMIN_PASSWORD = "Eisenhower1212!!"


class TestAdminReportsEndpoints:
    """Test Admin Reports/Flagging System endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            params={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        )
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.token = token
        else:
            pytest.skip(f"Admin login failed: {login_response.status_code}")
    
    def test_admin_reports_stats_endpoint(self):
        """Test GET /api/reports/admin/stats returns statistics"""
        response = self.session.get(f"{BASE_URL}/api/reports/admin/stats")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify stats structure
        assert "pending" in data, "Missing 'pending' in stats"
        assert "under_review" in data, "Missing 'under_review' in stats"
        assert "resolved" in data, "Missing 'resolved' in stats"
        assert "dismissed" in data, "Missing 'dismissed' in stats"
        assert "total" in data, "Missing 'total' in stats"
        
        # Verify values are integers
        assert isinstance(data["pending"], int)
        assert isinstance(data["total"], int)
        print(f"Stats: pending={data['pending']}, total={data['total']}")
    
    def test_admin_reports_all_endpoint(self):
        """Test GET /api/reports/admin/all returns reports list"""
        response = self.session.get(f"{BASE_URL}/api/reports/admin/all", params={"limit": 10})
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify pagination structure
        assert "reports" in data, "Missing 'reports' in response"
        assert "total" in data, "Missing 'total' in response"
        assert "page" in data, "Missing 'page' in response"
        assert "pages" in data, "Missing 'pages' in response"
        
        assert isinstance(data["reports"], list)
        print(f"Reports: {len(data['reports'])} of {data['total']} total")
    
    def test_admin_reports_filter_by_status(self):
        """Test GET /api/reports/admin/all with status filter"""
        for status in ["pending", "under_review", "resolved", "dismissed"]:
            response = self.session.get(
                f"{BASE_URL}/api/reports/admin/all",
                params={"status": status, "limit": 5}
            )
            
            assert response.status_code == 200, f"Filter '{status}' failed: {response.status_code}"
            data = response.json()
            
            # If there are reports, verify they match the filter
            for report in data.get("reports", []):
                assert report.get("status") == status, f"Report status mismatch: expected {status}, got {report.get('status')}"
            
            print(f"Status filter '{status}': {len(data.get('reports', []))} reports")
    
    def test_admin_reports_action_endpoint_exists(self):
        """Test POST /api/reports/admin/{report_id}/action endpoint exists"""
        # Test with a fake report ID - should return 404 (not found) not 405 (method not allowed)
        response = self.session.post(
            f"{BASE_URL}/api/reports/admin/fake-report-id/action",
            json={
                "action": "dismiss",
                "admin_response": "Test",
                "notify_reporter": True,
                "notify_seller": True
            }
        )
        
        # Should be 404 (report not found) not 405 (method not allowed)
        assert response.status_code in [404, 400], f"Expected 404 or 400, got {response.status_code}: {response.text}"
        print(f"Action endpoint exists, returns {response.status_code} for non-existent report")
    
    def test_admin_reports_requires_auth(self):
        """Test that reports endpoints require authentication"""
        # Create a new session without auth
        no_auth_session = requests.Session()
        
        response = no_auth_session.get(f"{BASE_URL}/api/reports/admin/stats")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        
        response = no_auth_session.get(f"{BASE_URL}/api/reports/admin/all")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("Reports endpoints properly require authentication")


class TestAdminUserDeletion:
    """Test Admin User Deletion with protected account feedback"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            params={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        )
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.admin_user = login_response.json().get("user", {})
        else:
            pytest.skip(f"Admin login failed: {login_response.status_code}")
    
    def test_delete_protected_admin_account_returns_error(self):
        """Test that deleting admin/owner account returns 403 with error message"""
        # Try to delete the admin user (should be protected)
        admin_id = self.admin_user.get("id")
        if not admin_id:
            pytest.skip("Could not get admin user ID")
        
        response = self.session.delete(f"{BASE_URL}/api/admin/users/{admin_id}")
        
        # Should return 403 Forbidden for protected accounts
        assert response.status_code == 403, f"Expected 403 for protected account, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "detail" in data, "Missing error detail in response"
        print(f"Protected account deletion blocked: {data.get('detail')}")
    
    def test_admin_users_list_endpoint(self):
        """Test GET /api/admin/users returns user list"""
        response = self.session.get(f"{BASE_URL}/api/admin/users", params={"limit": 10})
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "users" in data, "Missing 'users' in response"
        assert isinstance(data["users"], list)
        print(f"Admin users list: {len(data['users'])} users returned")


class TestS3UploadStatus:
    """Test S3 Upload functionality for Help Center attachments"""
    
    def test_s3_upload_status_endpoint(self):
        """Test GET /api/uploads/status returns S3 configuration"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/uploads/status")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "s3_enabled" in data, "Missing 's3_enabled' in response"
        
        # Verify S3 is enabled as per requirements
        assert data["s3_enabled"] == True, f"S3 should be enabled, got: {data}"
        
        if data["s3_enabled"]:
            assert "bucket_name" in data, "Missing 'bucket_name' when S3 enabled"
            assert "region" in data, "Missing 'region' when S3 enabled"
            print(f"S3 enabled: bucket={data.get('bucket_name')}, region={data.get('region')}")
        else:
            print("S3 is disabled, using local storage")
    
    def test_presigned_url_endpoint_requires_auth(self):
        """Test that presigned URL endpoint requires authentication"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        response = session.post(
            f"{BASE_URL}/api/uploads/presigned-put-url",
            json={
                "filename": "test.jpg",
                "content_type": "image/jpeg"
            }
        )
        
        # Should require authentication
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("Presigned URL endpoint properly requires authentication")
    
    def test_presigned_url_endpoint_with_auth(self):
        """Test presigned URL endpoint with authentication"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = session.post(
            f"{BASE_URL}/api/auth/login",
            params={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        )
        if login_response.status_code != 200:
            pytest.skip("Login failed")
        
        token = login_response.json().get("access_token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = session.post(
            f"{BASE_URL}/api/uploads/presigned-put-url",
            json={
                "filename": "test-support-ticket.jpg",
                "content_type": "image/jpeg",
                "listing_id": "support-tickets/test"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "upload_url" in data, "Missing 'upload_url' in response"
        assert "key" in data, "Missing 'key' in response"
        assert "public_url" in data, "Missing 'public_url' in response"
        
        # Verify the URL is an S3 URL
        assert "s3.amazonaws.com" in data["upload_url"] or "s3.us-east-2.amazonaws.com" in data["upload_url"], \
            f"Expected S3 URL, got: {data['upload_url']}"
        
        print(f"Presigned URL generated: key={data['key']}")


class TestSupportTicketsWithAttachments:
    """Test Support Tickets endpoint with attachments"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authenticated session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            params={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        )
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip(f"Login failed: {login_response.status_code}")
    
    def test_create_ticket_with_attachments(self):
        """Test POST /api/tickets with attachments array"""
        response = self.session.post(
            f"{BASE_URL}/api/tickets",
            json={
                "category": "Technical Issue",
                "subject": "TEST - S3 Attachment Test",
                "message": "This is a test ticket to verify S3 attachments work correctly.",
                "order_id": None,
                "attachments": [
                    {
                        "url": "https://miclocker-saint-louis-bucket.s3.us-east-2.amazonaws.com/test/test-image.jpg",
                        "filename": "test-image.jpg",
                        "type": "image/jpeg"
                    }
                ]
            }
        )
        
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "ticket_number" in data, "Missing 'ticket_number' in response"
        print(f"Ticket created with attachments: {data.get('ticket_number')}")
    
    def test_create_ticket_without_attachments(self):
        """Test POST /api/tickets without attachments"""
        response = self.session.post(
            f"{BASE_URL}/api/tickets",
            json={
                "category": "Feedback/Suggestion",
                "subject": "TEST - No Attachments",
                "message": "This is a test ticket without attachments.",
                "order_id": None,
                "attachments": []
            }
        )
        
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "ticket_number" in data, "Missing 'ticket_number' in response"
        print(f"Ticket created without attachments: {data.get('ticket_number')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
