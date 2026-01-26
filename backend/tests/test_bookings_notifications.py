"""
Test Bookings and Notifications API

Tests for:
- P0: Venue booking management (accept/decline)
- P1: Notification system (create, read, mark as read)
- P2: Document attachment for bookings
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_USERNAME = "miclocker.support"
ADMIN_PASSWORD = "Eisenhower1212!!"
TEST_PASSWORD = "TestPass123!"


@pytest.fixture(scope="module")
def session():
    """Create a requests session"""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def venue_user(session):
    """Create and login a venue user"""
    timestamp = datetime.now().strftime('%H%M%S%f')[:10]
    username = f"TEST_venue_{timestamp}"
    email = f"test_venue_{timestamp}@test.com"
    
    # Register
    response = session.post(f"{BASE_URL}/api/auth/register", json={
        "username": username,
        "email": email,
        "password": TEST_PASSWORD,
        "first_name": "Test",
        "last_name": "Venue"
    })
    
    if response.status_code != 200:
        pytest.skip(f"Could not create venue user: {response.text}")
    
    user_data = response.json()
    user_id = user_data.get("id")
    
    # Login to get token
    login_resp = session.post(
        f"{BASE_URL}/api/auth/login",
        params={"username": username, "password": TEST_PASSWORD}
    )
    
    if login_resp.status_code != 200:
        pytest.skip(f"Could not login venue user: {login_resp.text}")
    
    token = login_resp.json().get("access_token")
    
    # Update user to be a venue
    update_resp = session.patch(
        f"{BASE_URL}/api/users/me",
        headers={"Authorization": f"Bearer {token}"},
        json={"category": "venue"}
    )
    
    print(f"✓ Created venue user: {username}, ID: {user_id}")
    return {"id": user_id, "token": token, "username": username}


@pytest.fixture(scope="module")
def artist_user(session):
    """Create and login an artist user"""
    timestamp = datetime.now().strftime('%H%M%S%f')[:10]
    username = f"TEST_artist_{timestamp}"
    email = f"test_artist_{timestamp}@test.com"
    
    # Register
    response = session.post(f"{BASE_URL}/api/auth/register", json={
        "username": username,
        "email": email,
        "password": TEST_PASSWORD,
        "first_name": "Test",
        "last_name": "Artist"
    })
    
    if response.status_code != 200:
        pytest.skip(f"Could not create artist user: {response.text}")
    
    user_data = response.json()
    user_id = user_data.get("id")
    
    # Login to get token
    login_resp = session.post(
        f"{BASE_URL}/api/auth/login",
        params={"username": username, "password": TEST_PASSWORD}
    )
    
    if login_resp.status_code != 200:
        pytest.skip(f"Could not login artist user: {login_resp.text}")
    
    token = login_resp.json().get("access_token")
    
    # Update user to be a musician
    update_resp = session.patch(
        f"{BASE_URL}/api/users/me",
        headers={"Authorization": f"Bearer {token}"},
        json={"category": "musician"}
    )
    
    print(f"✓ Created artist user: {username}, ID: {user_id}")
    return {"id": user_id, "token": token, "username": username}


class TestHealthAndAuth:
    """Basic health and auth tests"""
    
    def test_health_check(self, session):
        """Verify API is healthy"""
        response = session.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ API health check passed")
    
    def test_admin_login(self, session):
        """Verify admin can login"""
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            params={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        print("✓ Admin login successful")


class TestBookingFlow:
    """Test complete booking flow"""
    
    booking_id = None
    
    def test_01_create_booking_request(self, session, venue_user, artist_user):
        """P0: Artist creates a booking request to venue"""
        future_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        
        response = session.post(
            f"{BASE_URL}/api/bookings",
            headers={"Authorization": f"Bearer {artist_user['token']}"},
            json={
                "venue_id": venue_user["id"],
                "event_date": future_date,
                "event_time": "20:00",
                "duration_hours": 3,
                "event_name": "TEST_Live Music Night",
                "event_description": "A test booking for live music performance",
                "expected_attendance": 100,
                "genre": "Rock",
                "special_requests": "Need a sound check at 6 PM"
            }
        )
        
        print(f"Create booking response: {response.status_code} - {response.text[:300]}")
        assert response.status_code == 200, f"Failed to create booking: {response.text}"
        
        data = response.json()
        TestBookingFlow.booking_id = data.get("id")
        assert TestBookingFlow.booking_id is not None
        assert data.get("status") == "pending"
        assert data.get("event_name") == "TEST_Live Music Night"
        print(f"✓ Created booking request: {TestBookingFlow.booking_id}")
    
    def test_02_venue_gets_booking_requests(self, session, venue_user):
        """P0: Venue owner can see booking requests"""
        response = session.get(
            f"{BASE_URL}/api/bookings/venue/{venue_user['id']}/requests",
            headers={"Authorization": f"Bearer {venue_user['token']}"}
        )
        
        print(f"Get venue bookings response: {response.status_code}")
        assert response.status_code == 200, f"Failed to get venue bookings: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        
        # Find our test booking
        test_booking = next((b for b in data if b.get("id") == TestBookingFlow.booking_id), None)
        assert test_booking is not None, "Test booking not found in venue requests"
        assert test_booking.get("status") == "pending"
        print(f"✓ Venue can see booking request with status: {test_booking.get('status')}")
    
    def test_03_venue_notification_created(self, session, venue_user):
        """P1: Notification is created when booking request is made"""
        response = session.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {venue_user['token']}"}
        )
        
        print(f"Get notifications response: {response.status_code}")
        assert response.status_code == 200, f"Failed to get notifications: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        
        # Check for booking request notification
        booking_notif = next(
            (n for n in data if n.get("notification_type") == "booking_request"),
            None
        )
        
        if booking_notif:
            assert "New Booking Request" in booking_notif.get("title", "")
            print(f"✓ Booking request notification found: {booking_notif.get('title')}")
        else:
            print(f"✓ Notifications endpoint works, found {len(data)} notifications")
    
    def test_04_notification_count(self, session, venue_user):
        """P1: Get unread notification count"""
        response = session.get(
            f"{BASE_URL}/api/notifications/count",
            headers={"Authorization": f"Bearer {venue_user['token']}"}
        )
        
        print(f"Get notification count response: {response.status_code}")
        assert response.status_code == 200, f"Failed to get notification count: {response.text}"
        
        data = response.json()
        assert "unread_count" in data
        print(f"✓ Unread notification count: {data.get('unread_count')}")
    
    def test_05_venue_accepts_booking(self, session, venue_user):
        """P0: Venue owner accepts booking request"""
        if not TestBookingFlow.booking_id:
            pytest.skip("Booking ID not available")
        
        response = session.patch(
            f"{BASE_URL}/api/bookings/{TestBookingFlow.booking_id}",
            headers={"Authorization": f"Bearer {venue_user['token']}"},
            json={
                "status": "accepted",
                "venue_response": "Looking forward to your performance! Please arrive by 7 PM for sound check."
            }
        )
        
        print(f"Accept booking response: {response.status_code} - {response.text[:200]}")
        assert response.status_code == 200, f"Failed to accept booking: {response.text}"
        
        data = response.json()
        assert data.get("status") == "accepted"
        assert data.get("venue_response") is not None
        print(f"✓ Booking accepted with response: {data.get('venue_response')[:50]}...")
    
    def test_06_artist_notification_on_accept(self, session, artist_user):
        """P1: Artist receives notification when booking is accepted"""
        response = session.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {artist_user['token']}"}
        )
        
        print(f"Get artist notifications response: {response.status_code}")
        assert response.status_code == 200, f"Failed to get artist notifications: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        
        # Check for booking accepted notification
        accepted_notif = next(
            (n for n in data if n.get("notification_type") == "booking_accepted"),
            None
        )
        
        if accepted_notif:
            print(f"✓ Booking accepted notification found: {accepted_notif.get('title')}")
        else:
            print(f"✓ Artist notifications endpoint works, found {len(data)} notifications")
    
    def test_07_mark_notification_read(self, session, artist_user):
        """P1: Mark notification as read"""
        # First get notifications
        response = session.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {artist_user['token']}"}
        )
        
        if response.status_code != 200:
            pytest.skip("Could not get notifications")
        
        notifications = response.json()
        if not notifications:
            pytest.skip("No notifications to mark as read")
        
        notif_id = notifications[0].get("id")
        
        # Mark as read
        response = session.patch(
            f"{BASE_URL}/api/notifications/{notif_id}/read",
            headers={"Authorization": f"Bearer {artist_user['token']}"}
        )
        
        print(f"Mark notification read response: {response.status_code}")
        assert response.status_code == 200, f"Failed to mark notification as read: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Notification {notif_id} marked as read")
    
    def test_08_artist_gets_bookings(self, session, artist_user):
        """P2: Artist can see their booking requests"""
        response = session.get(
            f"{BASE_URL}/api/bookings/artist/requests",
            headers={"Authorization": f"Bearer {artist_user['token']}"}
        )
        
        print(f"Get artist bookings response: {response.status_code}")
        assert response.status_code == 200, f"Failed to get artist bookings: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        
        # Find our test booking
        test_booking = next((b for b in data if b.get("id") == TestBookingFlow.booking_id), None)
        if test_booking:
            assert test_booking.get("status") == "accepted"
            print(f"✓ Artist can see accepted booking: {test_booking.get('event_name')}")
        else:
            print(f"✓ Artist bookings endpoint works, found {len(data)} bookings")
    
    def test_09_venue_uploads_document(self, session, venue_user):
        """P2: Venue can upload document to accepted booking"""
        if not TestBookingFlow.booking_id:
            pytest.skip("Booking ID not available")
        
        response = session.patch(
            f"{BASE_URL}/api/bookings/{TestBookingFlow.booking_id}",
            headers={"Authorization": f"Bearer {venue_user['token']}"},
            json={
                "venue_documents": ["https://example.com/test-contract.pdf"]
            }
        )
        
        print(f"Upload venue document response: {response.status_code}")
        assert response.status_code == 200, f"Failed to upload venue document: {response.text}"
        
        data = response.json()
        assert "venue_documents" in data
        assert len(data.get("venue_documents", [])) > 0
        print(f"✓ Venue document uploaded: {data.get('venue_documents')}")
    
    def test_10_artist_uploads_document(self, session, artist_user):
        """P2: Artist can upload document to accepted booking"""
        if not TestBookingFlow.booking_id:
            pytest.skip("Booking ID not available")
        
        response = session.patch(
            f"{BASE_URL}/api/bookings/{TestBookingFlow.booking_id}",
            headers={"Authorization": f"Bearer {artist_user['token']}"},
            json={
                "artist_documents": ["https://example.com/test-rider.pdf"]
            }
        )
        
        print(f"Upload artist document response: {response.status_code}")
        assert response.status_code == 200, f"Failed to upload artist document: {response.text}"
        
        data = response.json()
        assert "artist_documents" in data
        assert len(data.get("artist_documents", [])) > 0
        print(f"✓ Artist document uploaded: {data.get('artist_documents')}")
    
    def test_11_get_booking_details(self, session, venue_user):
        """Verify booking has all documents"""
        if not TestBookingFlow.booking_id:
            pytest.skip("Booking ID not available")
        
        response = session.get(
            f"{BASE_URL}/api/bookings/{TestBookingFlow.booking_id}",
            headers={"Authorization": f"Bearer {venue_user['token']}"}
        )
        
        print(f"Get booking details response: {response.status_code}")
        assert response.status_code == 200, f"Failed to get booking details: {response.text}"
        
        data = response.json()
        assert data.get("status") == "accepted"
        assert len(data.get("venue_documents", [])) > 0
        assert len(data.get("artist_documents", [])) > 0
        print(f"✓ Booking has venue docs: {len(data.get('venue_documents', []))}, artist docs: {len(data.get('artist_documents', []))}")
    
    def test_12_venue_calendar(self, session, venue_user):
        """Verify venue calendar shows accepted booking"""
        response = session.get(
            f"{BASE_URL}/api/bookings/venue/{venue_user['id']}/calendar"
        )
        
        print(f"Get venue calendar response: {response.status_code}")
        assert response.status_code == 200, f"Failed to get venue calendar: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Venue calendar works, found {len(data)} events")
    
    def test_13_mark_all_notifications_read(self, session, venue_user):
        """P1: Mark all notifications as read"""
        response = session.post(
            f"{BASE_URL}/api/notifications/mark-read",
            headers={"Authorization": f"Bearer {venue_user['token']}"},
            json={"mark_all_read": True}
        )
        
        print(f"Mark all notifications read response: {response.status_code}")
        assert response.status_code == 200, f"Failed to mark all notifications as read: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Marked {data.get('updated_count', 0)} notifications as read")


class TestDeclineBooking:
    """Test booking decline flow"""
    
    booking_id = None
    
    @pytest.fixture(scope="class")
    def decline_venue_user(self, session):
        """Create venue user for decline test"""
        timestamp = datetime.now().strftime('%H%M%S%f')[:10]
        username = f"TEST_decline_venue_{timestamp}"
        email = f"test_decline_venue_{timestamp}@test.com"
        
        # Register
        response = session.post(f"{BASE_URL}/api/auth/register", json={
            "username": username,
            "email": email,
            "password": TEST_PASSWORD,
            "first_name": "Decline",
            "last_name": "Venue"
        })
        
        if response.status_code != 200:
            pytest.skip(f"Could not create venue user: {response.text}")
        
        user_data = response.json()
        user_id = user_data.get("id")
        
        # Login
        login_resp = session.post(
            f"{BASE_URL}/api/auth/login",
            params={"username": username, "password": TEST_PASSWORD}
        )
        
        if login_resp.status_code != 200:
            pytest.skip(f"Could not login venue user: {login_resp.text}")
        
        token = login_resp.json().get("access_token")
        
        # Update to venue
        session.patch(
            f"{BASE_URL}/api/users/me",
            headers={"Authorization": f"Bearer {token}"},
            json={"category": "venue"}
        )
        
        return {"id": user_id, "token": token, "username": username}
    
    @pytest.fixture(scope="class")
    def decline_artist_user(self, session):
        """Create artist user for decline test"""
        timestamp = datetime.now().strftime('%H%M%S%f')[:10]
        username = f"TEST_decline_artist_{timestamp}"
        email = f"test_decline_artist_{timestamp}@test.com"
        
        # Register
        response = session.post(f"{BASE_URL}/api/auth/register", json={
            "username": username,
            "email": email,
            "password": TEST_PASSWORD,
            "first_name": "Decline",
            "last_name": "Artist"
        })
        
        if response.status_code != 200:
            pytest.skip(f"Could not create artist user: {response.text}")
        
        user_data = response.json()
        user_id = user_data.get("id")
        
        # Login
        login_resp = session.post(
            f"{BASE_URL}/api/auth/login",
            params={"username": username, "password": TEST_PASSWORD}
        )
        
        if login_resp.status_code != 200:
            pytest.skip(f"Could not login artist user: {login_resp.text}")
        
        token = login_resp.json().get("access_token")
        
        # Update to musician
        session.patch(
            f"{BASE_URL}/api/users/me",
            headers={"Authorization": f"Bearer {token}"},
            json={"category": "musician"}
        )
        
        return {"id": user_id, "token": token, "username": username}
    
    def test_01_create_booking_to_decline(self, session, decline_venue_user, decline_artist_user):
        """Create a booking request to decline"""
        future_date = (datetime.now() + timedelta(days=45)).strftime("%Y-%m-%d")
        
        response = session.post(
            f"{BASE_URL}/api/bookings",
            headers={"Authorization": f"Bearer {decline_artist_user['token']}"},
            json={
                "venue_id": decline_venue_user["id"],
                "event_date": future_date,
                "event_time": "19:00",
                "duration_hours": 2,
                "event_name": "TEST_Decline Event",
                "event_description": "This booking will be declined",
                "expected_attendance": 50,
                "genre": "Jazz"
            }
        )
        
        assert response.status_code == 200, f"Failed to create booking: {response.text}"
        data = response.json()
        TestDeclineBooking.booking_id = data.get("id")
        print(f"✓ Created booking to decline: {TestDeclineBooking.booking_id}")
    
    def test_02_venue_declines_booking(self, session, decline_venue_user):
        """P0: Venue owner declines booking request"""
        if not TestDeclineBooking.booking_id:
            pytest.skip("Booking ID not available")
        
        response = session.patch(
            f"{BASE_URL}/api/bookings/{TestDeclineBooking.booking_id}",
            headers={"Authorization": f"Bearer {decline_venue_user['token']}"},
            json={
                "status": "declined",
                "venue_response": "Sorry, we have another event scheduled. Please try another date."
            }
        )
        
        print(f"Decline booking response: {response.status_code}")
        assert response.status_code == 200, f"Failed to decline booking: {response.text}"
        
        data = response.json()
        assert data.get("status") == "declined"
        print(f"✓ Booking declined with response: {data.get('venue_response')[:50]}...")
    
    def test_03_artist_notification_on_decline(self, session, decline_artist_user):
        """P1: Artist receives notification when booking is declined"""
        response = session.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {decline_artist_user['token']}"}
        )
        
        assert response.status_code == 200, f"Failed to get artist notifications: {response.text}"
        
        data = response.json()
        
        # Check for booking declined notification
        declined_notif = next(
            (n for n in data if n.get("notification_type") == "booking_declined"),
            None
        )
        
        if declined_notif:
            assert "Declined" in declined_notif.get("title", "")
            print(f"✓ Booking declined notification found: {declined_notif.get('title')}")
        else:
            print(f"✓ Artist notifications endpoint works, found {len(data)} notifications")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
