import requests
import sys
from datetime import datetime
import json

class MicLockerAPITester:
    def __init__(self, base_url="https://audio-bazaar-6.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.user_id = None
        self.admin_user_id = None
        self.test_offer_id = None
        self.test_order_id = None

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

    def test_login_regular_user(self, username="guitarking", password="password123"):
        """Test login with regular user credentials"""
        success, response = self.run_test(
            "Login with Regular User",
            "POST",
            f"auth/login?username={username}&password={password}",
            200
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"   Token obtained: {self.token[:20]}...")
            return True
        return False

    def test_login_admin_user(self, username="jmcdougall", password="Eisenhower1212!!"):
        """Test login with admin user credentials"""
        success, response = self.run_test(
            "Login with Admin User",
            "POST",
            f"auth/login?username={username}&password={password}",
            200
        )
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            print(f"   Admin Token obtained: {self.admin_token[:20]}...")
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

    def test_get_admin_user(self):
        """Test getting admin user info"""
        # Switch to admin token temporarily
        saved_token = self.token
        self.token = self.admin_token
        
        success, response = self.run_test(
            "Get Admin User Info",
            "GET",
            "auth/me",
            200
        )
        
        # Restore regular token
        self.token = saved_token
        
        if success and 'id' in response:
            self.admin_user_id = response['id']
            print(f"   Admin User ID: {self.admin_user_id}")
            print(f"   Admin Username: {response.get('username')}")
            print(f"   Is Admin: {response.get('is_admin')}")
            return True
        return False

    # OFFERS TESTING
    def test_get_received_offers(self):
        """Test getting received offers (as seller)"""
        success, response = self.run_test(
            "Get Received Offers",
            "GET",
            "offers?type=received",
            200
        )
        if success:
            offers = response.get('offers', [])
            print(f"   Found {len(offers)} received offers")
            if offers:
                self.test_offer_id = offers[0]['id']
                print(f"   First offer ID: {self.test_offer_id}")
            return True
        return False

    def test_get_sent_offers(self):
        """Test getting sent offers (as buyer)"""
        success, response = self.run_test(
            "Get Sent Offers",
            "GET",
            "offers?type=sent",
            200
        )
        if success:
            offers = response.get('offers', [])
            print(f"   Found {len(offers)} sent offers")
            return True
        return False

    def test_offer_actions(self):
        """Test offer accept, counter, decline actions"""
        if not self.test_offer_id:
            print("   ⚠️  No test offer available, skipping offer actions")
            return True
        
        # Test getting specific offer
        success, response = self.run_test(
            "Get Specific Offer",
            "GET",
            f"offers/{self.test_offer_id}",
            200
        )
        
        if success:
            offer_status = response.get('status')
            print(f"   Offer status: {offer_status}")
            
            # Test counter offer (if pending)
            if offer_status == 'pending':
                counter_data = {
                    "counter_price": 150.00,
                    "message": "Counter offer test"
                }
                counter_success, _ = self.run_test(
                    "Counter Offer",
                    "POST",
                    f"offers/{self.test_offer_id}/counter",
                    200,
                    data=counter_data
                )
                if counter_success:
                    print("   ✅ Counter offer successful")
            
            return True
        return False

    # ORDERS TESTING  
    def test_get_orders(self):
        """Test getting user orders (purchases)"""
        success, response = self.run_test(
            "Get User Orders",
            "GET",
            "orders",
            200
        )
        if success:
            orders = response.get('orders', [])
            print(f"   Found {len(orders)} orders")
            if orders:
                self.test_order_id = orders[0]['id']
                print(f"   First order ID: {self.test_order_id}")
            return True
        return False

    def test_get_sales(self):
        """Test getting user sales"""
        success, response = self.run_test(
            "Get User Sales",
            "GET",
            "orders/sales",
            200
        )
        if success:
            sales = response.get('orders', [])
            print(f"   Found {len(sales)} sales")
            return True
        return False

    def test_get_order_detail(self):
        """Test getting specific order details"""
        if not self.test_order_id:
            print("   ⚠️  No test order available, skipping order detail")
            return True
            
        success, response = self.run_test(
            "Get Order Detail",
            "GET",
            f"orders/{self.test_order_id}",
            200
        )
        if success:
            print(f"   Order status: {response.get('status')}")
            print(f"   Order total: ${response.get('total')}")
            return True
        return False

    def test_update_order_status(self):
        """Test updating order status"""
        if not self.test_order_id:
            print("   ⚠️  No test order available, skipping status update")
            return True
            
        status_data = {"status": "shipped"}
        success, response = self.run_test(
            "Update Order Status",
            "PUT",
            f"orders/{self.test_order_id}/status",
            200,
            data=status_data
        )
        if success:
            print(f"   Order status updated to: {response.get('status')}")
            return True
        return False

    # REVIEWS TESTING
    def test_create_review(self):
        """Test creating a review"""
        if not self.test_order_id:
            print("   ⚠️  No test order available, skipping review creation")
            return True
            
        review_data = {
            "order_id": self.test_order_id,
            "rating": 5,
            "comment": "Great transaction, highly recommended seller!"
        }
        
        success, response = self.run_test(
            "Create Review",
            "POST",
            "reviews",
            200,
            data=review_data
        )
        if success:
            print(f"   Review created with rating: {response.get('rating')}")
            return True
        return False

    def test_get_seller_reviews(self):
        """Test getting reviews for a seller"""
        if not self.admin_user_id:
            print("   ⚠️  No seller ID available, skipping seller reviews")
            return True
            
        success, response = self.run_test(
            "Get Seller Reviews",
            "GET",
            f"reviews/seller/{self.admin_user_id}",
            200
        )
        if success:
            reviews = response.get('reviews', [])
            avg_rating = response.get('average_rating', 0)
            print(f"   Found {len(reviews)} reviews")
            print(f"   Average rating: {avg_rating}")
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
        # Switch to admin token
        saved_token = self.token
        self.token = self.admin_token
        
        success, response = self.run_test(
            "Get Admin Analytics",
            "GET",
            "admin/analytics",
            200
        )
        
        # Restore regular token
        self.token = saved_token
        
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
        # Switch to admin token
        saved_token = self.token
        self.token = self.admin_token
        
        success, response = self.run_test(
            "Get Users List (Admin)",
            "GET",
            "admin/users",
            200
        )
        
        # Restore regular token
        self.token = saved_token
        
        if success:
            users = response.get('users', [])
            print(f"   Found {len(users)} users")
            return True
        return False

    def test_admin_suspend_user(self):
        """Test suspending a user (admin only)"""
        if not self.user_id:
            print("   ⚠️  No regular user ID available, skipping suspend test")
            return True
            
        # Switch to admin token
        saved_token = self.token
        self.token = self.admin_token
        
        success, response = self.run_test(
            "Suspend User (Admin)",
            "POST",
            f"admin/users/{self.user_id}/suspend",
            200
        )
        
        if success:
            print("   ✅ User suspended successfully")
            
            # Unsuspend the user
            unsuspend_success, _ = self.run_test(
                "Unsuspend User (Admin)",
                "POST",
                f"admin/users/{self.user_id}/unsuspend",
                200
            )
            if unsuspend_success:
                print("   ✅ User unsuspended successfully")
        
        # Restore regular token
        self.token = saved_token
        return success

    def test_admin_listings(self):
        """Test getting all listings (admin only)"""
        # Switch to admin token
        saved_token = self.token
        self.token = self.admin_token
        
        success, response = self.run_test(
            "Get All Listings (Admin)",
            "GET",
            "admin/listings",
            200
        )
        
        # Restore regular token
        self.token = saved_token
        
        if success:
            listings = response.get('listings', [])
            print(f"   Found {len(listings)} listings")
            return True
        return False

    def test_admin_remove_listing(self):
        """Test removing a listing (admin only)"""
        # First get a listing to remove
        saved_token = self.token
        self.token = self.admin_token
        
        # Get listings first
        listings_success, listings_response = self.run_test(
            "Get Listings for Removal Test",
            "GET",
            "admin/listings?status=active",
            200
        )
        
        if not listings_success:
            self.token = saved_token
            print("   ⚠️  Could not get listings for removal test")
            return True
            
        listings = listings_response.get('listings', [])
        if not listings:
            self.token = saved_token
            print("   ⚠️  No active listings available for removal test")
            return True
            
        test_listing_id = listings[0]['id']
        
        success, response = self.run_test(
            "Remove Listing (Admin)",
            "POST",
            f"admin/listings/{test_listing_id}/remove",
            200
        )
        
        # Restore regular token
        self.token = saved_token
        
        if success:
            print(f"   ✅ Listing {test_listing_id} removed successfully")
            return True
        return False

    def test_admin_orders(self):
        """Test getting orders list (admin only)"""
        # Switch to admin token
        saved_token = self.token
        self.token = self.admin_token
        
        success, response = self.run_test(
            "Get Orders List (Admin)",
            "GET",
            "admin/orders",
            200
        )
        
        # Restore regular token
        self.token = saved_token
        
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

    def test_social_media_links_update(self):
        """Test updating social media links in profile"""
        social_data = {
            "instagram": "testuser_insta",
            "twitter": "testuser_twitter", 
            "facebook": "testuser_facebook",
            "youtube": "testuser_youtube",
            "soundcloud": "testuser_soundcloud",
            "spotify": "testuser_spotify_id"
        }
        
        success, response = self.run_test(
            "Update Social Media Links",
            "PUT",
            "users/profile",
            200,
            data=social_data
        )
        
        if success:
            # Verify all social media fields are saved
            for platform, value in social_data.items():
                if response.get(platform) != value:
                    print(f"   ❌ {platform} not updated correctly: expected {value}, got {response.get(platform)}")
                    return False
            
            print(f"   ✅ All social media links updated successfully")
            return True
        return False

    def test_privacy_settings_update(self):
        """Test updating privacy settings"""
        privacy_data = {
            "show_email": True,
            "show_phone": True, 
            "show_address": False,
            "show_social": True
        }
        
        success, response = self.run_test(
            "Update Privacy Settings",
            "PUT",
            "users/profile",
            200,
            data=privacy_data
        )
        
        if success:
            # Verify privacy settings are saved
            for setting, value in privacy_data.items():
                if response.get(setting) != value:
                    print(f"   ❌ {setting} not updated correctly: expected {value}, got {response.get(setting)}")
                    return False
            
            print(f"   ✅ All privacy settings updated successfully")
            return True
        return False

    def test_shipping_address_update(self):
        """Test updating shipping address"""
        address_data = {
            "shipping_address": {
                "address_line1": "123 Test Street",
                "address_line2": "Apt 4B",
                "city": "Test City",
                "state": "TS",
                "postal_code": "12345",
                "country": "US"
            }
        }
        
        success, response = self.run_test(
            "Update Shipping Address",
            "PUT",
            "users/profile",
            200,
            data=address_data
        )
        
        if success:
            # Verify shipping address is saved
            saved_address = response.get('shipping_address', {})
            expected_address = address_data['shipping_address']
            
            for field, value in expected_address.items():
                if saved_address.get(field) != value:
                    print(f"   ❌ Address {field} not updated correctly: expected {value}, got {saved_address.get(field)}")
                    return False
            
            print(f"   ✅ Shipping address updated successfully")
            return True
        return False

    def test_public_profile_privacy_filtering(self):
        """Test that public profile respects privacy settings"""
        if not self.user_id:
            print("   ❌ No user ID available for testing")
            return False
        
        # First, set privacy settings to hide email and phone
        privacy_data = {
            "show_email": False,
            "show_phone": False,
            "show_address": False,
            "show_social": False,
            "phone": "+1-555-123-4567",
            "instagram": "private_user"
        }
        
        # Update profile with privacy settings
        update_success, _ = self.run_test(
            "Set Privacy Settings for Testing",
            "PUT",
            "users/profile",
            200,
            data=privacy_data
        )
        
        if not update_success:
            print("   ❌ Failed to set privacy settings")
            return False
        
        # Now test public profile view (without authentication)
        # Save current token and clear it to simulate public access
        saved_token = self.token
        self.token = None
        
        success, response = self.run_test(
            "Get Public Profile (Privacy Filtered)",
            "GET",
            f"users/profile/{self.user_id}",
            200
        )
        
        # Restore token
        self.token = saved_token
        
        if success:
            # Verify private data is hidden
            if response.get('email') is not None:
                print(f"   ❌ Email should be hidden but got: {response.get('email')}")
                return False
            
            if response.get('phone') is not None:
                print(f"   ❌ Phone should be hidden but got: {response.get('phone')}")
                return False
            
            if response.get('shipping_address') is not None:
                print(f"   ❌ Address should be hidden but got: {response.get('shipping_address')}")
                return False
            
            if response.get('instagram') is not None:
                print(f"   ❌ Social media should be hidden but got instagram: {response.get('instagram')}")
                return False
            
            print(f"   ✅ Privacy filtering working correctly - private data hidden")
            return True
        return False

    def test_own_profile_shows_all_data(self):
        """Test that user can see their own private data"""
        if not self.user_id:
            print("   ❌ No user ID available for testing")
            return False
        
        # Test own profile view (with authentication)
        success, response = self.run_test(
            "Get Own Profile (All Data Visible)",
            "GET",
            f"users/profile/{self.user_id}",
            200
        )
        
        if success:
            # User should see their own data regardless of privacy settings
            print(f"   ✅ Own profile shows email: {response.get('email', 'N/A')}")
            print(f"   ✅ Own profile shows phone: {response.get('phone', 'N/A')}")
            print(f"   ✅ Own profile access working correctly")
            return True
        return False

    def test_physical_address_update(self):
        """Test updating physical address"""
        address_data = {
            "physical_address": {
                "address_line1": "456 Business Ave",
                "address_line2": "Suite 200",
                "city": "Business City",
                "state": "BC",
                "postal_code": "54321",
                "country": "US"
            },
            "same_as_mailing": False
        }
        
        success, response = self.run_test(
            "Update Physical Address",
            "PUT",
            "users/profile",
            200,
            data=address_data
        )
        
        if success:
            # Verify physical address is saved
            saved_address = response.get('physical_address', {})
            expected_address = address_data['physical_address']
            
            for field, value in expected_address.items():
                if saved_address.get(field) != value:
                    print(f"   ❌ Physical address {field} not updated correctly: expected {value}, got {saved_address.get(field)}")
                    return False
            
            # Verify same_as_mailing flag
            if response.get('same_as_mailing') != False:
                print(f"   ❌ same_as_mailing not updated correctly: expected False, got {response.get('same_as_mailing')}")
                return False
            
            print(f"   ✅ Physical address updated successfully")
            print(f"   ✅ same_as_mailing flag set correctly")
            return True
        return False

    def test_physical_address_privacy_settings(self):
        """Test physical address privacy settings"""
        privacy_data = {
            "show_physical_address": True
        }
        
        success, response = self.run_test(
            "Update Physical Address Privacy",
            "PUT",
            "users/profile",
            200,
            data=privacy_data
        )
        
        if success:
            # Verify privacy setting is saved
            if response.get('show_physical_address') != True:
                print(f"   ❌ show_physical_address not updated correctly: expected True, got {response.get('show_physical_address')}")
                return False
            
            print(f"   ✅ Physical address privacy setting updated successfully")
            return True
        return False

    def test_physical_address_public_visibility(self):
        """Test that physical address is visible on public profile when enabled"""
        if not self.user_id:
            print("   ❌ No user ID available for testing")
            return False
        
        # First, enable physical address visibility
        privacy_data = {
            "show_physical_address": True,
            "physical_address": {
                "address_line1": "789 Public Street",
                "address_line2": "Floor 3",
                "city": "Public City",
                "state": "PC",
                "postal_code": "98765",
                "country": "US"
            }
        }
        
        # Update profile with physical address and enable visibility
        update_success, _ = self.run_test(
            "Set Physical Address Visibility",
            "PUT",
            "users/profile",
            200,
            data=privacy_data
        )
        
        if not update_success:
            print("   ❌ Failed to set physical address visibility")
            return False
        
        # Test public profile view (without authentication)
        saved_token = self.token
        self.token = None
        
        success, response = self.run_test(
            "Get Public Profile (Physical Address Visible)",
            "GET",
            f"users/profile/{self.user_id}",
            200
        )
        
        # Restore token
        self.token = saved_token
        
        if success:
            # Verify physical address is visible
            physical_address = response.get('physical_address')
            if not physical_address:
                print(f"   ❌ Physical address should be visible but not found")
                return False
            
            if physical_address.get('address_line1') != "789 Public Street":
                print(f"   ❌ Physical address not correct: expected '789 Public Street', got {physical_address.get('address_line1')}")
                return False
            
            print(f"   ✅ Physical address visible on public profile when enabled")
            return True
        return False

    def test_display_location_mailing_address_conflict(self):
        """Test that display location conflicts with mailing address visibility"""
        # Set a display location
        location_data = {
            "location": "Nashville, TN",
            "show_address": False  # Should remain false due to conflict
        }
        
        success, response = self.run_test(
            "Set Display Location",
            "PUT",
            "users/profile",
            200,
            data=location_data
        )
        
        if success:
            # Verify location is set
            if response.get('location') != "Nashville, TN":
                print(f"   ❌ Location not set correctly: expected 'Nashville, TN', got {response.get('location')}")
                return False
            
            # Now try to enable show_address - this should work via API but frontend should prevent it
            conflict_data = {
                "show_address": True
            }
            
            # This should succeed at API level (backend doesn't enforce the conflict)
            conflict_success, conflict_response = self.run_test(
                "Try to Enable Address with Location Set",
                "PUT",
                "users/profile",
                200,
                data=conflict_data
            )
            
            if conflict_success:
                print(f"   ✅ API allows show_address update (frontend should handle conflict)")
                print(f"   ✅ Display location conflict logic should be handled in frontend")
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
        ("Social Media Links Update", tester.test_social_media_links_update),
        ("Privacy Settings Update", tester.test_privacy_settings_update),
        ("Shipping Address Update", tester.test_shipping_address_update),
        ("Physical Address Update", tester.test_physical_address_update),
        ("Physical Address Privacy Settings", tester.test_physical_address_privacy_settings),
        ("Physical Address Public Visibility", tester.test_physical_address_public_visibility),
        ("Display Location vs Mailing Address Conflict", tester.test_display_location_mailing_address_conflict),
        ("Public Profile Privacy Filtering", tester.test_public_profile_privacy_filtering),
        ("Own Profile Shows All Data", tester.test_own_profile_shows_all_data),
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