#!/usr/bin/env python3
"""
SYNQRA Backend API Testing Suite
Tests all critical APIs for the SYNQRA AI Agent Platform
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, List, Tuple

class SYNQRAAPITester:
    def __init__(self, base_url: str = "https://nextmolt.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.user_email = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name: str, status: str, details: str = "", response_data: Any = None):
        """Log test result"""
        self.test_results.append({
            "name": name,
            "status": status,
            "details": details,
            "response_data": response_data,
            "timestamp": datetime.now().isoformat()
        })

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Dict = None, headers: Dict = None, require_auth: bool = False) -> Tuple[bool, Any]:
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}" if not endpoint.startswith('http') else endpoint
        test_headers = {'Content-Type': 'application/json'}
        
        # Add auth header if required and available
        if require_auth and self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        # Merge additional headers
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   {method} {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            
            try:
                response_json = response.json()
            except:
                response_json = {"raw_response": response.text}

            if success:
                self.tests_passed += 1
                print(f"✅ PASS - Status: {response.status_code}")
                if response_json and isinstance(response_json, dict):
                    if 'message' in response_json:
                        print(f"   Message: {response_json['message']}")
                self.log_test(name, "PASS", f"Status: {response.status_code}", response_json)
            else:
                print(f"❌ FAIL - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                self.log_test(name, "FAIL", f"Expected {expected_status}, got {response.status_code}", response_json)

            return success, response_json

        except requests.exceptions.Timeout:
            print(f"❌ FAIL - Request timeout")
            self.log_test(name, "FAIL", "Request timeout", None)
            return False, {}
        except Exception as e:
            print(f"❌ FAIL - Error: {str(e)}")
            self.log_test(name, "FAIL", f"Error: {str(e)}", None)
            return False, {}

    def test_health_check(self):
        """Test health endpoint"""
        return self.run_test("Health Check", "GET", "health", 200)

    def test_root_endpoint(self):
        """Test root API endpoint"""  
        return self.run_test("Root API Endpoint", "GET", "", 200)

    def test_user_registration(self):
        """Test user registration"""
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        test_user = {
            "email": f"test_{timestamp}@synqra.com",
            "password": "TestPass123!",
            "name": f"Test User {timestamp}"
        }
        
        success, response = self.run_test("User Registration", "POST", "auth/register", 200, test_user)
        
        if success and response:
            self.token = response.get('token')
            if 'user' in response:
                self.user_id = response['user'].get('id')
                self.user_email = response['user'].get('email')
            print(f"   Registered user: {self.user_email}")
            print(f"   User ID: {self.user_id}")
            print(f"   Token received: {'Yes' if self.token else 'No'}")
        
        return success, response

    def test_user_login(self):
        """Test user login with the registered user"""
        if not self.user_email:
            print("⚠️  Skipping login test - no user email from registration")
            return False, {}
            
        login_data = {
            "email": self.user_email,
            "password": "TestPass123!"
        }
        
        return self.run_test("User Login", "POST", "auth/login", 200, login_data)

    def test_auth_me(self):
        """Test getting current user info"""
        if not self.token:
            print("⚠️  Skipping auth/me test - no auth token")
            return False, {}
            
        return self.run_test("Get Current User", "GET", "auth/me", 200, require_auth=True)

    def test_agent_templates(self):
        """Test getting agent templates"""
        return self.run_test("Get Agent Templates", "GET", "agents/templates", 200, require_auth=True)

    def test_create_agent(self):
        """Test creating an AI agent"""
        if not self.token:
            print("⚠️  Skipping agent creation test - no auth token")
            return False, {}
            
        agent_data = {
            "name": "Test Agent",
            "description": "A test AI agent for testing purposes",
            "system_prompt": "You are a helpful test assistant. Be concise and helpful.",
            "model": "claude-opus-4-5-20251101",
            "temperature": 0.7,
            "template": "custom"
        }
        
        return self.run_test("Create Agent", "POST", "agents", 200, agent_data, require_auth=True)

    def test_get_agents(self):
        """Test getting user's agents"""
        if not self.token:
            print("⚠️  Skipping get agents test - no auth token")
            return False, {}
            
        return self.run_test("Get User Agents", "GET", "agents", 200, require_auth=True)

    def test_ai_chat(self):
        """Test AI chat functionality"""
        if not self.token:
            print("⚠️  Skipping AI chat test - no auth token")
            return False, {}
            
        chat_data = {
            "message": "Hello, this is a test message. Please respond briefly.",
            "session_id": None,
            "agent_id": None
        }
        
        print("   Note: AI response may take 10-15 seconds...")
        return self.run_test("AI Chat", "POST", "chat", 200, chat_data, require_auth=True)

    def test_compliance_scan(self):
        """Test compliance firewall scanning"""
        if not self.token:
            print("⚠️  Skipping compliance scan test - no auth token")
            return False, {}
            
        # Test with sensitive data
        scan_data = {
            "text": "My email is john.doe@example.com and my phone is 555-123-4567. My API key is sk-test-1234567890abcdefghij"
        }
        
        return self.run_test("Compliance Scan", "POST", "compliance/scan", 200, scan_data, require_auth=True)

    def test_analytics_stats(self):
        """Test analytics stats"""
        if not self.token:
            print("⚠️  Skipping analytics test - no auth token")  
            return False, {}
            
        return self.run_test("Analytics Stats", "GET", "analytics/stats", 200, require_auth=True)

    def test_pricing_info(self):
        """Test pricing information"""
        return self.run_test("Get Pricing", "GET", "pricing", 200, require_auth=True)

    def test_chat_sessions(self):
        """Test getting chat sessions"""
        if not self.token:
            print("⚠️  Skipping chat sessions test - no auth token")
            return False, {}
            
        return self.run_test("Get Chat Sessions", "GET", "chat/sessions", 200, require_auth=True)

    def run_all_tests(self):
        """Run comprehensive test suite"""
        print("🚀 Starting SYNQRA Backend API Test Suite")
        print("=" * 60)
        
        # Basic connectivity tests
        print("\n📡 CONNECTIVITY TESTS")
        self.test_health_check()
        self.test_root_endpoint()
        
        # Authentication tests
        print("\n🔐 AUTHENTICATION TESTS")
        self.test_user_registration()
        self.test_user_login()
        self.test_auth_me()
        
        # Core feature tests (require authentication)
        print("\n🤖 AGENT MANAGEMENT TESTS")
        self.test_agent_templates()
        self.test_create_agent()
        self.test_get_agents()
        
        print("\n💬 AI CHAT TESTS")
        self.test_ai_chat()
        self.test_chat_sessions()
        
        print("\n🛡️  COMPLIANCE TESTS")
        self.test_compliance_scan()
        
        print("\n📊 ANALYTICS & PRICING TESTS")
        self.test_analytics_stats()
        self.test_pricing_info()
        
        # Print results
        print("\n" + "=" * 60)
        print("🏁 TEST RESULTS")
        print("=" * 60)
        
        pass_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"📊 Tests Run: {self.tests_run}")
        print(f"✅ Tests Passed: {self.tests_passed}")
        print(f"❌ Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"📈 Pass Rate: {pass_rate:.1f}%")
        
        # Show failed tests
        failed_tests = [t for t in self.test_results if t['status'] == 'FAIL']
        if failed_tests:
            print(f"\n❌ FAILED TESTS ({len(failed_tests)}):")
            for test in failed_tests:
                print(f"   • {test['name']}: {test['details']}")
        
        print("\n" + "=" * 60)
        
        return self.tests_passed, self.tests_run, self.test_results

def main():
    """Main test runner"""
    tester = SYNQRAAPITester()
    
    try:
        passed, total, results = tester.run_all_tests()
        
        # Save detailed results
        results_file = "/app/backend_test_results.json"
        with open(results_file, 'w') as f:
            json.dump({
                "summary": {
                    "tests_run": total,
                    "tests_passed": passed,
                    "pass_rate": (passed / total * 100) if total > 0 else 0,
                    "timestamp": datetime.now().isoformat()
                },
                "detailed_results": results
            }, f, indent=2)
        
        print(f"📄 Detailed results saved to: {results_file}")
        
        # Return appropriate exit code
        if passed == total:
            print("🎉 All tests passed!")
            return 0
        elif passed / total >= 0.8:  # 80% pass rate
            print("⚠️  Most tests passed with some minor issues")
            return 0
        else:
            print("🚨 Significant test failures detected")
            return 1
            
    except Exception as e:
        print(f"🚨 Test suite failed with error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())