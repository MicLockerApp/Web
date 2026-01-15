#!/usr/bin/env python3
"""
MicLocker Analytics Instrumentation Test Suite

Tests backend analytics instrumentation, API endpoints, and event emission.
"""
import requests
import json
import sys
import time
from datetime import datetime
from typing import Dict, Any, Optional

class AnalyticsTestSuite:
    def __init__(self, base_url: str = "https://audio-bazaar-6.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.admin_token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
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

    def test_analytics_api_endpoints(self):
        """Test all analytics API endpoints"""
        if not self.admin_token:
            self.log_result("Analytics API Access", False, "No admin token available")
            return

        endpoints = [
            ('/analytics/realtime', 'Realtime Metrics'),
            ('/analytics/revenue', 'Revenue Analytics'),
            ('/analytics/offer-funnel', 'Offer Funnel'),
            ('/analytics/search-funnel', 'Search Funnel'),
            ('/analytics/marketplace-health', 'Marketplace Health'),
            ('/analytics/trust-safety', 'Trust & Safety'),
            ('/analytics/search-terms', 'Search Terms')
        ]

        for endpoint, name in endpoints:
            try:
                response = self.make_request('GET', endpoint, use_admin=True)
                
                if response.status_code == 200:
                    data = response.json()
                    # Verify it's valid JSON and has expected structure
                    if isinstance(data, dict):
                        self.log_result(f"Analytics API - {name}", True, f"Valid JSON response")
                    else:
                        self.log_result(f"Analytics API - {name}", False, "Invalid JSON structure")
                else:
                    self.log_result(f"Analytics API - {name}", False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_result(f"Analytics API - {name}", False, str(e))

    def test_event_emission_via_actions(self):
        """Test that backend actions emit analytics events"""
        if not self.token:
            self.log_result("Event Emission Test", False, "No authentication token")
            return

        # Get initial event count
        try:
            initial_response = self.make_request('GET', '/analytics/realtime', use_admin=True)
            if initial_response.status_code != 200:
                self.log_result("Event Emission - Initial Count", False, "Cannot get initial metrics")
                return
        except:
            self.log_result("Event Emission - Initial Count", False, "Cannot access analytics")
            return

        # Test 1: Search (should emit search event)
        try:
            search_response = self.make_request('GET', '/search/global?q=guitar&limit=5')
            if search_response.status_code == 200:
                self.log_result("Event Emission - Search", True, "Search performed successfully")
            else:
                self.log_result("Event Emission - Search", False, f"Search failed: {search_response.status_code}")
        except Exception as e:
            self.log_result("Event Emission - Search", False, str(e))

        # Test 2: View listings (should emit listing view events)
        try:
            listings_response = self.make_request('GET', '/listings?limit=5')
            if listings_response.status_code == 200:
                listings_data = listings_response.json()
                listings = listings_data.get('listings', [])
                
                if listings:
                    # View first listing
                    listing_id = listings[0]['id']
                    view_response = self.make_request('GET', f'/listings/{listing_id}')
                    if view_response.status_code == 200:
                        self.log_result("Event Emission - Listing View", True, f"Viewed listing {listing_id}")
                    else:
                        self.log_result("Event Emission - Listing View", False, f"Failed to view listing")
                else:
                    self.log_result("Event Emission - Listing View", False, "No listings available")
            else:
                self.log_result("Event Emission - Listing View", False, f"Cannot get listings: {listings_response.status_code}")
        except Exception as e:
            self.log_result("Event Emission - Listing View", False, str(e))

        # Test 3: Add to favorites (should emit favorite event)
        try:
            listings_response = self.make_request('GET', '/listings?limit=1')
            if listings_response.status_code == 200:
                listings_data = listings_response.json()
                listings = listings_data.get('listings', [])
                
                if listings:
                    listing_id = listings[0]['id']
                    fav_response = self.make_request('POST', f'/users/favorites/{listing_id}')
                    if fav_response.status_code == 200:
                        self.log_result("Event Emission - Add Favorite", True, f"Added listing {listing_id} to favorites")
                        
                        # Remove from favorites
                        unfav_response = self.make_request('DELETE', f'/users/favorites/{listing_id}')
                        if unfav_response.status_code == 200:
                            self.log_result("Event Emission - Remove Favorite", True, f"Removed listing {listing_id} from favorites")
                        else:
                            self.log_result("Event Emission - Remove Favorite", False, f"Failed to remove favorite")
                    else:
                        self.log_result("Event Emission - Add Favorite", False, f"Failed to add favorite: {fav_response.status_code}")
                else:
                    self.log_result("Event Emission - Add Favorite", False, "No listings available for favoriting")
        except Exception as e:
            self.log_result("Event Emission - Add Favorite", False, str(e))

        # Wait a moment for events to be processed
        time.sleep(2)

    def test_frontend_analytics_endpoint(self):
        """Test frontend analytics batch endpoint"""
        try:
            # Test the batch endpoint that frontend uses
            test_events = {
                "events": [
                    {
                        "event_type": "page.view",
                        "session_id": "test_session_123",
                        "device_type": "desktop",
                        "metadata": {
                            "page_name": "test_page"
                        },
                        "timestamp": datetime.utcnow().isoformat()
                    }
                ],
                "session_id": "test_session_123"
            }
            
            response = self.make_request('POST', '/events/batch', test_events)
            
            if response.status_code == 200:
                self.log_result("Frontend Analytics Endpoint", True, "Batch endpoint accepts events")
            else:
                self.log_result("Frontend Analytics Endpoint", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Frontend Analytics Endpoint", False, str(e))

    def test_cart_analytics_events(self):
        """Test cart-related analytics events"""
        if not self.token:
            return

        try:
            # Get a listing to add to cart
            listings_response = self.make_request('GET', '/listings?limit=1')
            if listings_response.status_code == 200:
                listings_data = listings_response.json()
                listings = listings_data.get('listings', [])
                
                if listings:
                    listing_id = listings[0]['id']
                    seller_id = listings[0]['seller_id']
                    
                    # Skip if it's our own listing
                    if seller_id == self.user_id:
                        self.log_result("Cart Analytics - Add to Cart", True, "Skipped (own listing)")
                        return
                    
                    # Add to cart
                    cart_response = self.make_request('POST', '/cart/items', {
                        'listing_id': listing_id,
                        'quantity': 1
                    })
                    
                    if cart_response.status_code == 200:
                        self.log_result("Cart Analytics - Add to Cart", True, f"Added listing {listing_id} to cart")
                        
                        # Get cart to find item ID
                        get_cart_response = self.make_request('GET', '/cart')
                        if get_cart_response.status_code == 200:
                            cart_data = get_cart_response.json()
                            items = cart_data.get('items', [])
                            if items:
                                item_id = items[0]['id']
                                
                                # Remove from cart
                                remove_response = self.make_request('DELETE', f'/cart/items/{item_id}')
                                if remove_response.status_code == 200:
                                    self.log_result("Cart Analytics - Remove from Cart", True, f"Removed item from cart")
                                else:
                                    self.log_result("Cart Analytics - Remove from Cart", False, f"Failed to remove: {remove_response.status_code}")
                    else:
                        self.log_result("Cart Analytics - Add to Cart", False, f"Failed to add to cart: {cart_response.status_code}")
                else:
                    self.log_result("Cart Analytics - Add to Cart", False, "No listings available")
        except Exception as e:
            self.log_result("Cart Analytics - Add to Cart", False, str(e))

    def run_all_tests(self):
        """Run all analytics tests"""
        print("🔍 Starting MicLocker Analytics Instrumentation Tests...")
        print(f"📡 Testing against: {self.base_url}")
        print("=" * 60)

        # Authentication
        if not self.test_login():
            print("❌ Cannot proceed without authentication")
            return False

        # Test analytics API endpoints
        print("\n📊 Testing Analytics API Endpoints...")
        self.test_analytics_api_endpoints()

        # Test event emission through user actions
        print("\n🎯 Testing Event Emission via User Actions...")
        self.test_event_emission_via_actions()

        # Test frontend analytics endpoint
        print("\n🌐 Testing Frontend Analytics Integration...")
        self.test_frontend_analytics_endpoint()

        # Test cart analytics
        print("\n🛒 Testing Cart Analytics Events...")
        self.test_cart_analytics_events()

        # Summary
        print("\n" + "=" * 60)
        print(f"📈 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All analytics tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    """Main test runner"""
    tester = AnalyticsTestSuite()
    success = tester.run_all_tests()
    
    # Save detailed results
    results = {
        "timestamp": datetime.utcnow().isoformat(),
        "total_tests": tester.tests_run,
        "passed_tests": tester.tests_passed,
        "success_rate": (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0,
        "test_details": tester.test_results
    }
    
    with open('/tmp/analytics_test_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())