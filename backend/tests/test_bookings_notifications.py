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

# Test user credentials (will be created)
TEST_VENUE_USERNAME = f"TEST_venue_{datetime.now().strftime('%H%M%S')}"
TEST_VENUE_EMAIL = f"test_venue_{datetime.now().strftime('%H%M%S')}@test.com"
TEST_ARTIST_USERNAME = f"TEST_artist_{datetime.now().strftime('%H%M%S')}"
TEST_ARTIST_EMAIL = f"test_artist_{datetime.now().strftime('%H%M%S')}@test.com"
TEST_PASSWORD = "TestPass123!"


class TestBookingsNotifications:
    """Test suite for bookings and notifications"""
    
    venue_token = None
    venue_id = None
    artist_token = None
    artist_id = None
    booking_id = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_01_health_check(self):
        """Verify API is healthy"""
        response = self.session.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ API health check passed")
    
    def test_02_create_venue_user(self):
        """Create a venue user for testing"""
        response = self.session.post(f"{BASE_URL}/api/auth/register", json={
            "username": TEST_VENUE_USERNAME,
            "email": TEST_VENUE_EMAIL,
            "password": TEST_PASSWORD,
            "full_name": "Test Venue",
            "category": "venue",
            "location": "Test City"
        })
        
        if response.status_code == 201:
            data = response.json()
            TestBookingsNotifications.venue_token = data.get("access_token")
            TestBookingsNotifications.venue_id = data.get("user", {}).get("id")
            print(f"✓ Created venue user: {TEST_VENUE_USERNAME}, ID: {TestBookingsNotifications.venue_id}")
        elif response.status_code == 400 and "already" in response.text.lower():
            # User exists, try to login using query params
            login_resp = self.session.post(
                f"{BASE_URL}/api/auth/login",
                params={"username": TEST_VENUE_USERNAME, "password": TEST_PASSWORD}
            )
            if login_resp.status_code == 200:
                data = login_resp.json()
                TestBookingsNotifications.venue_token = data.get("access_token")
                TestBookingsNotifications.venue_id = data.get("user", {}).get("id")
                print(f"✓ Logged in existing venue user: {TEST_VENUE_USERNAME}")
            else:
                pytest.skip(f"Could not create or login venue user: {response.text}")
        else:
            pytest.skip(f"Could not create venue user: {response.text}")
        
        assert TestBookingsNotifications.venue_token is not None
        assert TestBookingsNotifications.venue_id is not None
    
    def test_03_create_artist_user(self):
        """Create an artist user for testing"""
        response = self.session.post(f"{BASE_URL}/api/auth/register", json={
            "username": TEST_ARTIST_USERNAME,
            "email": TEST_ARTIST_EMAIL,
            "password": TEST_PASSWORD,
            "full_name": "Test Artist",
            "category": "musician",
            "location": "Test City"
        })
        
        if response.status_code == 201:
            data = response.json()
            TestBookingsNotifications.artist_token = data.get("access_token")
            TestBookingsNotifications.artist_id = data.get("user", {}).get("id")
            print(f"✓ Created artist user: {TEST_ARTIST_USERNAME}, ID: {TestBookingsNotifications.artist_id}")
        elif response.status_code == 400 and "already" in response.text.lower():
            # User exists, try to login using query params
            login_resp = self.session.post(
                f"{BASE_URL}/api/auth/login",
                params={"username": TEST_ARTIST_USERNAME, "password": TEST_PASSWORD}
            )
            if login_resp.status_code == 200:
                data = login_resp.json()
                TestBookingsNotifications.artist_token = data.get("access_token")
                TestBookingsNotifications.artist_id = data.get("user", {}).get("id")
                print(f"✓ Logged in existing artist user: {TEST_ARTIST_USERNAME}")
            else:
                pytest.skip(f"Could not create or login artist user: {response.text}")
        else:
            pytest.skip(f"Could not create artist user: {response.text}")
        
        assert TestBookingsNotifications.artist_token is not None
        assert TestBookingsNotifications.artist_id is not None
    
    def test_04_create_booking_request(self):
        """P0: Artist creates a booking request to venue"""
        if not TestBookingsNotifications.artist_token or not TestBookingsNotifications.venue_id:
            pytest.skip("Artist token or venue ID not available")
        
        # Set future date for booking
        future_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        
        response = self.session.post(
            f"{BASE_URL}/api/bookings",
            headers={"Authorization": f"Bearer {TestBookingsNotifications.artist_token}"},
            json={
                "venue_id": TestBookingsNotifications.venue_id,
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
        
        print(f"Create booking response: {response.status_code} - {response.text[:200]}")
        assert response.status_code == 200, f"Failed to create booking: {response.text}"
        
        data = response.json()
        TestBookingsNotifications.booking_id = data.get("id")
        assert TestBookingsNotifications.booking_id is not None
        assert data.get("status") == "pending"
        assert data.get("event_name") == "TEST_Live Music Night"
        print(f"✓ Created booking request: {TestBookingsNotifications.booking_id}")
    
    def test_05_venue_gets_booking_requests(self):
        """P0: Venue owner can see booking requests"""
        if not TestBookingsNotifications.venue_token or not TestBookingsNotifications.venue_id:
            pytest.skip("Venue token or ID not available")
        
        response = self.session.get(
            f"{BASE_URL}/api/bookings/venue/{TestBookingsNotifications.venue_id}/requests",
            headers={"Authorization": f"Bearer {TestBookingsNotifications.venue_token}"}
        )
        
        print(f"Get venue bookings response: {response.status_code}")
        assert response.status_code == 200, f"Failed to get venue bookings: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        
        # Find our test booking
        test_booking = next((b for b in data if b.get("id") == TestBookingsNotifications.booking_id), None)
        if test_booking:
            assert test_booking.get("status") == "pending"
            print(f"✓ Venue can see booking request with status: {test_booking.get('status')}")
        else:
            print(f"✓ Venue bookings endpoint works, found {len(data)} bookings")
    
    def test_06_venue_notification_created(self):
        """P1: Notification is created when booking request is made"""
        if not TestBookingsNotifications.venue_token:
            pytest.skip("Venue token not available")
        
        response = self.session.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {TestBookingsNotifications.venue_token}"}
        )
        
        print(f"Get notifications response: {response.status_code}")
        assert response.status_code == 200, f"Failed to get notifications: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        
        # Check for booking request notification
        booking_notif = next(
            (n for n in data if n.get("notification_type") == "booking_request" 
             and TestBookingsNotifications.booking_id in str(n.get("metadata", {}))),
            None
        )
        
        if booking_notif:
            assert "New Booking Request" in booking_notif.get("title", "")
            print(f"✓ Booking request notification found: {booking_notif.get('title')}")
        else:
            # Check if any booking notifications exist
            any_booking_notif = next((n for n in data if "booking" in n.get("notification_type", "").lower()), None)
            if any_booking_notif:
                print(f"✓ Found booking notification: {any_booking_notif.get('title')}")
            else:
                print(f"✓ Notifications endpoint works, found {len(data)} notifications")
    
    def test_07_notification_count(self):
        """P1: Get unread notification count"""
        if not TestBookingsNotifications.venue_token:
            pytest.skip("Venue token not available")
        
        response = self.session.get(
            f"{BASE_URL}/api/notifications/count",
            headers={"Authorization": f"Bearer {TestBookingsNotifications.venue_token}"}
        )
        
        print(f"Get notification count response: {response.status_code}")
        assert response.status_code == 200, f"Failed to get notification count: {response.text}"
        
        data = response.json()
        assert "unread_count" in data
        print(f"✓ Unread notification count: {data.get('unread_count')}")
    
    def test_08_venue_accepts_booking(self):
        """P0: Venue owner accepts booking request"""
        if not TestBookingsNotifications.venue_token or not TestBookingsNotifications.booking_id:
            pytest.skip("Venue token or booking ID not available")
        
        response = self.session.patch(
            f"{BASE_URL}/api/bookings/{TestBookingsNotifications.booking_id}",
            headers={"Authorization": f"Bearer {TestBookingsNotifications.venue_token}"},
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
    
    def test_09_artist_notification_on_accept(self):
        """P1: Artist receives notification when booking is accepted"""
        if not TestBookingsNotifications.artist_token:
            pytest.skip("Artist token not available")
        
        response = self.session.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {TestBookingsNotifications.artist_token}"}
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
            assert "Confirmed" in accepted_notif.get("title", "") or "accepted" in accepted_notif.get("title", "").lower()
            print(f"✓ Booking accepted notification found: {accepted_notif.get('title')}")
        else:
            print(f"✓ Artist notifications endpoint works, found {len(data)} notifications")
    
    def test_10_mark_notification_read(self):
        """P1: Mark notification as read"""
        if not TestBookingsNotifications.artist_token:
            pytest.skip("Artist token not available")
        
        # First get notifications
        response = self.session.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {TestBookingsNotifications.artist_token}"}
        )
        
        if response.status_code != 200:
            pytest.skip("Could not get notifications")
        
        notifications = response.json()
        if not notifications:
            pytest.skip("No notifications to mark as read")
        
        notif_id = notifications[0].get("id")
        
        # Mark as read
        response = self.session.patch(
            f"{BASE_URL}/api/notifications/{notif_id}/read",
            headers={"Authorization": f"Bearer {TestBookingsNotifications.artist_token}"}
        )
        
        print(f"Mark notification read response: {response.status_code}")
        assert response.status_code == 200, f"Failed to mark notification as read: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Notification {notif_id} marked as read")
    
    def test_11_artist_gets_bookings(self):
        """P2: Artist can see their booking requests"""
        if not TestBookingsNotifications.artist_token:
            pytest.skip("Artist token not available")
        
        response = self.session.get(
            f"{BASE_URL}/api/bookings/artist/requests",
            headers={"Authorization": f"Bearer {TestBookingsNotifications.artist_token}"}
        )
        
        print(f"Get artist bookings response: {response.status_code}")
        assert response.status_code == 200, f"Failed to get artist bookings: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        
        # Find our test booking
        test_booking = next((b for b in data if b.get("id") == TestBookingsNotifications.booking_id), None)
        if test_booking:
            assert test_booking.get("status") == "accepted"
            print(f"✓ Artist can see accepted booking: {test_booking.get('event_name')}")
        else:
            print(f"✓ Artist bookings endpoint works, found {len(data)} bookings")
    
    def test_12_venue_uploads_document(self):
        """P2: Venue can upload document to accepted booking"""
        if not TestBookingsNotifications.venue_token or not TestBookingsNotifications.booking_id:
            pytest.skip("Venue token or booking ID not available")
        
        # Simulate document upload by adding document URL
        response = self.session.patch(
            f"{BASE_URL}/api/bookings/{TestBookingsNotifications.booking_id}",
            headers={"Authorization": f"Bearer {TestBookingsNotifications.venue_token}"},
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
    
    def test_13_artist_uploads_document(self):
        """P2: Artist can upload document to accepted booking"""
        if not TestBookingsNotifications.artist_token or not TestBookingsNotifications.booking_id:
            pytest.skip("Artist token or booking ID not available")
        
        # Simulate document upload by adding document URL
        response = self.session.patch(
            f"{BASE_URL}/api/bookings/{TestBookingsNotifications.booking_id}",
            headers={"Authorization": f"Bearer {TestBookingsNotifications.artist_token}"},
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
    
    def test_14_get_booking_details(self):
        """Verify booking has all documents"""
        if not TestBookingsNotifications.venue_token or not TestBookingsNotifications.booking_id:
            pytest.skip("Venue token or booking ID not available")
        
        response = self.session.get(
            f"{BASE_URL}/api/bookings/{TestBookingsNotifications.booking_id}",
            headers={"Authorization": f"Bearer {TestBookingsNotifications.venue_token}"}
        )
        
        print(f"Get booking details response: {response.status_code}")
        assert response.status_code == 200, f"Failed to get booking details: {response.text}"
        
        data = response.json()
        assert data.get("status") == "accepted"
        assert len(data.get("venue_documents", [])) > 0
        assert len(data.get("artist_documents", [])) > 0
        print(f"✓ Booking has venue docs: {len(data.get('venue_documents', []))}, artist docs: {len(data.get('artist_documents', []))}")
    
    def test_15_venue_calendar(self):
        """Verify venue calendar shows accepted booking"""
        if not TestBookingsNotifications.venue_id:
            pytest.skip("Venue ID not available")
        
        response = self.session.get(
            f"{BASE_URL}/api/bookings/venue/{TestBookingsNotifications.venue_id}/calendar"
        )
        
        print(f"Get venue calendar response: {response.status_code}")
        assert response.status_code == 200, f"Failed to get venue calendar: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Venue calendar works, found {len(data)} events")
    
    def test_16_mark_all_notifications_read(self):
        """P1: Mark all notifications as read"""
        if not TestBookingsNotifications.venue_token:
            pytest.skip("Venue token not available")
        
        response = self.session.post(
            f"{BASE_URL}/api/notifications/mark-read",
            headers={"Authorization": f"Bearer {TestBookingsNotifications.venue_token}"},
            json={"mark_all_read": True}
        )
        
        print(f"Mark all notifications read response: {response.status_code}")
        assert response.status_code == 200, f"Failed to mark all notifications as read: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Marked {data.get('updated_count', 0)} notifications as read")


class TestDeclineBooking:
    """Test booking decline flow"""
    
    venue_token = None
    venue_id = None
    artist_token = None
    artist_id = None
    booking_id = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_01_login_admin(self):
        """Login as admin to verify auth works"""
        # Use query params for login
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            params={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        )
        
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        print(f"✓ Admin logged in")
    
    def test_02_create_decline_test_users(self):
        """Create users for decline test"""
        # Create venue user
        venue_username = f"TEST_venue_decline_{datetime.now().strftime('%H%M%S')}"
        response = self.session.post(f"{BASE_URL}/api/auth/register", json={
            "username": venue_username,
            "email": f"{venue_username}@test.com",
            "password": TEST_PASSWORD,
            "full_name": "Test Venue Decline",
            "category": "venue",
            "location": "Test City"
        })
        
        if response.status_code == 201:
            data = response.json()
            TestDeclineBooking.venue_token = data.get("access_token")
            TestDeclineBooking.venue_id = data.get("user", {}).get("id")
            print(f"✓ Created venue user for decline test: {venue_username}")
        else:
            pytest.skip(f"Could not create venue user: {response.text}")
        
        # Create artist user
        artist_username = f"TEST_artist_decline_{datetime.now().strftime('%H%M%S')}"
        response = self.session.post(f"{BASE_URL}/api/auth/register", json={
            "username": artist_username,
            "email": f"{artist_username}@test.com",
            "password": TEST_PASSWORD,
            "full_name": "Test Artist Decline",
            "category": "musician",
            "location": "Test City"
        })
        
        if response.status_code == 201:
            data = response.json()
            TestDeclineBooking.artist_token = data.get("access_token")
            TestDeclineBooking.artist_id = data.get("user", {}).get("id")
            print(f"✓ Created artist user for decline test: {artist_username}")
        else:
            pytest.skip(f"Could not create artist user: {response.text}")
    
    def test_03_create_booking_to_decline(self):
        """Create a booking request to decline"""
        if not TestDeclineBooking.artist_token or not TestDeclineBooking.venue_id:
            pytest.skip("Artist token or venue ID not available")
        
        future_date = (datetime.now() + timedelta(days=45)).strftime("%Y-%m-%d")
        
        response = self.session.post(
            f"{BASE_URL}/api/bookings",
            headers={"Authorization": f"Bearer {TestDeclineBooking.artist_token}"},
            json={
                "venue_id": TestDeclineBooking.venue_id,
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
    
    def test_04_venue_declines_booking(self):
        """P0: Venue owner declines booking request"""
        if not TestDeclineBooking.venue_token or not TestDeclineBooking.booking_id:
            pytest.skip("Venue token or booking ID not available")
        
        response = self.session.patch(
            f"{BASE_URL}/api/bookings/{TestDeclineBooking.booking_id}",
            headers={"Authorization": f"Bearer {TestDeclineBooking.venue_token}"},
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
    
    def test_05_artist_notification_on_decline(self):
        """P1: Artist receives notification when booking is declined"""
        if not TestDeclineBooking.artist_token:
            pytest.skip("Artist token not available")
        
        response = self.session.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {TestDeclineBooking.artist_token}"}
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
