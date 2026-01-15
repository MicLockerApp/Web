#!/usr/bin/env python3
"""
MicLocker Support Ticketing System Test Suite

Tests backend support ticket APIs and functionality.
"""
import requests
import json
import sys
import time
from datetime import datetime
from typing import Dict, Any, Optional

class TicketingTestSuite:
    def __init__(self, base_url: str = "https://audio-bazaar-6.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.admin_token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test ticket system
        self.test_ticket_id = None
        self.test_ticket_number = None
        
        # Test credentials
        self.test_username = "jmcdougall"
        self.test_password = "Eisenhower1212!!"

    def log_result(self, test_name: str, passed: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        self.tests_run += 1
        if passed:
            self.tests_passed += 1
            print(f"✅ {test_name}")
        else:
            print(f"❌ {test_name}: {details}")
        
        self.test_results.append({
            "test": test_name,
            "passed": passed,
            "details": details,
            "response_data": response_data
        })

    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                    headers: Optional[Dict] = None, use_admin: bool = False) -> requests.Response:
        """Make HTTP request with proper headers"""
        url = f"{self.base_url}/api{endpoint}"
        
        request_headers = {'Content-Type': 'application/json'}
        if use_admin and self.admin_token:
            request_headers['Authorization'] = f'Bearer {self.admin_token}'
        elif self.token:
            request_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            request_headers.update(headers)

        try:
            if method.upper() == 'GET':
                response = requests.get(url, headers=request_headers, timeout=30)
            elif method.upper() == 'POST':
                response = requests.post(url, json=data, headers=request_headers, timeout=30)
            elif method.upper() == 'PUT':
                response = requests.put(url, json=data, headers=request_headers, timeout=30)
            elif method.upper() == 'DELETE':
                response = requests.delete(url, headers=request_headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            return response
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            raise

    def test_login(self) -> bool:
        """Test user login and get token"""
        try:
            # Login endpoint expects query parameters
            url = f"{self.base_url}/api/auth/login?username={self.test_username}&password={self.test_password}"
            response = requests.post(url, headers={'Content-Type': 'application/json'}, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get('access_token')
                
                # Get user info to check if admin
                user_response = self.make_request('GET', '/auth/me')
                if user_response.status_code == 200:
                    user_data = user_response.json()
                    self.user_id = user_data.get('id')
                    if user_data.get('is_admin'):
                        self.admin_token = self.token
                
                self.log_result("User Login", True, f"Token obtained, Admin: {bool(self.admin_token)}")
                return True
            else:
                self.log_result("User Login", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_result("User Login", False, str(e))
            return False

    def test_ticket_creation(self):
        """Test ticket creation API"""
        if not self.token:
            self.log_result("Ticket Creation", False, "No authentication token")
            return

        try:
            ticket_data = {
                "category": "Technical Issue",
                "subject": "Test ticket from automated test",
                "message": "This is a test ticket created by the automated test suite to verify the ticketing system is working correctly.",
                "order_id": None
            }
            
            response = self.make_request('POST', '/tickets', ticket_data)
            
            if response.status_code == 201:
                data = response.json()
                if 'ticket_number' in data and 'ticket_id' in data:
                    self.test_ticket_id = data['ticket_id']
                    self.test_ticket_number = data['ticket_number']
                    self.log_result("Ticket Creation", True, f"Created ticket {data['ticket_number']}")
                    return True
                else:
                    self.log_result("Ticket Creation", False, "Missing ticket_number or ticket_id in response")
            else:
                self.log_result("Ticket Creation", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("Ticket Creation", False, str(e))
        return False

    def test_ticket_categories(self):
        """Test getting ticket categories"""
        try:
            response = self.make_request('GET', '/tickets/categories')
            
            if response.status_code == 200:
                data = response.json()
                if 'categories' in data and 'statuses' in data and 'priorities' in data:
                    categories = data['categories']
                    if len(categories) > 0:
                        self.log_result("Ticket Categories", True, f"Found {len(categories)} categories")
                    else:
                        self.log_result("Ticket Categories", False, "No categories returned")
                else:
                    self.log_result("Ticket Categories", False, "Missing required fields in response")
            else:
                self.log_result("Ticket Categories", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Ticket Categories", False, str(e))

    def test_admin_ticket_stats(self):
        """Test admin ticket statistics API"""
        if not self.admin_token:
            self.log_result("Admin Ticket Stats", False, "No admin token available")
            return

        try:
            response = self.make_request('GET', '/tickets/admin/stats', use_admin=True)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['total_tickets', 'open', 'in_progress', 'resolved', 'pending_total']
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    self.log_result("Admin Ticket Stats", True, f"Stats: {data['pending_total']} pending, {data['total_tickets']} total")
                else:
                    self.log_result("Admin Ticket Stats", False, f"Missing fields: {missing_fields}")
            else:
                self.log_result("Admin Ticket Stats", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Admin Ticket Stats", False, str(e))

    def test_admin_ticket_list(self):
        """Test admin ticket list API"""
        if not self.admin_token:
            self.log_result("Admin Ticket List", False, "No admin token available")
            return

        try:
            response = self.make_request('GET', '/tickets/admin/all?limit=10', use_admin=True)
            
            if response.status_code == 200:
                data = response.json()
                if 'tickets' in data and 'total' in data:
                    tickets = data['tickets']
                    self.log_result("Admin Ticket List", True, f"Retrieved {len(tickets)} tickets, total: {data['total']}")
                else:
                    self.log_result("Admin Ticket List", False, "Missing tickets or total in response")
            else:
                self.log_result("Admin Ticket List", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Admin Ticket List", False, str(e))

    def test_ticket_detail(self):
        """Test getting ticket details"""
        if not hasattr(self, 'test_ticket_id') or not self.test_ticket_id:
            self.log_result("Ticket Detail", False, "No test ticket ID available")
            return

        try:
            response = self.make_request('GET', f'/tickets/{self.test_ticket_id}')
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['id', 'ticket_number', 'subject', 'message', 'status', 'category']
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    self.log_result("Ticket Detail", True, f"Retrieved ticket {data['ticket_number']}")
                else:
                    self.log_result("Ticket Detail", False, f"Missing fields: {missing_fields}")
            else:
                self.log_result("Ticket Detail", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Ticket Detail", False, str(e))

    def test_ticket_reply(self):
        """Test adding a reply to a ticket"""
        if not hasattr(self, 'test_ticket_id') or not self.test_ticket_id:
            self.log_result("Ticket Reply", False, "No test ticket ID available")
            return

        try:
            reply_data = {
                "message": "This is a test reply from the automated test suite."
            }
            
            response = self.make_request('POST', f'/tickets/{self.test_ticket_id}/reply', reply_data)
            
            if response.status_code == 200:
                data = response.json()
                if 'message' in data:
                    self.log_result("Ticket Reply", True, "Reply added successfully")
                else:
                    self.log_result("Ticket Reply", False, "Unexpected response format")
            else:
                self.log_result("Ticket Reply", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("Ticket Reply", False, str(e))

    def test_admin_ticket_status_update(self):
        """Test updating ticket status (admin only)"""
        if not self.admin_token or not hasattr(self, 'test_ticket_id') or not self.test_ticket_id:
            self.log_result("Admin Status Update", False, "No admin token or test ticket ID")
            return

        try:
            update_data = {
                "status": "in_progress",
                "priority": "high"
            }
            
            response = self.make_request('PUT', f'/tickets/admin/{self.test_ticket_id}/status', update_data, use_admin=True)
            
            if response.status_code == 200:
                data = response.json()
                if 'message' in data:
                    self.log_result("Admin Status Update", True, "Status updated successfully")
                else:
                    self.log_result("Admin Status Update", False, "Unexpected response format")
            else:
                self.log_result("Admin Status Update", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("Admin Status Update", False, str(e))

    def run_all_tests(self):
        """Run all ticket system tests"""
        print("🎫 Starting MicLocker Support Ticketing System Tests...")
        print(f"📡 Testing against: {self.base_url}")
        print("=" * 60)

        # Authentication
        if not self.test_login():
            print("❌ Cannot proceed without authentication")
            return False

        # Test ticket categories
        print("\n📋 Testing Ticket Categories...")
        self.test_ticket_categories()

        # Test ticket creation
        print("\n🎫 Testing Ticket Creation...")
        if self.test_ticket_creation():
            # Test ticket detail retrieval
            print("\n🔍 Testing Ticket Detail...")
            self.test_ticket_detail()
            
            # Test ticket reply
            print("\n💬 Testing Ticket Reply...")
            self.test_ticket_reply()

        # Test admin endpoints
        if self.admin_token:
            print("\n👑 Testing Admin Endpoints...")
            self.test_admin_ticket_stats()
            self.test_admin_ticket_list()
            
            if hasattr(self, 'test_ticket_id') and self.test_ticket_id:
                print("\n⚙️ Testing Admin Status Update...")
                self.test_admin_ticket_status_update()

        # Summary
        print("\n" + "=" * 60)
        print(f"📈 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All ticketing tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    """Main test runner"""
    tester = TicketingTestSuite()
    success = tester.run_all_tests()
    
    # Save detailed results
    results = {
        "timestamp": datetime.utcnow().isoformat(),
        "total_tests": tester.tests_run,
        "passed_tests": tester.tests_passed,
        "success_rate": (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0,
        "test_details": tester.test_results
    }
    
    with open('/tmp/ticketing_test_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())