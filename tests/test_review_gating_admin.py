"""
Test suite for MicLocker Review Gating and Admin Features
Tests:
1. Review-gating API endpoint GET /api/reviews/pending
2. Admin reports page /api/reports/admin/*
3. Date picker sync (context-based, tested via frontend)
4. Message deletion (already tested in iteration_17)
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestReviewGatingAPI:
    """Test the review-gating API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Admin credentials
        self.admin_username = "miclocker.support"
        self.admin_password = "Eisenhower1212!!"
        
        # Test user credentials from previous tests
        self.test_username = "testuser1_msg"
        self.test_password = "TestPass123!"
    
    def get_admin_token(self):
        """Get admin authentication token"""
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            params={"username": self.admin_username, "password": self.admin_password}
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        return None
    
    def get_user_token(self, username, password):
        """Get user authentication token"""
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            params={"username": username, "password": password}
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        return None
    
    # ==================== Review Gating Tests ====================
    
    def test_reviews_pending_requires_auth(self):
        """GET /api/reviews/pending requires authentication"""
        response = self.session.get(f"{BASE_URL}/api/reviews/pending")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ GET /api/reviews/pending requires authentication")
    
    def test_reviews_pending_returns_status(self):
        """GET /api/reviews/pending returns pending review status for authenticated user"""
        token = self.get_user_token(self.test_username, self.test_password)
        if not token:
            # Try to create test user if doesn't exist
            register_response = self.session.post(
                f"{BASE_URL}/api/auth/register",
                json={
                    "username": self.test_username,
                    "email": f"{self.test_username}@test.com",
                    "password": self.test_password
                }
            )
            if register_response.status_code in [200, 201]:
                token = register_response.json().get("access_token")
            else:
                pytest.skip("Could not authenticate test user")
        
        headers = {"Authorization": f"Bearer {token}"}
        response = self.session.get(f"{BASE_URL}/api/reviews/pending", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "has_pending" in data, "Response should have 'has_pending' field"
        assert "locked" in data, "Response should have 'locked' field"
        assert isinstance(data["has_pending"], bool), "'has_pending' should be boolean"
        
        print(f"✓ GET /api/reviews/pending returns status: has_pending={data['has_pending']}, locked={data['locked']}")
        
        # If there's a pending review, verify additional fields
        if data["has_pending"]:
            assert "type" in data, "Should have 'type' field when pending"
            print(f"  - Pending type: {data.get('type', 'N/A')}")
    
    def test_reviews_pending_admin_user(self):
        """GET /api/reviews/pending works for admin user"""
        token = self.get_admin_token()
        assert token, "Admin login failed"
        
        headers = {"Authorization": f"Bearer {token}"}
        response = self.session.get(f"{BASE_URL}/api/reviews/pending", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "has_pending" in data, f"Response should have 'has_pending' field, got: {data}"
        assert "locked" in data, f"Response should have 'locked' field, got: {data}"
        print(f"✓ GET /api/reviews/pending works for admin: has_pending={data['has_pending']}, locked={data['locked']}")
    
    # ==================== Admin Reports Tests ====================
    
    def test_admin_reports_all_requires_admin(self):
        """GET /api/reports/admin/all requires admin access"""
        # Test without auth
        response = self.session.get(f"{BASE_URL}/api/reports/admin/all")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        
        # Test with regular user
        token = self.get_user_token(self.test_username, self.test_password)
        if token:
            headers = {"Authorization": f"Bearer {token}"}
            response = self.session.get(f"{BASE_URL}/api/reports/admin/all", headers=headers)
            assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
        
        print("✓ GET /api/reports/admin/all requires admin access")
    
    def test_admin_reports_all_returns_data(self):
        """GET /api/reports/admin/all returns reports list for admin"""
        token = self.get_admin_token()
        assert token, "Admin login failed"
        
        headers = {"Authorization": f"Bearer {token}"}
        response = self.session.get(f"{BASE_URL}/api/reports/admin/all", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify response structure
        assert "reports" in data, "Response should have 'reports' field"
        assert "total" in data, "Response should have 'total' field"
        assert "page" in data, "Response should have 'page' field"
        assert "pages" in data, "Response should have 'pages' field"
        assert isinstance(data["reports"], list), "'reports' should be a list"
        
        print(f"✓ GET /api/reports/admin/all returns {len(data['reports'])} reports (total: {data['total']})")
    
    def test_admin_reports_stats_requires_admin(self):
        """GET /api/reports/admin/stats requires admin access"""
        response = self.session.get(f"{BASE_URL}/api/reports/admin/stats")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ GET /api/reports/admin/stats requires admin access")
    
    def test_admin_reports_stats_returns_data(self):
        """GET /api/reports/admin/stats returns statistics for admin"""
        token = self.get_admin_token()
        assert token, "Admin login failed"
        
        headers = {"Authorization": f"Bearer {token}"}
        response = self.session.get(f"{BASE_URL}/api/reports/admin/stats", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify response structure
        assert "pending" in data, "Response should have 'pending' field"
        assert "under_review" in data, "Response should have 'under_review' field"
        assert "resolved" in data, "Response should have 'resolved' field"
        assert "dismissed" in data, "Response should have 'dismissed' field"
        assert "total" in data, "Response should have 'total' field"
        
        print(f"✓ GET /api/reports/admin/stats returns: pending={data['pending']}, resolved={data['resolved']}, total={data['total']}")
    
    def test_admin_reports_filter_by_status(self):
        """GET /api/reports/admin/all supports status filter"""
        token = self.get_admin_token()
        assert token, "Admin login failed"
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # Test with status filter
        for status in ["pending", "under_review", "resolved", "dismissed"]:
            response = self.session.get(
                f"{BASE_URL}/api/reports/admin/all",
                params={"status": status},
                headers=headers
            )
            assert response.status_code == 200, f"Expected 200 for status={status}, got {response.status_code}"
            data = response.json()
            
            # All returned reports should have the filtered status
            for report in data["reports"]:
                assert report.get("status") == status, f"Report status should be {status}"
        
        print("✓ GET /api/reports/admin/all status filter works correctly")
    
    # ==================== Message Deletion Tests (Verification) ====================
    
    def test_message_delete_endpoint_exists(self):
        """DELETE /api/messages/messages/{id} endpoint exists"""
        token = self.get_user_token(self.test_username, self.test_password)
        if not token:
            pytest.skip("Could not authenticate test user")
        
        headers = {"Authorization": f"Bearer {token}"}
        # Test with non-existent message ID
        response = self.session.delete(
            f"{BASE_URL}/api/messages/messages/nonexistent-id",
            headers=headers
        )
        # Should return 404 (not found) not 405 (method not allowed)
        assert response.status_code in [404, 403], f"Expected 404/403, got {response.status_code}"
        print("✓ DELETE /api/messages/messages/{id} endpoint exists and returns proper status")
    
    def test_thread_delete_endpoint_exists(self):
        """DELETE /api/messages/threads/{id} endpoint exists"""
        token = self.get_user_token(self.test_username, self.test_password)
        if not token:
            pytest.skip("Could not authenticate test user")
        
        headers = {"Authorization": f"Bearer {token}"}
        # Test with non-existent thread ID
        response = self.session.delete(
            f"{BASE_URL}/api/messages/threads/nonexistent-id",
            headers=headers
        )
        # Should return 404 (not found) not 405 (method not allowed)
        assert response.status_code in [404, 403], f"Expected 404/403, got {response.status_code}"
        print("✓ DELETE /api/messages/threads/{id} endpoint exists and returns proper status")


class TestDeliveryTasksConfiguration:
    """Test that delivery tasks are properly configured"""
    
    def test_delivery_tasks_module_exists(self):
        """Verify delivery_tasks.py module exists and has required functions"""
        import sys
        sys.path.insert(0, '/app/backend')
        
        try:
            from tasks.delivery_tasks import (
                run_delivery_check_ins,
                lock_pending_reviewers,
                auto_confirm_deliveries,
                send_five_day_review_reminders
            )
            print("✓ delivery_tasks.py module has all required functions:")
            print("  - run_delivery_check_ins")
            print("  - lock_pending_reviewers")
            print("  - auto_confirm_deliveries")
            print("  - send_five_day_review_reminders")
        except ImportError as e:
            pytest.fail(f"Failed to import delivery_tasks: {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
