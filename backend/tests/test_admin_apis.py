"""
Backend API Tests for DineDash Reserve Admin Panel and Core Features
Tests: Admin Auth, Dashboard Stats, Restaurant/Order/Reservation/User Management
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@dinedash.com"
ADMIN_PASSWORD = "admin123"
CUSTOMER_EMAIL = "customer@demo.com"
CUSTOMER_PASSWORD = "password123"
RESTAURANT_EMAIL = "restaurant1@demo.com"
RESTAURANT_PASSWORD = "password123"


class TestHealthCheck:
    """Basic health check tests"""
    
    def test_api_reachable(self):
        """Test that API is reachable"""
        response = requests.get(f"{BASE_URL}/api/restaurants")
        assert response.status_code == 200
        print(f"API reachable - Status: {response.status_code}")


class TestAdminAuth:
    """Admin authentication tests"""
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "Token not in response"
        assert data["role"] == "admin", f"Expected role 'admin', got '{data.get('role')}'"
        assert data["email"] == ADMIN_EMAIL
        print(f"Admin login successful - User: {data['name']}, Role: {data['role']}")
        return data["token"]
    
    def test_admin_login_invalid_credentials(self):
        """Test admin login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": "wrong@admin.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Admin login correctly rejected invalid credentials")
    
    def test_admin_login_customer_credentials(self):
        """Test admin login with customer credentials should fail"""
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Admin login correctly rejected customer credentials")


class TestAdminDashboard:
    """Admin dashboard stats tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed - skipping admin tests")
        return response.json()["token"]
    
    def test_dashboard_stats(self, admin_token):
        """Test GET /api/admin/dashboard/stats"""
        response = requests.get(
            f"{BASE_URL}/api/admin/dashboard/stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Dashboard stats failed: {response.text}"
        
        data = response.json()
        # Verify all expected fields are present
        expected_fields = [
            "total_users", "total_restaurants", "total_orders", "total_reservations",
            "pending_orders", "pending_reservations", "total_revenue",
            "order_revenue", "reservation_revenue", "recent_orders", "recent_reservations"
        ]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"Dashboard stats: Users={data['total_users']}, Restaurants={data['total_restaurants']}, "
              f"Orders={data['total_orders']}, Revenue=₹{data['total_revenue']}")
    
    def test_dashboard_stats_unauthorized(self):
        """Test dashboard stats without auth"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard/stats")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("Dashboard stats correctly requires authentication")


class TestAdminRestaurantManagement:
    """Admin restaurant management tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json()["token"]
    
    def test_get_all_restaurants(self, admin_token):
        """Test GET /api/admin/restaurants"""
        response = requests.get(
            f"{BASE_URL}/api/admin/restaurants",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Get restaurants failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of restaurants"
        
        if len(data) > 0:
            restaurant = data[0]
            # Verify owner info and stats are included
            assert "owner" in restaurant, "Missing owner info"
            assert "order_count" in restaurant, "Missing order_count"
            assert "reservation_count" in restaurant, "Missing reservation_count"
            assert "revenue" in restaurant, "Missing revenue"
            print(f"Found {len(data)} restaurants with owner info and stats")
        else:
            print("No restaurants found in database")
    
    def test_update_restaurant_status(self, admin_token):
        """Test PUT /api/admin/restaurants/{id}/status"""
        # First get a restaurant
        response = requests.get(
            f"{BASE_URL}/api/admin/restaurants",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        if response.status_code != 200 or len(response.json()) == 0:
            pytest.skip("No restaurants to test status update")
        
        restaurant_id = response.json()[0]["restaurant_id"]
        
        # Test suspend
        response = requests.put(
            f"{BASE_URL}/api/admin/restaurants/{restaurant_id}/status",
            json={"status": "suspended"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Suspend failed: {response.text}"
        print(f"Restaurant {restaurant_id[:8]} suspended successfully")
        
        # Test approve (restore)
        response = requests.put(
            f"{BASE_URL}/api/admin/restaurants/{restaurant_id}/status",
            json={"status": "approved"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Approve failed: {response.text}"
        print(f"Restaurant {restaurant_id[:8]} approved successfully")
    
    def test_update_restaurant_invalid_status(self, admin_token):
        """Test invalid status update"""
        response = requests.get(
            f"{BASE_URL}/api/admin/restaurants",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        if response.status_code != 200 or len(response.json()) == 0:
            pytest.skip("No restaurants to test")
        
        restaurant_id = response.json()[0]["restaurant_id"]
        
        response = requests.put(
            f"{BASE_URL}/api/admin/restaurants/{restaurant_id}/status",
            json={"status": "invalid_status"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("Invalid status correctly rejected")


class TestAdminOrderManagement:
    """Admin order management tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json()["token"]
    
    def test_get_all_orders(self, admin_token):
        """Test GET /api/admin/orders"""
        response = requests.get(
            f"{BASE_URL}/api/admin/orders",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Get orders failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of orders"
        
        if len(data) > 0:
            order = data[0]
            # Verify restaurant and customer info are included
            assert "restaurant" in order, "Missing restaurant info"
            assert "customer" in order, "Missing customer info"
            print(f"Found {len(data)} orders with restaurant and customer info")
        else:
            print("No orders found in database")
    
    def test_update_order_status(self, admin_token):
        """Test PUT /api/admin/orders/{id}/status"""
        # First get an order
        response = requests.get(
            f"{BASE_URL}/api/admin/orders",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        if response.status_code != 200 or len(response.json()) == 0:
            pytest.skip("No orders to test status update")
        
        order_id = response.json()[0]["order_id"]
        
        # Test status update
        response = requests.put(
            f"{BASE_URL}/api/admin/orders/{order_id}/status",
            json={"status": "ACCEPTED"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Order status update failed: {response.text}"
        print(f"Order {order_id[:8]} status updated to ACCEPTED")


class TestAdminReservationManagement:
    """Admin reservation management tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json()["token"]
    
    def test_get_all_reservations(self, admin_token):
        """Test GET /api/admin/reservations"""
        response = requests.get(
            f"{BASE_URL}/api/admin/reservations",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Get reservations failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of reservations"
        
        if len(data) > 0:
            reservation = data[0]
            # Verify restaurant and customer info are included
            assert "restaurant" in reservation, "Missing restaurant info"
            assert "customer" in reservation, "Missing customer info"
            print(f"Found {len(data)} reservations with restaurant and customer info")
        else:
            print("No reservations found in database")
    
    def test_update_reservation_status(self, admin_token):
        """Test PUT /api/admin/reservations/{id}/status"""
        # First get a reservation
        response = requests.get(
            f"{BASE_URL}/api/admin/reservations",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        if response.status_code != 200 or len(response.json()) == 0:
            pytest.skip("No reservations to test status update")
        
        reservation_id = response.json()[0]["reservation_id"]
        
        # Test status update
        response = requests.put(
            f"{BASE_URL}/api/admin/reservations/{reservation_id}/status",
            json={"status": "CONFIRMED"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Reservation status update failed: {response.text}"
        print(f"Reservation {reservation_id[:8]} status updated to CONFIRMED")


class TestAdminUserManagement:
    """Admin user management tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json()["token"]
    
    def test_get_all_users(self, admin_token):
        """Test GET /api/admin/users"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Get users failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of users"
        
        if len(data) > 0:
            user = data[0]
            # Verify activity stats are included
            assert "order_count" in user, "Missing order_count"
            assert "reservation_count" in user, "Missing reservation_count"
            print(f"Found {len(data)} users with activity stats")
        else:
            print("No users found in database")
    
    def test_update_user_status(self, admin_token):
        """Test PUT /api/admin/users/{id}/status"""
        # First get a non-admin user
        response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        if response.status_code != 200 or len(response.json()) == 0:
            pytest.skip("No users to test status update")
        
        # Find a customer user (not admin)
        users = response.json()
        customer_user = next((u for u in users if u.get("role") == "customer"), None)
        
        if not customer_user:
            pytest.skip("No customer users to test")
        
        user_id = customer_user["user_id"]
        
        # Test suspend
        response = requests.put(
            f"{BASE_URL}/api/admin/users/{user_id}/status",
            json={"status": "suspended"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"User suspend failed: {response.text}"
        print(f"User {user_id[:8]} suspended successfully")
        
        # Test activate (restore)
        response = requests.put(
            f"{BASE_URL}/api/admin/users/{user_id}/status",
            json={"status": "active"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"User activate failed: {response.text}"
        print(f"User {user_id[:8]} activated successfully")


class TestCustomerAuth:
    """Customer authentication tests"""
    
    def test_customer_login_success(self):
        """Test customer login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/customer/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 200, f"Customer login failed: {response.text}"
        
        data = response.json()
        assert "token" in data
        assert data["role"] == "customer"
        print(f"Customer login successful - User: {data['name']}")
        return data["token"]
    
    def test_customer_login_invalid(self):
        """Test customer login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/customer/login", json={
            "email": "wrong@customer.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("Customer login correctly rejected invalid credentials")


class TestRestaurantAuth:
    """Restaurant authentication tests"""
    
    def test_restaurant_login_success(self):
        """Test restaurant login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/restaurant/login", json={
            "email": RESTAURANT_EMAIL,
            "password": RESTAURANT_PASSWORD
        })
        assert response.status_code == 200, f"Restaurant login failed: {response.text}"
        
        data = response.json()
        assert "token" in data
        assert data["role"] == "restaurant"
        print(f"Restaurant login successful - User: {data['name']}")
        return data["token"]


class TestPublicEndpoints:
    """Public endpoint tests"""
    
    def test_get_restaurants(self):
        """Test GET /api/restaurants"""
        response = requests.get(f"{BASE_URL}/api/restaurants")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} restaurants")
        
        if len(data) > 0:
            restaurant = data[0]
            assert "restaurant_id" in restaurant
            assert "name" in restaurant
            return restaurant["restaurant_id"]
    
    def test_get_restaurant_by_id(self):
        """Test GET /api/restaurants/{id}"""
        # First get a restaurant ID
        response = requests.get(f"{BASE_URL}/api/restaurants")
        if response.status_code != 200 or len(response.json()) == 0:
            pytest.skip("No restaurants available")
        
        restaurant_id = response.json()[0]["restaurant_id"]
        
        response = requests.get(f"{BASE_URL}/api/restaurants/{restaurant_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["restaurant_id"] == restaurant_id
        print(f"Restaurant details fetched: {data['name']}")
    
    def test_get_restaurant_menu(self):
        """Test GET /api/restaurants/{id}/menu"""
        # First get a restaurant ID
        response = requests.get(f"{BASE_URL}/api/restaurants")
        if response.status_code != 200 or len(response.json()) == 0:
            pytest.skip("No restaurants available")
        
        restaurant_id = response.json()[0]["restaurant_id"]
        
        response = requests.get(f"{BASE_URL}/api/restaurants/{restaurant_id}/menu")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Menu has {len(data)} categories")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
