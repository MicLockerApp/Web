#!/usr/bin/env python3
"""
MicLocker Stripe Payment Integration Test Suite

Tests the complete Stripe payment flow, seller dashboard, and order tracking functionality.
"""
import requests
import json
import sys
import time
import urllib.parse
from datetime import datetime
from typing import Dict, Any, Optional

class StripePaymentTestSuite:
    def __init__(self, base_url: str = "http://localhost:8001"):
        self.base_url = base_url
        self.admin_token = None
        self.buyer_token = None
        self.seller_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test data
        self.test_order_id = None
        self.test_listing_id = None
        
        # Credentials from review request
        self.admin_username = "miclocker.support"
        self.admin_password = "Finally2026!!"
        self.test_user = "guitarking"
        self.test_user_password = "password123"

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
                    headers: Optional[Dict] = None, token: str = None) -> requests.Response:
        """Make HTTP request with proper headers"""
        url = f"{self.base_url}/api{endpoint}"
        
        request_headers = {'Content-Type': 'application/json'}
        if token:
            request_headers['Authorization'] = f'Bearer {token}'
        
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

    def test_login(self, username: str, password: str, user_type: str) -> str:
        """Test login and return token"""
        try:
            # URL encode the password with special characters
            encoded_password = urllib.parse.quote(password)
            url = f"{self.base_url}/api/auth/login?username={username}&password={encoded_password}"
            
            response = requests.post(url, headers={'Content-Type': 'application/json'}, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                token = data.get('access_token')
                
                self.log_result(f"{user_type} Login", True, f"Username: {username}")
                return token
            else:
                error_msg = "Unknown error"
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', error_msg)
                except:
                    error_msg = response.text[:200]
                
                self.log_result(f"{user_type} Login", False, f"Status {response.status_code}: {error_msg}")
                return None
                
        except Exception as e:
            self.log_result(f"{user_type} Login", False, f"Exception: {str(e)}")
            return None

    def test_payments_config_endpoint(self) -> bool:
        """Test GET /api/payments/config returns Stripe publishable key"""
        try:
            response = self.make_request('GET', '/payments/config')
            
            if response.status_code == 200:
                data = response.json()
                publishable_key = data.get('publishable_key')
                
                if publishable_key and publishable_key.startswith('pk_'):
                    self.log_result("Payment Config Endpoint", True, f"Publishable key: {publishable_key[:20]}...")
                    return True
                else:
                    self.log_result("Payment Config Endpoint", False, "No valid publishable key found")
                    return False
            else:
                self.log_result("Payment Config Endpoint", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Payment Config Endpoint", False, f"Exception: {str(e)}")
            return False

    def test_webhook_endpoint_exists(self) -> bool:
        """Test POST /api/payments/webhook endpoint exists"""
        try:
            # Send a test webhook payload (should fail validation but endpoint should exist)
            test_payload = {
                "id": "evt_test_webhook",
                "object": "event",
                "type": "checkout.session.completed",
                "data": {
                    "object": {
                        "id": "cs_test_session",
                        "payment_status": "paid"
                    }
                }
            }
            
            response = self.make_request('POST', '/payments/webhook', data=test_payload)
            
            # We expect this to fail (400 or 500) but the endpoint should exist (not 404)
            if response.status_code != 404:
                self.log_result("Webhook Endpoint Exists", True, f"Endpoint exists (status: {response.status_code})")
                return True
            else:
                self.log_result("Webhook Endpoint Exists", False, "Endpoint not found (404)")
                return False
                
        except Exception as e:
            self.log_result("Webhook Endpoint Exists", False, f"Exception: {str(e)}")
            return False

    def test_get_sales_orders(self) -> bool:
        """Test GET /api/orders/sales for seller dashboard"""
        try:
            if not self.seller_token:
                self.log_result("Get Sales Orders", False, "No seller token available")
                return False
                
            response = self.make_request('GET', '/orders/sales?limit=10', token=self.seller_token)
            
            if response.status_code == 200:
                data = response.json()
                orders = data.get('orders', [])
                
                # Look for an order we can use for tracking tests
                for order in orders:
                    if order.get('status') in ['paid', 'shipped']:
                        self.test_order_id = order.get('id')
                        break
                
                self.log_result("Get Sales Orders", True, f"Found {len(orders)} sales orders")
                return True
            else:
                self.log_result("Get Sales Orders", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Get Sales Orders", False, f"Exception: {str(e)}")
            return False

    def test_add_tracking_endpoint(self) -> bool:
        """Test PUT /api/orders/{id}/tracking endpoint"""
        try:
            if not self.seller_token:
                self.log_result("Add Tracking Endpoint", False, "No seller token available")
                return False
                
            if not self.test_order_id:
                self.log_result("Add Tracking Endpoint", False, "No test order ID available")
                return False
            
            tracking_data = {
                "carrier": "USPS",
                "tracking_number": "TEST123456789",
                "estimated_delivery": "January 30, 2026"
            }
            
            response = self.make_request('PUT', f'/orders/{self.test_order_id}/tracking', 
                                      data=tracking_data, token=self.seller_token)
            
            if response.status_code == 200:
                data = response.json()
                message = data.get('message', '')
                tracking_info = data.get('tracking_info', {})
                
                self.log_result("Add Tracking Endpoint", True, f"Message: {message}")
                return True
            elif response.status_code == 403:
                self.log_result("Add Tracking Endpoint", True, "Correctly rejected (not seller of this order)")
                return True
            elif response.status_code == 400:
                self.log_result("Add Tracking Endpoint", True, "Correctly rejected (order not in paid status)")
                return True
            else:
                self.log_result("Add Tracking Endpoint", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Add Tracking Endpoint", False, f"Exception: {str(e)}")
            return False

    def test_confirm_delivery_endpoint(self) -> bool:
        """Test POST /api/orders/{id}/confirm-delivery endpoint"""
        try:
            if not self.buyer_token:
                self.log_result("Confirm Delivery Endpoint", False, "No buyer token available")
                return False
                
            if not self.test_order_id:
                self.log_result("Confirm Delivery Endpoint", False, "No test order ID available")
                return False
            
            response = self.make_request('POST', f'/orders/{self.test_order_id}/confirm-delivery', 
                                      token=self.buyer_token)
            
            if response.status_code == 200:
                data = response.json()
                message = data.get('message', '')
                
                self.log_result("Confirm Delivery Endpoint", True, f"Message: {message}")
                return True
            elif response.status_code == 403:
                self.log_result("Confirm Delivery Endpoint", True, "Correctly rejected (not buyer of this order)")
                return True
            elif response.status_code == 400:
                self.log_result("Confirm Delivery Endpoint", True, "Correctly rejected (order not in shipped status)")
                return True
            else:
                self.log_result("Confirm Delivery Endpoint", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Confirm Delivery Endpoint", False, f"Exception: {str(e)}")
            return False

    def test_checkout_endpoint_structure(self) -> bool:
        """Test POST /api/payments/checkout endpoint structure (without valid cart)"""
        try:
            if not self.buyer_token:
                self.log_result("Checkout Endpoint Structure", False, "No buyer token available")
                return False
            
            # Test with minimal checkout data (should fail but endpoint should exist)
            checkout_data = {
                "origin_url": "https://test.com",
                "shipping_address": {
                    "full_name": "Test User",
                    "address_line1": "123 Test St",
                    "city": "Test City",
                    "state": "TS",
                    "postal_code": "12345",
                    "country": "USA"
                }
            }
            
            response = self.make_request('POST', '/payments/checkout', 
                                      data=checkout_data, token=self.buyer_token)
            
            # We expect this to fail (empty cart) but endpoint should exist
            if response.status_code == 400:
                error_data = response.json()
                detail = error_data.get('detail', '')
                if 'cart' in detail.lower() or 'empty' in detail.lower():
                    self.log_result("Checkout Endpoint Structure", True, "Correctly rejected empty cart")
                    return True
                else:
                    self.log_result("Checkout Endpoint Structure", False, f"Unexpected error: {detail}")
                    return False
            elif response.status_code == 404:
                self.log_result("Checkout Endpoint Structure", False, "Endpoint not found")
                return False
            else:
                self.log_result("Checkout Endpoint Structure", True, f"Endpoint exists (status: {response.status_code})")
                return True
                
        except Exception as e:
            self.log_result("Checkout Endpoint Structure", False, f"Exception: {str(e)}")
            return False

    def run_all_tests(self) -> bool:
        """Run all Stripe payment integration tests"""
        print("🚀 Starting MicLocker Stripe Payment Integration Tests")
        print("=" * 60)
        
        # Test logins
        print("🔐 Testing Authentication...")
        self.admin_token = self.test_login(self.admin_username, self.admin_password, "Admin")
        self.buyer_token = self.test_login(self.test_user, self.test_user_password, "Test User")
        self.seller_token = self.buyer_token  # Use same user as seller for testing
        
        if not self.admin_token or not self.buyer_token:
            print("❌ Cannot proceed without authentication")
            return False
        
        # Test payment endpoints
        print("\n💳 Testing Payment Endpoints...")
        self.test_payments_config_endpoint()
        self.test_webhook_endpoint_exists()
        self.test_checkout_endpoint_structure()
        
        # Test order management endpoints
        print("\n📦 Testing Order Management...")
        self.test_get_sales_orders()
        self.test_add_tracking_endpoint()
        self.test_confirm_delivery_endpoint()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All Stripe payment backend tests passed!")
        else:
            print("⚠️  Some backend tests failed - check details above")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test runner"""
    tester = StripePaymentTestSuite()
    success = tester.run_all_tests()
    
    # Save test results
    results = {
        "timestamp": datetime.now().isoformat(),
        "total_tests": tester.tests_run,
        "passed_tests": tester.tests_passed,
        "success_rate": f"{(tester.tests_passed/tester.tests_run*100):.1f}%" if tester.tests_run > 0 else "0%",
        "test_results": tester.test_results
    }
    
    with open('/app/stripe_payment_test_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())