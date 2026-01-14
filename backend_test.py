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

    def test_login(self, username="jmcdougall", password="Eisenhower1212!!"):
        """Test login with new admin credentials"""
        success, response = self.run_test(
            "Login with New Admin Credentials",
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

    def test_listings_count(self):
        """Test getting listings count"""
        success, response = self.run_test(
            "Get Listings Count",
            "GET",
            "listings/stats/count",
            200
        )
        if success:
            active_listings = response.get('active_listings', 0)
            total_listings = response.get('total_listings', 0)
            print(f"   Active Listings: {active_listings}")
            print(f"   Total Listings: {total_listings}")
            
            # Verify response structure
            if 'active_listings' not in response or 'total_listings' not in response:
                print("   ❌ Missing required fields in response")
                return False
            print("   ✅ Listings count endpoint working correctly")
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
            print(f"   Platform Fees (3%): ${response.get('total_fees_collected', 0)}")
            print(f"   Processing Fees (3.19% + $0.49): ${response.get('total_processing_fees_collected', 0)}")
            print(f"   Active Listings: {response.get('active_listings', 0)}")
            print(f"   Total Users: {response.get('total_users', 0)}")
            
            # Verify fee structure
            platform_fee_percent = response.get('platform_fee_percent', 0)
            payment_processing_percent = response.get('payment_processing_percent', 0)
            payment_processing_fixed = response.get('payment_processing_fixed', 0)
            
            print(f"   Platform Fee %: {platform_fee_percent}%")
            print(f"   Payment Processing %: {payment_processing_percent}%")
            print(f"   Payment Processing Fixed: ${payment_processing_fixed}")
            
            # Validate fee structure matches requirements
            if platform_fee_percent != 3.0:
                print(f"   ❌ Platform fee should be 3%, got {platform_fee_percent}%")
                return False
            if payment_processing_percent != 3.19:
                print(f"   ❌ Payment processing % should be 3.19%, got {payment_processing_percent}%")
                return False
            if payment_processing_fixed != 0.49:
                print(f"   ❌ Payment processing fixed should be $0.49, got ${payment_processing_fixed}")
                return False
                
            print("   ✅ Fee structure matches requirements (3% + 3.19% + $0.49)")
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

    def test_auth_categories(self):
        """Test auth categories endpoint - should return 5 categories including merchant"""
        success, response = self.run_test(
            "Get Auth Categories",
            "GET",
            "auth/categories",
            200
        )
        if success:
            categories = response.get('categories', [])
            print(f"   Found {len(categories)} categories: {categories}")
            
            # Check if we have exactly 5 categories
            if len(categories) != 5:
                print(f"   ❌ Expected 5 categories, got {len(categories)}")
                return False
            
            # Check if 'merchant' is included
            if 'merchant' not in categories:
                print(f"   ❌ 'merchant' category not found in categories")
                return False
            
            # Check merchant options
            merchant_options = response.get('merchant_options', {})
            if not merchant_options:
                print(f"   ❌ merchant_options not found in response")
                return False
            
            product_types = merchant_options.get('product_types', [])
            if not product_types:
                print(f"   ❌ product_types not found in merchant_options")
                return False
            
            print(f"   ✅ Found {len(product_types)} merchant product types")
            
            # Check Audio Engineer specializations don't contain 'Cello'
            audio_engineer_options = response.get('audio_engineer_options', {})
            specializations = audio_engineer_options.get('specializations', [])
            if 'Cello' in specializations:
                print(f"   ❌ 'Cello' found in Audio Engineer specializations (should be removed)")
                return False
            
            print(f"   ✅ 'Cello' correctly removed from Audio Engineer specializations")
            print(f"   ✅ Categories API working correctly")
            return True
        return False

    def test_profile_image_upload(self):
        """Test profile image upload endpoint"""
        # Create a simple test image data (1x1 pixel PNG)
        import base64
        # Minimal PNG data for a 1x1 transparent pixel
        png_data = base64.b64decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU8'
            'AAABJRU5ErkJggg=='
        )
        
        # Test with multipart form data
        import requests
        url = f"{self.base_url}/api/users/profile/image"
        headers = {'Authorization': f'Bearer {self.token}'}
        files = {'file': ('test.png', png_data, 'image/png')}
        
        self.tests_run += 1
        print(f"\n🔍 Testing Profile Image Upload...")
        
        try:
            response = requests.post(url, headers=headers, files=files)
            success = response.status_code == 200
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                response_data = response.json()
                if 'profile_image' in response_data:
                    print(f"   ✅ Profile image URL returned: {response_data['profile_image'][:50]}...")
                return True
            else:
                print(f"❌ Failed - Expected 200, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text}")
                return False
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False

    def test_profile_update_with_subcategories(self):
        """Test profile update with sub_categories field"""
        profile_data = {
            "bio": "Updated bio for testing",
            "location": "Test City, Test State",
            "category": "musician",
            "sub_categories": ["audio_engineer", "merchant"],
            "genre": "Rock",
            "instruments": ["Electric Guitar", "Bass Electric"],
            "specializations": ["Mixing Engineers", "Mastering Engineers"],
            "merchant_products": ["Shirts", "Vinyl Records"]
        }
        
        success, response = self.run_test(
            "Update Profile with Sub-Categories",
            "PUT",
            "users/profile",
            200,
            data=profile_data
        )
        
        if success:
            # Verify the response contains the updated data
            if response.get('category') != 'musician':
                print(f"   ❌ Category not updated correctly")
                return False
            
            sub_categories = response.get('sub_categories', [])
            if 'audio_engineer' not in sub_categories or 'merchant' not in sub_categories:
                print(f"   ❌ Sub-categories not updated correctly: {sub_categories}")
                return False
            
            print(f"   ✅ Profile updated with category: {response.get('category')}")
            print(f"   ✅ Sub-categories: {sub_categories}")
            print(f"   ✅ Profile update with sub_categories working correctly")
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
        ("Login with New Admin Credentials", tester.test_login),
        ("Get Current User", tester.test_get_current_user),
        ("Auth Categories (5 categories + merchant options)", tester.test_auth_categories),
        ("Profile Image Upload", tester.test_profile_image_upload),
        ("Profile Update with Sub-Categories", tester.test_profile_update_with_subcategories),
        ("Listing Categories", tester.test_listings_categories),
        ("Search Listings", tester.test_search_listings),
        ("Featured Listings", tester.test_featured_listings),
        ("Recent Listings", tester.test_recent_listings),
        ("Listings Count", tester.test_listings_count),
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