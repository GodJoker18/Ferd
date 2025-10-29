#!/usr/bin/env python3
"""
Test script for Ferd API endpoints
Run this while your Flask server is running to test connectivity
"""

import requests
import json

BASE_URL = "http://127.0.0.1:5000"

def test_health():
    """Test if server is running"""
    print("\n🔍 Testing health endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/api/health", timeout=5)
        print(f"✅ Status: {response.status_code}")
        print(f"✅ Response: {response.json()}")
        return True
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to server. Is Flask running?")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_get_spots():
    """Test GET /api/hidden-spots"""
    print("\n🔍 Testing GET /api/hidden-spots...")
    try:
        response = requests.get(f"{BASE_URL}/api/hidden-spots", timeout=5)
        print(f"✅ Status: {response.status_code}")
        spots = response.json()
        print(f"✅ Found {len(spots)} spots")
        if spots:
            print(f"   First spot: {spots[0]['name']}")
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_add_spot():
    """Test POST /api/hidden-spots"""
    print("\n🔍 Testing POST /api/hidden-spots...")
    try:
        # Test data (without image)
        data = {
            'name': 'Test Beach',
            'description': 'A beautiful test beach',
            'location': 'Test City, Test State'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/hidden-spots",
            data=data,
            timeout=5
        )
        
        print(f"✅ Status: {response.status_code}")
        print(f"✅ Response: {response.json()}")
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_cors():
    """Test CORS headers"""
    print("\n🔍 Testing CORS headers...")
    try:
        response = requests.options(
            f"{BASE_URL}/api/hidden-spots",
            headers={
                'Origin': 'http://localhost:3000',
                'Access-Control-Request-Method': 'POST'
            },
            timeout=5
        )
        print(f"✅ Status: {response.status_code}")
        print(f"✅ CORS Headers: {dict(response.headers)}")
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("🧪 Ferd API Test Suite")
    print("=" * 60)
    
    if not test_health():
        print("\n❌ Server is not running!")
        print("💡 Start Flask with: python app.py")
        exit(1)
    
    test_get_spots()
    test_add_spot()
    test_cors()
    
    print("\n" + "=" * 60)
    print("✅ All tests completed!")
    print("=" * 60)