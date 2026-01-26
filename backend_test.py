#!/usr/bin/env python3
"""
MicLocker Employee Management System Test Suite

Tests backend employee management APIs and functionality.
"""
import requests
import json
import sys
import time
import urllib.parse
from datetime import datetime
from typing import Dict, Any, Optional

class EmployeeManagementTestSuite:
    def __init__(self, base_url: str = "https://eventsphere-21.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.admin_token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test employee system
        self.test_employee_id = None
        self.test_employee_username = None
        
        # Test user management system
        self.test_user_id = None
        self.test_user_username = None
        
        # Admin credentials for employee management
        self.admin_username = "miclocker.support"
        self.admin_password = "Finally2026!!"

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

    def test_admin_login(self) -> bool:
        """Test admin login with special characters"""
        try:
            # URL encode the password with special characters
            encoded_password = urllib.parse.quote(self.admin_password)
            url = f"{self.base_url}/api/auth/login?username={self.admin_username}&password={encoded_password}"
            
            response = requests.post(url, headers={'Content-Type': 'application/json'}, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get('access_token')
                self.admin_token = self.token
                
                # Get user info
                user_response = self.make_request('GET', '/auth/me', use_admin=True)
                if user_response.status_code == 200:
                    user_data = user_response.json()
                    self.user_id = user_data.get('id')
                    is_admin = user_data.get('is_admin', False)
                    
                    self.log_result("Admin Login", True, f"Admin access: {is_admin}")
                    return True
                else:
                    self.log_result("Admin Login", False, f"Failed to get user info: {user_response.status_code}")
                    return False
            else:
                error_msg = "Unknown error"
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', error_msg)
                except:
                    error_msg = response.text[:200]
                
                self.log_result("Admin Login", False, f"Status {response.status_code}: {error_msg}")
                return False
                
        except Exception as e:
            self.log_result("Admin Login", False, f"Exception: {str(e)}")
            return False

    def test_admin_analytics_access(self) -> bool:
        """Test admin can access analytics (required for admin panel)"""
        try:
            response = self.make_request('GET', '/admin/analytics', use_admin=True)
            
            if response.status_code == 200:
                data = response.json()
                user_role = data.get('user_role')
                is_owner = data.get('is_owner', False)
                
                self.log_result("Admin Analytics Access", True, f"Role: {user_role}, Owner: {is_owner}")
                return True
            else:
                self.log_result("Admin Analytics Access", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Admin Analytics Access", False, f"Exception: {str(e)}")
            return False

    def test_get_employees(self) -> bool:
        """Test getting employees list"""
        try:
            response = self.make_request('GET', '/admin/employees', use_admin=True)
            
            if response.status_code == 200:
                data = response.json()
                employees = data.get('employees', [])
                
                self.log_result("Get Employees List", True, f"Found {len(employees)} employees")
                return True
            else:
                self.log_result("Get Employees List", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Get Employees List", False, f"Exception: {str(e)}")
            return False

    def test_create_employee(self) -> bool:
        """Test creating employee without password"""
        try:
            timestamp = datetime.now().strftime('%H%M%S')
            employee_data = {
                "username": f"test_employee_{timestamp}",
                "email": f"test.employee.{timestamp}@example.com",
                "role": "employee"
            }
            
            response = self.make_request('POST', '/admin/employees', data=employee_data, use_admin=True)
            
            if response.status_code == 200:
                data = response.json()
                employee = data.get('employee', {})
                self.test_employee_id = employee.get('id')
                self.test_employee_username = employee.get('username')
                
                message = data.get('message', '')
                has_password_setup = 'password setup' in message.lower() or 'email' in message.lower()
                
                self.log_result("Create Employee (No Password)", True, f"ID: {self.test_employee_id}, Setup email: {has_password_setup}")
                return True
            else:
                error_msg = "Unknown error"
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', error_msg)
                except:
                    pass
                
                self.log_result("Create Employee (No Password)", False, f"Status {response.status_code}: {error_msg}")
                return False
                
        except Exception as e:
            self.log_result("Create Employee (No Password)", False, f"Exception: {str(e)}")
            return False

    def test_resend_setup_email(self) -> bool:
        """Test resending setup email"""
        if not self.test_employee_id:
            self.log_result("Resend Setup Email", False, "No test employee ID available")
            return False
            
        try:
            response = self.make_request('POST', f'/admin/employees/{self.test_employee_id}/resend-setup', use_admin=True)
            
            if response.status_code == 200:
                data = response.json()
                message = data.get('message', '')
                
                self.log_result("Resend Setup Email", True, f"Message: {message}")
                return True
            else:
                self.log_result("Resend Setup Email", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Resend Setup Email", False, f"Exception: {str(e)}")
            return False

    def test_update_employee_details(self) -> bool:
        """Test updating employee details"""
        if not self.test_employee_id:
            self.log_result("Update Employee Details", False, "No test employee ID available")
            return False
            
        try:
            timestamp = datetime.now().strftime('%H%M%S')
            update_data = {
                "username": f"updated_employee_{timestamp}",
                "email": f"updated.employee.{timestamp}@example.com"
            }
            
            response = self.make_request('PUT', f'/admin/employees/{self.test_employee_id}', data=update_data, use_admin=True)
            
            if response.status_code == 200:
                data = response.json()
                message = data.get('message', '')
                
                self.log_result("Update Employee Details", True, f"Message: {message}")
                return True
            else:
                self.log_result("Update Employee Details", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Update Employee Details", False, f"Exception: {str(e)}")
            return False

    def test_update_employee_role(self) -> bool:
        """Test updating employee role"""
        if not self.test_employee_id:
            self.log_result("Update Employee Role", False, "No test employee ID available")
            return False
            
        try:
            role_data = {"role": "manager"}
            
            response = self.make_request('PUT', f'/admin/employees/{self.test_employee_id}/role', data=role_data, use_admin=True)
            
            if response.status_code == 200:
                data = response.json()
                message = data.get('message', '')
                
                self.log_result("Update Employee Role", True, f"Message: {message}")
                return True
            else:
                self.log_result("Update Employee Role", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Update Employee Role", False, f"Exception: {str(e)}")
            return False

    def test_verify_invalid_setup_token(self) -> bool:
        """Test verifying invalid setup token"""
        try:
            params = "?email=invalid@example.com&token=invalid_token"
            response = self.make_request('GET', f'/auth/verify-setup-token{params}')
            
            if response.status_code == 200:
                data = response.json()
                is_valid = data.get('valid', True)
                message = data.get('message', '')
                
                if not is_valid:
                    self.log_result("Verify Invalid Setup Token", True, f"Correctly rejected: {message}")
                    return True
                else:
                    self.log_result("Verify Invalid Setup Token", False, "Should have rejected invalid token")
                    return False
            else:
                self.log_result("Verify Invalid Setup Token", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Verify Invalid Setup Token", False, f"Exception: {str(e)}")
            return False

    def test_setup_password_invalid_token(self) -> bool:
        """Test setting up password with invalid token"""
        try:
            encoded_email = urllib.parse.quote("invalid@example.com")
            encoded_token = urllib.parse.quote("invalid_token")
            encoded_password = urllib.parse.quote("TestPassword123!")
            
            endpoint = f'/auth/setup-employee-password?email={encoded_email}&token={encoded_token}&new_password={encoded_password}'
            response = self.make_request('POST', endpoint)
            
            if response.status_code == 400:
                self.log_result("Setup Password Invalid Token", True, "Correctly rejected invalid token")
                return True
            else:
                self.log_result("Setup Password Invalid Token", False, f"Expected 400, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Setup Password Invalid Token", False, f"Exception: {str(e)}")
            return False

    def test_delete_employee(self) -> bool:
        """Test deleting test employee (cleanup)"""
        if not self.test_employee_id:
            self.log_result("Delete Test Employee", True, "No test employee to delete")
            return True
            
        try:
            response = self.make_request('DELETE', f'/admin/employees/{self.test_employee_id}', use_admin=True)
            
            if response.status_code == 200:
                data = response.json()
                message = data.get('message', '')
                
                self.log_result("Delete Test Employee", True, f"Message: {message}")
                return True
            else:
                self.log_result("Delete Test Employee", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Delete Test Employee", False, f"Exception: {str(e)}")
            return False

    # =====================
    # User Management Tests
    # =====================

    def test_get_users(self) -> bool:
        """Test getting users list for user management"""
        try:
            response = self.make_request('GET', '/admin/users?page=1&limit=10', use_admin=True)
            
            if response.status_code == 200:
                data = response.json()
                users = data.get('users', [])
                
                # Find a regular user (not admin/employee) for testing
                for user in users:
                    if not user.get('is_admin') and not user.get('is_employee'):
                        self.test_user_id = user.get('id')
                        self.test_user_username = user.get('username')
                        break
                
                self.log_result("Get Users List", True, f"Found {len(users)} users, test user: {self.test_user_username}")
                return True
            else:
                self.log_result("Get Users List", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Get Users List", False, f"Exception: {str(e)}")
            return False

    def test_suspend_user(self) -> bool:
        """Test suspending a user"""
        if not self.test_user_id:
            self.log_result("Suspend User", True, "No test user available")
            return True
            
        try:
            response = self.make_request('POST', f'/admin/users/{self.test_user_id}/suspend', use_admin=True)
            
            if response.status_code == 200:
                data = response.json()
                message = data.get('message', '')
                
                self.log_result("Suspend User", True, f"Message: {message}")
                return True
            else:
                self.log_result("Suspend User", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Suspend User", False, f"Exception: {str(e)}")
            return False

    def test_unsuspend_user(self) -> bool:
        """Test unsuspending a user"""
        if not self.test_user_id:
            self.log_result("Unsuspend User", True, "No test user available")
            return True
            
        try:
            response = self.make_request('POST', f'/admin/users/{self.test_user_id}/unsuspend', use_admin=True)
            
            if response.status_code == 200:
                data = response.json()
                message = data.get('message', '')
                
                self.log_result("Unsuspend User", True, f"Message: {message}")
                return True
            else:
                self.log_result("Unsuspend User", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Unsuspend User", False, f"Exception: {str(e)}")
            return False

    def test_ban_user(self) -> bool:
        """Test banning a user with reason"""
        if not self.test_user_id:
            self.log_result("Ban User", True, "No test user available")
            return True
            
        try:
            ban_data = {"reason": "Testing ban functionality"}
            response = self.make_request('POST', f'/admin/users/{self.test_user_id}/ban', 
                                      data=ban_data, use_admin=True)
            
            if response.status_code == 200:
                data = response.json()
                message = data.get('message', '')
                
                self.log_result("Ban User", True, f"Message: {message}")
                return True
            else:
                self.log_result("Ban User", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Ban User", False, f"Exception: {str(e)}")
            return False

    def test_unban_user(self) -> bool:
        """Test unbanning a user"""
        if not self.test_user_id:
            self.log_result("Unban User", True, "No test user available")
            return True
            
        try:
            response = self.make_request('POST', f'/admin/users/{self.test_user_id}/unban', use_admin=True)
            
            if response.status_code == 200:
                data = response.json()
                message = data.get('message', '')
                
                self.log_result("Unban User", True, f"Message: {message}")
                return True
            else:
                self.log_result("Unban User", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Unban User", False, f"Exception: {str(e)}")
            return False

    def run_all_tests(self) -> bool:
        """Run all employee management and user management tests"""
        print("🚀 Starting Employee Management & User Management System Tests")
        print("=" * 60)
        
        # Test admin login first
        if not self.test_admin_login():
            print("❌ Cannot proceed without admin access")
            return False
        
        # Test admin access to analytics
        self.test_admin_analytics_access()
        
        # Test employee management endpoints
        self.test_get_employees()
        self.test_create_employee()
        self.test_resend_setup_email()
        self.test_update_employee_details()
        self.test_update_employee_role()
        
        # Test employee setup endpoints
        self.test_verify_invalid_setup_token()
        self.test_setup_password_invalid_token()
        
        # Test user management endpoints
        print("\n📋 Testing User Management APIs...")
        self.test_get_users()
        self.test_suspend_user()
        self.test_unsuspend_user()
        self.test_ban_user()
        self.test_unban_user()
        
        # Cleanup
        self.test_delete_employee()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All backend tests passed!")
        else:
            print("⚠️  Some backend tests failed - check details above")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test runner"""
    tester = EmployeeManagementTestSuite()
    success = tester.run_all_tests()
    
    # Save test results
    results = {
        "timestamp": datetime.now().isoformat(),
        "total_tests": tester.tests_run,
        "passed_tests": tester.tests_passed,
        "success_rate": f"{(tester.tests_passed/tester.tests_run*100):.1f}%" if tester.tests_run > 0 else "0%",
        "test_results": tester.test_results
    }
    
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())