import requests
import sys
from datetime import datetime
import json

class MicLockerAPITester:
    def __init__(self, base_url="https://79271e2c-3f71-4ae7-b616-3a6e9378d99d.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.user_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                if data:
                    response = requests.post(url, json=data, headers=test_headers)
                else:
                    response = requests.post(url, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health check endpoint"""
        return self.run_test("Health Check", "GET", "health", 200)

    def test_login(self, username="admin", password="admin123"):
        """Test login with demo credentials"""
        success, response = self.run_test(
            "Login with Demo Credentials",
            "POST",
            f"auth/login?username={username}&password={password}",
            200
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"   Token obtained: {self.token[:20]}...")
            return True
        return False

    def test_get_current_user(self):
        """Test getting current user info"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        if success and 'id' in response:
            self.user_id = response['id']
            print(f"   User ID: {self.user_id}")
            print(f"   Username: {response.get('username')}")
            print(f"   Is Admin: {response.get('is_admin')}")
            return True
        return False

    def test_listings_categories(self):
        """Test getting listing categories"""
        return self.run_test(
            "Get Listing Categories",
            "GET",
            "listings/categories",
            200
        )

    def test_search_listings(self):
        """Test searching listings"""
        success, response = self.run_test(
            "Search All Listings",
            "GET",
            "listings",
            200
        )
        if success:
            listings = response.get('listings', [])
            print(f"   Found {len(listings)} listings")
            print(f"   Total: {response.get('total', 0)}")
            return len(listings) > 0
        return False

    def test_featured_listings(self):
        """Test getting featured listings"""
        success, response = self.run_test(
            "Get Featured Listings",
            "GET",
            "listings/featured",
            200
        )
        if success:
            listings = response.get('listings', [])
            print(f"   Found {len(listings)} featured listings")
            return True
        return False

    def test_recent_listings(self):
        """Test getting recent listings"""
        success, response = self.run_test(
            "Get Recent Listings",
            "GET",
            "listings/recent",
            200
        )
        if success:
            listings = response.get('listings', [])
            print(f"   Found {len(listings)} recent listings")
            return True
        return False

    def test_get_cart(self):
        """Test getting user's cart"""
        success, response = self.run_test(
            "Get User Cart",
            "GET",
            "cart",
            200
        )
        if success:
            print(f"   Cart items: {response.get('item_count', 0)}")
            print(f"   Cart total: ${response.get('total', 0)}")
            return True
        return False

    def test_admin_analytics(self):
        """Test admin analytics (requires admin user)"""
        success, response = self.run_test(
            "Get Admin Analytics",
            "GET",
            "admin/analytics",
            200
        )
        if success:
            print(f"   Total GMV: ${response.get('total_gmv', 0)}")
            print(f"   Total Fees: ${response.get('total_fees_collected', 0)}")
            print(f"   Active Listings: {response.get('active_listings', 0)}")
            print(f"   Total Users: {response.get('total_users', 0)}")
            return True
        return False

    def test_admin_users(self):
        """Test getting users list (admin only)"""
        success, response = self.run_test(
            "Get Users List (Admin)",
            "GET",
            "admin/users",
            200
        )
        if success:
            users = response.get('users', [])
            print(f"   Found {len(users)} users")
            return True
        return False

    def test_admin_orders(self):
        """Test getting orders list (admin only)"""
        success, response = self.run_test(
            "Get Orders List (Admin)",
            "GET",
            "admin/orders",
            200
        )
        if success:
            orders = response.get('orders', [])
            print(f"   Found {len(orders)} orders")
            return True
        return False

def main():
    """Run all backend tests"""
    print("🚀 Starting MicLocker Backend API Tests")
    print("=" * 50)
    
    tester = MicLockerAPITester()
    
    # Test sequence
    tests = [
        ("Health Check", tester.test_health_check),
        ("Login", tester.test_login),
        ("Get Current User", tester.test_get_current_user),
        ("Listing Categories", tester.test_listings_categories),
        ("Search Listings", tester.test_search_listings),
        ("Featured Listings", tester.test_featured_listings),
        ("Recent Listings", tester.test_recent_listings),
        ("Get Cart", tester.test_get_cart),
        ("Admin Analytics", tester.test_admin_analytics),
        ("Admin Users", tester.test_admin_users),
        ("Admin Orders", tester.test_admin_orders),
    ]
    
    failed_tests = []
    
    for test_name, test_func in tests:
        try:
            if not test_func():
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {str(e)}")
            failed_tests.append(test_name)
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if failed_tests:
        print(f"❌ Failed tests: {', '.join(failed_tests)}")
        return 1
    else:
        print("✅ All tests passed!")
        return 0

if __name__ == "__main__":
    sys.exit(main())