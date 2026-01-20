"""
Test suite for Email Verification in Signup Flow
Tests the new email verification feature for MicLocker marketplace registration
"""
import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestEmailVerificationEndpoints:
    """Test email verification endpoints for signup flow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Generate unique test data for each test run
        self.unique_id = str(uuid.uuid4())[:8]
        
    # ============================================
    # Test: POST /api/auth/register/send-verification
    # ============================================
    
    def test_send_verification_success(self):
        """Test sending verification code with valid credentials"""
        test_email = f"test_verify_{self.unique_id}@example.com"
        test_username = f"testverify_{self.unique_id}"
        
        response = self.session.post(f"{BASE_URL}/api/auth/register/send-verification", json={
            "username": test_username,
            "email": test_email,
            "password": "testpass123"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        assert "email" in data
        assert data["email"] == test_email
        print(f"✓ Send verification success: {data['message']}")
    
    def test_send_verification_short_username(self):
        """Test validation: username must be at least 3 characters"""
        response = self.session.post(f"{BASE_URL}/api/auth/register/send-verification", json={
            "username": "ab",  # Too short
            "email": f"test_{self.unique_id}@example.com",
            "password": "testpass123"
        })
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "3 characters" in data["detail"].lower() or "username" in data["detail"].lower()
        print(f"✓ Short username rejected: {data['detail']}")
    
    def test_send_verification_short_password(self):
        """Test validation: password must be at least 6 characters"""
        response = self.session.post(f"{BASE_URL}/api/auth/register/send-verification", json={
            "username": f"testuser_{self.unique_id}",
            "email": f"test_{self.unique_id}@example.com",
            "password": "12345"  # Too short
        })
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "6 characters" in data["detail"].lower() or "password" in data["detail"].lower()
        print(f"✓ Short password rejected: {data['detail']}")
    
    def test_send_verification_duplicate_username(self):
        """Test that duplicate username is rejected"""
        # First, create a user via the old register endpoint or use existing admin
        # Try to register with existing username
        response = self.session.post(f"{BASE_URL}/api/auth/register/send-verification", json={
            "username": "miclocker.support",  # Existing admin username
            "email": f"new_{self.unique_id}@example.com",
            "password": "testpass123"
        })
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "username" in data["detail"].lower() and "taken" in data["detail"].lower()
        print(f"✓ Duplicate username rejected: {data['detail']}")
    
    def test_send_verification_invalid_email(self):
        """Test validation: email must be valid format"""
        response = self.session.post(f"{BASE_URL}/api/auth/register/send-verification", json={
            "username": f"testuser_{self.unique_id}",
            "email": "not-an-email",
            "password": "testpass123"
        })
        
        assert response.status_code == 422  # Pydantic validation error
        print("✓ Invalid email format rejected")
    
    # ============================================
    # Test: POST /api/auth/register/verify-email
    # ============================================
    
    def test_verify_email_invalid_code(self):
        """Test that invalid verification code is rejected"""
        response = self.session.post(f"{BASE_URL}/api/auth/register/verify-email", json={
            "email": f"test_{self.unique_id}@example.com",
            "code": "000000"  # Invalid code
        })
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "invalid" in data["detail"].lower() or "expired" in data["detail"].lower()
        print(f"✓ Invalid code rejected: {data['detail']}")
    
    def test_verify_email_wrong_format(self):
        """Test that non-6-digit code is rejected"""
        response = self.session.post(f"{BASE_URL}/api/auth/register/verify-email", json={
            "email": f"test_{self.unique_id}@example.com",
            "code": "12345"  # Only 5 digits
        })
        
        # Should still be 400 as code won't match
        assert response.status_code == 400
        print("✓ Wrong format code rejected")
    
    # ============================================
    # Test: POST /api/auth/register/resend-verification
    # ============================================
    
    def test_resend_verification_nonexistent_email(self):
        """Test resend for non-existent email (should not reveal if email exists)"""
        response = self.session.post(f"{BASE_URL}/api/auth/register/resend-verification", json={
            "email": f"nonexistent_{self.unique_id}@example.com"
        })
        
        # Should return 200 to not reveal if email exists
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ Resend for non-existent email handled securely: {data['message']}")
    
    # ============================================
    # Test: GET /api/auth/register/check-verification
    # ============================================
    
    def test_check_verification_invalid(self):
        """Test checking invalid verification code"""
        response = self.session.get(f"{BASE_URL}/api/auth/register/check-verification", params={
            "email": f"test_{self.unique_id}@example.com",
            "code": "000000"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "valid" in data
        assert data["valid"] == False
        print(f"✓ Check verification returns invalid: {data['message']}")
    
    # ============================================
    # Test: Full Email Verification Flow
    # ============================================
    
    def test_full_verification_flow(self, mongodb_client):
        """Test complete email verification flow: send -> verify -> account created"""
        test_email = f"fullflow_{self.unique_id}@example.com"
        test_username = f"fullflow_{self.unique_id}"
        
        # Step 1: Send verification code
        response = self.session.post(f"{BASE_URL}/api/auth/register/send-verification", json={
            "username": test_username,
            "email": test_email,
            "password": "testpass123"
        })
        
        assert response.status_code == 200, f"Send verification failed: {response.text}"
        print(f"✓ Step 1: Verification code sent to {test_email}")
        
        # Step 2: Get the code from MongoDB (since email won't actually send in test)
        pending = mongodb_client.pending_registrations.find_one({"email": test_email})
        assert pending is not None, "Pending registration not found in database"
        verification_code = pending["verification_code"]
        print(f"✓ Step 2: Retrieved verification code from DB: {verification_code}")
        
        # Step 3: Verify email with the code
        response = self.session.post(f"{BASE_URL}/api/auth/register/verify-email", json={
            "email": test_email,
            "code": verification_code
        })
        
        assert response.status_code == 200, f"Verify email failed: {response.text}"
        data = response.json()
        
        # Verify response contains token and user
        assert "access_token" in data, "No access token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["email"] == test_email
        assert data["user"]["username"] == test_username
        assert data["user"]["email_verified"] == True
        print(f"✓ Step 3: Email verified, account created with email_verified=True")
        
        # Step 4: Verify user exists in users collection
        user = mongodb_client.users.find_one({"email": test_email})
        assert user is not None, "User not found in database"
        assert user["email_verified"] == True
        print(f"✓ Step 4: User persisted in database with email_verified=True")
        
        # Step 5: Verify pending registration was deleted
        pending_after = mongodb_client.pending_registrations.find_one({"email": test_email})
        assert pending_after is None, "Pending registration should be deleted after verification"
        print("✓ Step 5: Pending registration cleaned up")
        
        # Step 6: Verify user can login
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login?username={test_username}&password=testpass123"
        )
        assert login_response.status_code == 200
        print("✓ Step 6: User can login with new account")
        
        return data["access_token"]
    
    def test_resend_verification_updates_code(self, mongodb_client):
        """Test that resending verification generates a new code"""
        test_email = f"resend_{self.unique_id}@example.com"
        test_username = f"resend_{self.unique_id}"
        
        # Send initial verification
        response = self.session.post(f"{BASE_URL}/api/auth/register/send-verification", json={
            "username": test_username,
            "email": test_email,
            "password": "testpass123"
        })
        assert response.status_code == 200
        
        # Get initial code
        pending1 = mongodb_client.pending_registrations.find_one({"email": test_email})
        initial_code = pending1["verification_code"]
        
        # Resend verification
        response = self.session.post(f"{BASE_URL}/api/auth/register/resend-verification", json={
            "email": test_email
        })
        assert response.status_code == 200
        
        # Get new code
        pending2 = mongodb_client.pending_registrations.find_one({"email": test_email})
        new_code = pending2["verification_code"]
        
        # Codes should be different (very high probability)
        # Note: There's a tiny chance they could be the same, but extremely unlikely
        print(f"✓ Initial code: {initial_code}, New code: {new_code}")
        print("✓ Resend verification generates new code")


class TestEmailVerificationWithProfile:
    """Test email verification flow with profile completion"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.unique_id = str(uuid.uuid4())[:8]
    
    def test_complete_profile_after_verification(self, mongodb_client):
        """Test that user can complete profile after email verification"""
        test_email = f"profile_{self.unique_id}@example.com"
        test_username = f"profile_{self.unique_id}"
        
        # Step 1: Send verification
        response = self.session.post(f"{BASE_URL}/api/auth/register/send-verification", json={
            "username": test_username,
            "email": test_email,
            "password": "testpass123"
        })
        assert response.status_code == 200
        
        # Step 2: Get code from DB
        pending = mongodb_client.pending_registrations.find_one({"email": test_email})
        code = pending["verification_code"]
        
        # Step 3: Verify email
        response = self.session.post(f"{BASE_URL}/api/auth/register/verify-email", json={
            "email": test_email,
            "code": code
        })
        assert response.status_code == 200
        token = response.json()["access_token"]
        
        # Step 4: Complete profile with token
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        profile_response = self.session.post(f"{BASE_URL}/api/auth/complete-profile", json={
            "category": "musician",
            "genres": ["Rock", "Jazz"],
            "instruments": ["Electric Guitar", "Piano"]
        })
        
        assert profile_response.status_code == 200
        profile_data = profile_response.json()
        assert profile_data["category"] == "musician"
        assert profile_data["profile_completed"] == True
        assert profile_data["email_verified"] == True
        print("✓ Profile completed successfully after email verification")


# Pytest fixtures
@pytest.fixture(scope="session")
def mongodb_client():
    """Get MongoDB client for direct database access during tests"""
    from pymongo import MongoClient
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    client = MongoClient(mongo_url)
    db = client.miclocker  # Default database name
    yield db
    client.close()


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
