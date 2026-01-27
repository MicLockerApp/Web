"""
Test Extended Booking System - Multiple Provider Categories

Tests for:
- POST /api/bookings accepts requests to venue, audio_engineer, and recording_studio categories
- GET /api/bookings/venue/{id}/calendar works for all three bookable categories
- Backend validation: Booking requests to non-bookable categories (e.g., 'musician') should be rejected
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_PASSWORD = "TestPass123!"


@pytest.fixture(scope="module")
def session():
    """Create a requests session"""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def create_user_with_category(session, category, prefix="TEST"):
    """Helper to create a user with a specific category"""
    timestamp = datetime.now().strftime('%H%M%S%f')[:10]
    username = f"{prefix}_{category}_{timestamp}"
    email = f"test_{category}_{timestamp}@test.com"
    
    # Register
    response = session.post(f"{BASE_URL}/api/auth/register", json={
        "username": username,
        "email": email,
        "password": TEST_PASSWORD,
        "first_name": "Test",
        "last_name": category.replace("_", " ").title()
    })
    
    if response.status_code != 200:
        return None
    
    user_data = response.json()
    user_id = user_data.get("id")
    
    # Login to get token
    login_resp = session.post(
        f"{BASE_URL}/api/auth/login",
        params={"username": username, "password": TEST_PASSWORD}
    )
    
    if login_resp.status_code != 200:
        return None
    
    token = login_resp.json().get("access_token")
    
    # Update user category using complete-profile endpoint
    update_resp = session.post(
        f"{BASE_URL}/api/auth/complete-profile",
        headers={"Authorization": f"Bearer {token}"},
        json={"category": category}
    )
    
    if update_resp.status_code != 200:
        print(f"Warning: Could not set {category} category: {update_resp.text}")
    
    print(f"✓ Created {category} user: {username}, ID: {user_id}")
    return {"id": user_id, "token": token, "username": username, "category": category}


@pytest.fixture(scope="module")
def venue_user(session):
    """Create and login a venue user"""
    user = create_user_with_category(session, "venue")
    if not user:
        pytest.skip("Could not create venue user")
    return user


@pytest.fixture(scope="module")
def audio_engineer_user(session):
    """Create and login an audio engineer user"""
    user = create_user_with_category(session, "audio_engineer")
    if not user:
        pytest.skip("Could not create audio engineer user")
    return user


@pytest.fixture(scope="module")
def recording_studio_user(session):
    """Create and login a recording studio user"""
    user = create_user_with_category(session, "recording_studio")
    if not user:
        pytest.skip("Could not create recording studio user")
    return user


@pytest.fixture(scope="module")
def musician_user(session):
    """Create and login a musician user (non-bookable)"""
    user = create_user_with_category(session, "musician")
    if not user:
        pytest.skip("Could not create musician user")
    return user


@pytest.fixture(scope="module")
def artist_user(session):
    """Create and login an artist user to make booking requests"""
    user = create_user_with_category(session, "musician", prefix="TEST_artist")
    if not user:
        pytest.skip("Could not create artist user")
    return user


class TestHealthCheck:
    """Basic health check"""
    
    def test_api_health(self, session):
        """Verify API is healthy"""
        response = session.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ API health check passed")


class TestBookingToVenue:
    """Test booking requests to venue category"""
    
    booking_id = None
    
    def test_01_create_booking_to_venue(self, session, venue_user, artist_user):
        """Artist can create booking request to venue"""
        future_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        
        response = session.post(
            f"{BASE_URL}/api/bookings",
            headers={"Authorization": f"Bearer {artist_user['token']}"},
            json={
                "venue_id": venue_user["id"],
                "event_date": future_date,
                "event_time": "20:00",
                "duration_hours": 3,
                "event_name": "TEST_Venue Booking",
                "event_description": "Test booking to venue",
                "expected_attendance": 100,
                "genre": "Rock"
            }
        )
        
        print(f"Create booking to venue response: {response.status_code}")
        assert response.status_code == 200, f"Failed to create booking to venue: {response.text}"
        
        data = response.json()
        TestBookingToVenue.booking_id = data.get("id")
        assert TestBookingToVenue.booking_id is not None
        assert data.get("status") == "pending"
        assert data.get("venue_id") == venue_user["id"]
        print(f"✓ Created booking to venue: {TestBookingToVenue.booking_id}")
    
    def test_02_venue_calendar_works(self, session, venue_user):
        """GET /api/bookings/venue/{id}/calendar works for venue"""
        response = session.get(
            f"{BASE_URL}/api/bookings/venue/{venue_user['id']}/calendar"
        )
        
        print(f"Get venue calendar response: {response.status_code}")
        assert response.status_code == 200, f"Failed to get venue calendar: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Venue calendar works, found {len(data)} events")


class TestBookingToAudioEngineer:
    """Test booking requests to audio_engineer category"""
    
    booking_id = None
    
    def test_01_create_booking_to_audio_engineer(self, session, audio_engineer_user, artist_user):
        """Artist can create booking request to audio engineer"""
        future_date = (datetime.now() + timedelta(days=35)).strftime("%Y-%m-%d")
        
        response = session.post(
            f"{BASE_URL}/api/bookings",
            headers={"Authorization": f"Bearer {artist_user['token']}"},
            json={
                "venue_id": audio_engineer_user["id"],
                "event_date": future_date,
                "event_time": "14:00",
                "duration_hours": 4,
                "event_name": "TEST_Audio Engineer Session",
                "event_description": "Test booking to audio engineer for mixing session",
                "expected_attendance": 5,
                "genre": "Pop"
            }
        )
        
        print(f"Create booking to audio engineer response: {response.status_code}")
        assert response.status_code == 200, f"Failed to create booking to audio engineer: {response.text}"
        
        data = response.json()
        TestBookingToAudioEngineer.booking_id = data.get("id")
        assert TestBookingToAudioEngineer.booking_id is not None
        assert data.get("status") == "pending"
        assert data.get("venue_id") == audio_engineer_user["id"]
        print(f"✓ Created booking to audio engineer: {TestBookingToAudioEngineer.booking_id}")
    
    def test_02_audio_engineer_calendar_works(self, session, audio_engineer_user):
        """GET /api/bookings/venue/{id}/calendar works for audio engineer"""
        response = session.get(
            f"{BASE_URL}/api/bookings/venue/{audio_engineer_user['id']}/calendar"
        )
        
        print(f"Get audio engineer calendar response: {response.status_code}")
        assert response.status_code == 200, f"Failed to get audio engineer calendar: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Audio engineer calendar works, found {len(data)} events")
    
    def test_03_audio_engineer_gets_booking_requests(self, session, audio_engineer_user):
        """Audio engineer can see their booking requests"""
        response = session.get(
            f"{BASE_URL}/api/bookings/venue/{audio_engineer_user['id']}/requests",
            headers={"Authorization": f"Bearer {audio_engineer_user['token']}"}
        )
        
        print(f"Get audio engineer bookings response: {response.status_code}")
        assert response.status_code == 200, f"Failed to get audio engineer bookings: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        
        # Find our test booking
        test_booking = next((b for b in data if b.get("id") == TestBookingToAudioEngineer.booking_id), None)
        assert test_booking is not None, "Test booking not found in audio engineer requests"
        print(f"✓ Audio engineer can see booking request: {test_booking.get('event_name')}")


class TestBookingToRecordingStudio:
    """Test booking requests to recording_studio category"""
    
    booking_id = None
    
    def test_01_create_booking_to_recording_studio(self, session, recording_studio_user, artist_user):
        """Artist can create booking request to recording studio"""
        future_date = (datetime.now() + timedelta(days=40)).strftime("%Y-%m-%d")
        
        response = session.post(
            f"{BASE_URL}/api/bookings",
            headers={"Authorization": f"Bearer {artist_user['token']}"},
            json={
                "venue_id": recording_studio_user["id"],
                "event_date": future_date,
                "event_time": "10:00",
                "duration_hours": 8,
                "event_name": "TEST_Recording Studio Session",
                "event_description": "Test booking to recording studio for album recording",
                "expected_attendance": 10,
                "genre": "Hip Hop"
            }
        )
        
        print(f"Create booking to recording studio response: {response.status_code}")
        assert response.status_code == 200, f"Failed to create booking to recording studio: {response.text}"
        
        data = response.json()
        TestBookingToRecordingStudio.booking_id = data.get("id")
        assert TestBookingToRecordingStudio.booking_id is not None
        assert data.get("status") == "pending"
        assert data.get("venue_id") == recording_studio_user["id"]
        print(f"✓ Created booking to recording studio: {TestBookingToRecordingStudio.booking_id}")
    
    def test_02_recording_studio_calendar_works(self, session, recording_studio_user):
        """GET /api/bookings/venue/{id}/calendar works for recording studio"""
        response = session.get(
            f"{BASE_URL}/api/bookings/venue/{recording_studio_user['id']}/calendar"
        )
        
        print(f"Get recording studio calendar response: {response.status_code}")
        assert response.status_code == 200, f"Failed to get recording studio calendar: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Recording studio calendar works, found {len(data)} events")
    
    def test_03_recording_studio_gets_booking_requests(self, session, recording_studio_user):
        """Recording studio can see their booking requests"""
        response = session.get(
            f"{BASE_URL}/api/bookings/venue/{recording_studio_user['id']}/requests",
            headers={"Authorization": f"Bearer {recording_studio_user['token']}"}
        )
        
        print(f"Get recording studio bookings response: {response.status_code}")
        assert response.status_code == 200, f"Failed to get recording studio bookings: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        
        # Find our test booking
        test_booking = next((b for b in data if b.get("id") == TestBookingToRecordingStudio.booking_id), None)
        assert test_booking is not None, "Test booking not found in recording studio requests"
        print(f"✓ Recording studio can see booking request: {test_booking.get('event_name')}")


class TestBookingToNonBookableCategory:
    """Test that booking requests to non-bookable categories are rejected"""
    
    def test_01_booking_to_musician_rejected(self, session, musician_user, artist_user):
        """Booking request to musician (non-bookable) should be rejected"""
        future_date = (datetime.now() + timedelta(days=50)).strftime("%Y-%m-%d")
        
        response = session.post(
            f"{BASE_URL}/api/bookings",
            headers={"Authorization": f"Bearer {artist_user['token']}"},
            json={
                "venue_id": musician_user["id"],
                "event_date": future_date,
                "event_time": "18:00",
                "duration_hours": 2,
                "event_name": "TEST_Invalid Booking to Musician",
                "event_description": "This should be rejected",
                "expected_attendance": 50,
                "genre": "Jazz"
            }
        )
        
        print(f"Create booking to musician response: {response.status_code} - {response.text[:200]}")
        
        # Should be rejected with 400 Bad Request
        assert response.status_code == 400, f"Expected 400 for booking to musician, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data
        assert "bookable" in data["detail"].lower() or "venue" in data["detail"].lower() or "audio" in data["detail"].lower() or "studio" in data["detail"].lower()
        print(f"✓ Booking to musician correctly rejected: {data['detail']}")
    
    def test_02_calendar_for_musician_rejected(self, session, musician_user):
        """Calendar endpoint for musician (non-bookable) should be rejected"""
        response = session.get(
            f"{BASE_URL}/api/bookings/venue/{musician_user['id']}/calendar"
        )
        
        print(f"Get musician calendar response: {response.status_code}")
        
        # Should be rejected with 400 Bad Request
        assert response.status_code == 400, f"Expected 400 for musician calendar, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data
        print(f"✓ Calendar for musician correctly rejected: {data['detail']}")


class TestAcceptDeclineForAllCategories:
    """Test accept/decline functionality for all bookable categories"""
    
    def test_01_audio_engineer_accepts_booking(self, session, audio_engineer_user):
        """Audio engineer can accept booking request"""
        if not TestBookingToAudioEngineer.booking_id:
            pytest.skip("Audio engineer booking ID not available")
        
        response = session.patch(
            f"{BASE_URL}/api/bookings/{TestBookingToAudioEngineer.booking_id}",
            headers={"Authorization": f"Bearer {audio_engineer_user['token']}"},
            json={
                "status": "accepted",
                "venue_response": "Looking forward to the mixing session!"
            }
        )
        
        print(f"Audio engineer accept booking response: {response.status_code}")
        assert response.status_code == 200, f"Failed to accept booking: {response.text}"
        
        data = response.json()
        assert data.get("status") == "accepted"
        print(f"✓ Audio engineer accepted booking")
    
    def test_02_recording_studio_declines_booking(self, session, recording_studio_user):
        """Recording studio can decline booking request"""
        if not TestBookingToRecordingStudio.booking_id:
            pytest.skip("Recording studio booking ID not available")
        
        response = session.patch(
            f"{BASE_URL}/api/bookings/{TestBookingToRecordingStudio.booking_id}",
            headers={"Authorization": f"Bearer {recording_studio_user['token']}"},
            json={
                "status": "declined",
                "venue_response": "Sorry, studio is booked for that date."
            }
        )
        
        print(f"Recording studio decline booking response: {response.status_code}")
        assert response.status_code == 200, f"Failed to decline booking: {response.text}"
        
        data = response.json()
        assert data.get("status") == "declined"
        print(f"✓ Recording studio declined booking")
    
    def test_03_audio_engineer_calendar_shows_accepted(self, session, audio_engineer_user):
        """Audio engineer calendar shows accepted booking"""
        response = session.get(
            f"{BASE_URL}/api/bookings/venue/{audio_engineer_user['id']}/calendar",
            headers={"Authorization": f"Bearer {audio_engineer_user['token']}"}
        )
        
        print(f"Get audio engineer calendar with auth response: {response.status_code}")
        assert response.status_code == 200, f"Failed to get audio engineer calendar: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        
        # Find accepted booking
        accepted_booking = next((e for e in data if e.get("status") == "accepted"), None)
        if accepted_booking:
            print(f"✓ Audio engineer calendar shows accepted booking: {accepted_booking.get('event_name')}")
        else:
            print(f"✓ Audio engineer calendar works, found {len(data)} events")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
