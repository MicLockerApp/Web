"""
Test Account Settings Endpoints for MicLocker
Tests: Change Username, Change Email (request/verify/resend/cancel), Change Password
"""

import pytest
import requests
import os
import time
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://industry-pros.preview.emergentagent.com').rstrip('/')

# Test user credentials - will be created via email verification flow
TEST_USER_PREFIX = f"accttest_{int(time.time())}"
TEST_EMAIL = f"{TEST_USER_PREFIX}@example.com"
TEST_USERNAME = TEST_USER_PREFIX
TEST_PASSWORD = "TestPass123!"


class TestAccountSettingsSetup:
    """Setup: Create test user via email verification flow"""
    
    @pytest.fixture(scope="class")
    def api_client(self):
        """Shared requests session"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        return session
    
    @pytest.fixture(scope="class")
    def test_user_token(self, api_client):
        """Create test user and return auth token"""
        # Step 1: Send verification request
        response = api_client.post(f"{BASE_URL}/api/auth/register/send-verification", json={
            "username": TEST_USERNAME,
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if response.status_code != 200:
            pytest.skip(f"Failed to send verification: {response.text}")
        
        print(f"Verification sent to {TEST_EMAIL}")
        
        # Step 2: Get verification code from MongoDB (via backend logs or direct DB access)
        # For testing, we'll use the check-verification endpoint to find the code
        # In real scenario, code would be retrieved from pending_registrations collection
        
        # Try common test codes or retrieve from logs
        # Since we can't access DB directly, we'll use a workaround
        import subprocess
        result = subprocess.run(
            ["grep", "-oP", f"verification code for {TEST_EMAIL}: \\K\\d{{6}}", "/var/log/supervisor/backend.out.log"],
            capture_output=True, text=True
        )
        
        code = None
        if result.stdout.strip():
            code = result.stdout.strip().split('\n')[-1]  # Get the latest code
        
        if not code:
            # Try alternative log location
            result = subprocess.run(
                ["tail", "-100", "/var/log/supervisor/backend.out.log"],
                capture_output=True, text=True
            )
            import re
            matches = re.findall(rf"verification code for {TEST_EMAIL}: (\d{{6}})", result.stdout)
            if matches:
                code = matches[-1]
        
        if not code:
            pytest.skip("Could not retrieve verification code from logs")
        
        print(f"Retrieved verification code: {code}")
        
        # Step 3: Verify email and create account
        verify_response = api_client.post(f"{BASE_URL}/api/auth/register/verify-email", json={
            "email": TEST_EMAIL,
            "code": code
        })
        
        if verify_response.status_code != 200:
            pytest.skip(f"Failed to verify email: {verify_response.text}")
        
        data = verify_response.json()
        token = data.get("access_token")
        
        if not token:
            pytest.skip("No token returned after verification")
        
        print(f"Test user created: {TEST_USERNAME}")
        return token
    
    @pytest.fixture(scope="class")
    def authenticated_client(self, api_client, test_user_token):
        """Session with auth header"""
        api_client.headers.update({"Authorization": f"Bearer {test_user_token}"})
        return api_client


class TestChangeUsername:
    """Test POST /api/auth/account/change-username"""
    
    @pytest.fixture(scope="class")
    def api_client(self):
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        return session
    
    @pytest.fixture(scope="class")
    def test_user_token(self, api_client):
        """Create test user for username change tests"""
        username = f"usrnametest_{int(time.time())}"
        email = f"{username}@example.com"
        password = "TestPass123!"
        
        # Send verification
        response = api_client.post(f"{BASE_URL}/api/auth/register/send-verification", json={
            "username": username,
            "email": email,
            "password": password
        })
        
        if response.status_code != 200:
            pytest.skip(f"Failed to send verification: {response.text}")
        
        # Get code from logs
        import subprocess
        import re
        time.sleep(1)  # Wait for log to be written
        
        result = subprocess.run(
            ["tail", "-100", "/var/log/supervisor/backend.out.log"],
            capture_output=True, text=True
        )
        matches = re.findall(rf"verification code for {email}: (\d{{6}})", result.stdout)
        
        if not matches:
            pytest.skip("Could not retrieve verification code")
        
        code = matches[-1]
        
        # Verify and create account
        verify_response = api_client.post(f"{BASE_URL}/api/auth/register/verify-email", json={
            "email": email,
            "code": code
        })
        
        if verify_response.status_code != 200:
            pytest.skip(f"Failed to verify: {verify_response.text}")
        
        return {
            "token": verify_response.json().get("access_token"),
            "username": username,
            "email": email,
            "password": password
        }
    
    def test_change_username_success(self, api_client, test_user_token):
        """Test successful username change"""
        new_username = f"newname_{int(time.time())}"
        
        api_client.headers.update({"Authorization": f"Bearer {test_user_token['token']}"})
        
        response = api_client.post(f"{BASE_URL}/api/auth/account/change-username", json={
            "new_username": new_username,
            "password": test_user_token['password']
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("message") == "Username changed successfully"
        assert data.get("new_username") == new_username
        print(f"SUCCESS: Username changed to {new_username}")
    
    def test_change_username_wrong_password(self, api_client, test_user_token):
        """Test username change with wrong password"""
        api_client.headers.update({"Authorization": f"Bearer {test_user_token['token']}"})
        
        response = api_client.post(f"{BASE_URL}/api/auth/account/change-username", json={
            "new_username": "anothername",
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        assert "Incorrect password" in response.json().get("detail", "")
        print("SUCCESS: Wrong password rejected correctly")
    
    def test_change_username_same_username(self, api_client, test_user_token):
        """Test changing to same username"""
        # First get current username
        api_client.headers.update({"Authorization": f"Bearer {test_user_token['token']}"})
        
        me_response = api_client.get(f"{BASE_URL}/api/auth/me")
        current_username = me_response.json().get("username")
        
        response = api_client.post(f"{BASE_URL}/api/auth/account/change-username", json={
            "new_username": current_username,
            "password": test_user_token['password']
        })
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "different from current" in response.json().get("detail", "").lower()
        print("SUCCESS: Same username rejected correctly")
    
    def test_change_username_too_short(self, api_client, test_user_token):
        """Test username change with too short username"""
        api_client.headers.update({"Authorization": f"Bearer {test_user_token['token']}"})
        
        response = api_client.post(f"{BASE_URL}/api/auth/account/change-username", json={
            "new_username": "ab",  # Less than 3 chars
            "password": test_user_token['password']
        })
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "at least 3 characters" in response.json().get("detail", "").lower()
        print("SUCCESS: Short username rejected correctly")
    
    def test_change_username_unauthenticated(self, api_client):
        """Test username change without authentication"""
        api_client.headers.pop("Authorization", None)
        
        response = api_client.post(f"{BASE_URL}/api/auth/account/change-username", json={
            "new_username": "newname",
            "password": "somepassword"
        })
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("SUCCESS: Unauthenticated request rejected")


class TestChangeEmail:
    """Test email change flow: request -> verify -> resend -> cancel"""
    
    @pytest.fixture(scope="class")
    def api_client(self):
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        return session
    
    @pytest.fixture(scope="class")
    def test_user_token(self, api_client):
        """Create test user for email change tests"""
        username = f"emailtest_{int(time.time())}"
        email = f"{username}@example.com"
        password = "TestPass123!"
        
        # Send verification
        response = api_client.post(f"{BASE_URL}/api/auth/register/send-verification", json={
            "username": username,
            "email": email,
            "password": password
        })
        
        if response.status_code != 200:
            pytest.skip(f"Failed to send verification: {response.text}")
        
        # Get code from logs
        import subprocess
        import re
        time.sleep(1)
        
        result = subprocess.run(
            ["tail", "-100", "/var/log/supervisor/backend.out.log"],
            capture_output=True, text=True
        )
        matches = re.findall(rf"verification code for {email}: (\d{{6}})", result.stdout)
        
        if not matches:
            pytest.skip("Could not retrieve verification code")
        
        code = matches[-1]
        
        # Verify and create account
        verify_response = api_client.post(f"{BASE_URL}/api/auth/register/verify-email", json={
            "email": email,
            "code": code
        })
        
        if verify_response.status_code != 200:
            pytest.skip(f"Failed to verify: {verify_response.text}")
        
        return {
            "token": verify_response.json().get("access_token"),
            "username": username,
            "email": email,
            "password": password
        }
    
    def test_request_email_change_success(self, api_client, test_user_token):
        """Test POST /api/auth/account/change-email/request"""
        new_email = f"newemail_{int(time.time())}@example.com"
        
        api_client.headers.update({"Authorization": f"Bearer {test_user_token['token']}"})
        
        response = api_client.post(f"{BASE_URL}/api/auth/account/change-email/request", json={
            "new_email": new_email,
            "password": test_user_token['password']
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "verification code sent" in data.get("message", "").lower()
        assert data.get("new_email") == new_email
        print(f"SUCCESS: Email change request sent for {new_email}")
    
    def test_request_email_change_wrong_password(self, api_client, test_user_token):
        """Test email change request with wrong password"""
        api_client.headers.update({"Authorization": f"Bearer {test_user_token['token']}"})
        
        response = api_client.post(f"{BASE_URL}/api/auth/account/change-email/request", json={
            "new_email": "another@example.com",
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        assert "Incorrect password" in response.json().get("detail", "")
        print("SUCCESS: Wrong password rejected for email change")
    
    def test_request_email_change_same_email(self, api_client, test_user_token):
        """Test changing to same email"""
        api_client.headers.update({"Authorization": f"Bearer {test_user_token['token']}"})
        
        response = api_client.post(f"{BASE_URL}/api/auth/account/change-email/request", json={
            "new_email": test_user_token['email'],
            "password": test_user_token['password']
        })
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "different from current" in response.json().get("detail", "").lower()
        print("SUCCESS: Same email rejected correctly")
    
    def test_get_pending_email_change(self, api_client, test_user_token):
        """Test GET /api/auth/account/pending-email-change"""
        api_client.headers.update({"Authorization": f"Bearer {test_user_token['token']}"})
        
        response = api_client.get(f"{BASE_URL}/api/auth/account/pending-email-change")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        # Should have pending from previous test
        assert "has_pending" in data
        print(f"SUCCESS: Pending email change status: {data}")
    
    def test_resend_email_change_code(self, api_client, test_user_token):
        """Test POST /api/auth/account/change-email/resend"""
        api_client.headers.update({"Authorization": f"Bearer {test_user_token['token']}"})
        
        # First ensure there's a pending change
        pending_response = api_client.get(f"{BASE_URL}/api/auth/account/pending-email-change")
        
        if not pending_response.json().get("has_pending"):
            # Create a pending change first
            api_client.post(f"{BASE_URL}/api/auth/account/change-email/request", json={
                "new_email": f"resend_{int(time.time())}@example.com",
                "password": test_user_token['password']
            })
        
        response = api_client.post(f"{BASE_URL}/api/auth/account/change-email/resend")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "resent" in data.get("message", "").lower() or "sent" in data.get("message", "").lower()
        print("SUCCESS: Email change code resent")
    
    def test_cancel_email_change(self, api_client, test_user_token):
        """Test DELETE /api/auth/account/pending-email-change"""
        api_client.headers.update({"Authorization": f"Bearer {test_user_token['token']}"})
        
        response = api_client.delete(f"{BASE_URL}/api/auth/account/pending-email-change")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("SUCCESS: Email change cancelled")
        
        # Verify it's cancelled
        pending_response = api_client.get(f"{BASE_URL}/api/auth/account/pending-email-change")
        assert pending_response.json().get("has_pending") == False
        print("SUCCESS: Verified pending email change is cancelled")
    
    def test_verify_email_change_invalid_code(self, api_client, test_user_token):
        """Test POST /api/auth/account/change-email/verify with invalid code"""
        api_client.headers.update({"Authorization": f"Bearer {test_user_token['token']}"})
        
        # First create a pending change
        api_client.post(f"{BASE_URL}/api/auth/account/change-email/request", json={
            "new_email": f"verify_{int(time.time())}@example.com",
            "password": test_user_token['password']
        })
        
        response = api_client.post(f"{BASE_URL}/api/auth/account/change-email/verify", json={
            "code": "000000"  # Invalid code
        })
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "invalid" in response.json().get("detail", "").lower() or "expired" in response.json().get("detail", "").lower()
        print("SUCCESS: Invalid verification code rejected")


class TestChangeEmailFullFlow:
    """Test complete email change flow with verification"""
    
    @pytest.fixture(scope="class")
    def api_client(self):
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        return session
    
    @pytest.fixture(scope="class")
    def test_user_token(self, api_client):
        """Create test user for full email change flow"""
        username = f"fullflow_{int(time.time())}"
        email = f"{username}@example.com"
        password = "TestPass123!"
        
        # Send verification
        response = api_client.post(f"{BASE_URL}/api/auth/register/send-verification", json={
            "username": username,
            "email": email,
            "password": password
        })
        
        if response.status_code != 200:
            pytest.skip(f"Failed to send verification: {response.text}")
        
        # Get code from logs
        import subprocess
        import re
        time.sleep(1)
        
        result = subprocess.run(
            ["tail", "-100", "/var/log/supervisor/backend.out.log"],
            capture_output=True, text=True
        )
        matches = re.findall(rf"verification code for {email}: (\d{{6}})", result.stdout)
        
        if not matches:
            pytest.skip("Could not retrieve verification code")
        
        code = matches[-1]
        
        # Verify and create account
        verify_response = api_client.post(f"{BASE_URL}/api/auth/register/verify-email", json={
            "email": email,
            "code": code
        })
        
        if verify_response.status_code != 200:
            pytest.skip(f"Failed to verify: {verify_response.text}")
        
        return {
            "token": verify_response.json().get("access_token"),
            "username": username,
            "email": email,
            "password": password
        }
    
    def test_full_email_change_flow(self, api_client, test_user_token):
        """Test complete email change: request -> get code -> verify"""
        import subprocess
        import re
        
        new_email = f"changed_{int(time.time())}@example.com"
        
        api_client.headers.update({"Authorization": f"Bearer {test_user_token['token']}"})
        
        # Step 1: Request email change
        request_response = api_client.post(f"{BASE_URL}/api/auth/account/change-email/request", json={
            "new_email": new_email,
            "password": test_user_token['password']
        })
        
        assert request_response.status_code == 200, f"Request failed: {request_response.text}"
        print(f"Step 1: Email change requested for {new_email}")
        
        # Step 2: Get verification code from logs
        time.sleep(1)
        result = subprocess.run(
            ["tail", "-100", "/var/log/supervisor/backend.out.log"],
            capture_output=True, text=True
        )
        matches = re.findall(rf"verification code for {new_email}: (\d{{6}})", result.stdout)
        
        if not matches:
            # Try alternative pattern
            matches = re.findall(rf"Email change verification.*{new_email}.*: (\d{{6}})", result.stdout)
        
        if not matches:
            pytest.skip("Could not retrieve email change verification code")
        
        code = matches[-1]
        print(f"Step 2: Retrieved verification code: {code}")
        
        # Step 3: Verify email change
        verify_response = api_client.post(f"{BASE_URL}/api/auth/account/change-email/verify", json={
            "code": code
        })
        
        assert verify_response.status_code == 200, f"Verify failed: {verify_response.text}"
        data = verify_response.json()
        assert "successfully" in data.get("message", "").lower()
        assert data.get("new_email") == new_email
        print(f"Step 3: Email changed successfully to {new_email}")
        
        # Step 4: Verify the change persisted
        me_response = api_client.get(f"{BASE_URL}/api/auth/me")
        assert me_response.status_code == 200
        assert me_response.json().get("email") == new_email
        print("Step 4: Verified email change persisted in user profile")


class TestChangePassword:
    """Test POST /api/auth/account/change-password"""
    
    @pytest.fixture(scope="class")
    def api_client(self):
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        return session
    
    @pytest.fixture(scope="class")
    def test_user_token(self, api_client):
        """Create test user for password change tests"""
        username = f"pwdtest_{int(time.time())}"
        email = f"{username}@example.com"
        password = "TestPass123!"
        
        # Send verification
        response = api_client.post(f"{BASE_URL}/api/auth/register/send-verification", json={
            "username": username,
            "email": email,
            "password": password
        })
        
        if response.status_code != 200:
            pytest.skip(f"Failed to send verification: {response.text}")
        
        # Get code from logs
        import subprocess
        import re
        time.sleep(1)
        
        result = subprocess.run(
            ["tail", "-100", "/var/log/supervisor/backend.out.log"],
            capture_output=True, text=True
        )
        matches = re.findall(rf"verification code for {email}: (\d{{6}})", result.stdout)
        
        if not matches:
            pytest.skip("Could not retrieve verification code")
        
        code = matches[-1]
        
        # Verify and create account
        verify_response = api_client.post(f"{BASE_URL}/api/auth/register/verify-email", json={
            "email": email,
            "code": code
        })
        
        if verify_response.status_code != 200:
            pytest.skip(f"Failed to verify: {verify_response.text}")
        
        return {
            "token": verify_response.json().get("access_token"),
            "username": username,
            "email": email,
            "password": password
        }
    
    def test_change_password_wrong_current(self, api_client, test_user_token):
        """Test password change with wrong current password"""
        api_client.headers.update({"Authorization": f"Bearer {test_user_token['token']}"})
        
        response = api_client.post(f"{BASE_URL}/api/auth/account/change-password", json={
            "current_password": "wrongpassword",
            "new_password": "NewPass456!"
        })
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        assert "incorrect" in response.json().get("detail", "").lower()
        print("SUCCESS: Wrong current password rejected")
    
    def test_change_password_same_password(self, api_client, test_user_token):
        """Test changing to same password"""
        api_client.headers.update({"Authorization": f"Bearer {test_user_token['token']}"})
        
        response = api_client.post(f"{BASE_URL}/api/auth/account/change-password", json={
            "current_password": test_user_token['password'],
            "new_password": test_user_token['password']
        })
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "different" in response.json().get("detail", "").lower()
        print("SUCCESS: Same password rejected")
    
    def test_change_password_too_short(self, api_client, test_user_token):
        """Test password change with too short new password"""
        api_client.headers.update({"Authorization": f"Bearer {test_user_token['token']}"})
        
        response = api_client.post(f"{BASE_URL}/api/auth/account/change-password", json={
            "current_password": test_user_token['password'],
            "new_password": "12345"  # Less than 6 chars
        })
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "at least 6 characters" in response.json().get("detail", "").lower()
        print("SUCCESS: Short password rejected")
    
    def test_change_password_success(self, api_client, test_user_token):
        """Test successful password change"""
        api_client.headers.update({"Authorization": f"Bearer {test_user_token['token']}"})
        
        new_password = "NewPass456!"
        
        response = api_client.post(f"{BASE_URL}/api/auth/account/change-password", json={
            "current_password": test_user_token['password'],
            "new_password": new_password
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "successfully" in data.get("message", "").lower()
        print("SUCCESS: Password changed successfully")
        
        # Verify can login with new password
        login_response = api_client.post(
            f"{BASE_URL}/api/auth/login?username={test_user_token['username']}&password={new_password}"
        )
        assert login_response.status_code == 200, f"Login with new password failed: {login_response.text}"
        print("SUCCESS: Verified login works with new password")
    
    def test_change_password_unauthenticated(self, api_client):
        """Test password change without authentication"""
        api_client.headers.pop("Authorization", None)
        
        response = api_client.post(f"{BASE_URL}/api/auth/account/change-password", json={
            "current_password": "oldpass",
            "new_password": "newpass123"
        })
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("SUCCESS: Unauthenticated request rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
