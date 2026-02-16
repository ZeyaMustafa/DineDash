import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import HomePage from './pages/HomePage';
import RestaurantHomePage from './pages/RestaurantHomePage';
import RestaurantPage from './pages/RestaurantPage';
import CustomerAuth from './pages/CustomerAuth';
import RestaurantAuth from './pages/RestaurantAuth';
import AdminAuth from './pages/AdminAuth';
import AdminDashboard from './pages/AdminDashboard';
import CartCheckout from './pages/CartCheckout';
import OrderTracking from './pages/OrderTracking';
import ReservationTracking from './pages/ReservationTracking';
import CustomerProfile from './pages/CustomerProfile';
import FavoritesPage from './pages/FavoritesPage';
import RestaurantDashboard from './pages/RestaurantDashboard';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentCancel from './pages/PaymentCancel';
import { CartProvider } from './context/CartContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import '@/App.css';

const HomeRedirect = () => {
  const { isRestaurant, isAdmin } = useAuth();
  if (isAdmin) return <Navigate to="/admin" replace />;
  return isRestaurant ? <RestaurantHomePage /> : <HomePage />;
};

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <div className="App">
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<HomeRedirect />} />
              <Route path="/restaurant/:id" element={<RestaurantPage />} />
              <Route path="/customer-auth" element={<CustomerAuth />} />
              <Route path="/restaurant-auth" element={<RestaurantAuth />} />
              <Route path="/admin-auth" element={<AdminAuth />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/cart" element={<CartCheckout />} />
              <Route path="/orders/:orderId" element={<OrderTracking />} />
              <Route path="/reservations/:reservationId" element={<ReservationTracking />} />
              <Route path="/customer-profile" element={<CustomerProfile />} />
              <Route path="/favorites" element={<FavoritesPage />} />
              <Route path="/restaurant-dashboard" element={<RestaurantDashboard />} />
              <Route path="/payment-success" element={<PaymentSuccess />} />
              <Route path="/payment-cancel" element={<PaymentCancel />} />
            </Routes>
          </BrowserRouter>
          <Toaster />
        </div>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;