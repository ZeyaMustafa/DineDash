import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Package, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CustomerProfile = () => {
  const navigate = useNavigate();
  const { user, token, isAuthenticated, isCustomer } = useAuth();
  const [orders, setOrders] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !isCustomer) {
      navigate('/customer-auth');
      return;
    }
    fetchData();
    
    // Poll for updates every 10 seconds
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [ordersRes, reservationsRes] = await Promise.all([
        axios.get(`${API}/orders`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/reservations`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setOrders(ordersRes.data);
      setReservations(reservationsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      PLACED: 'bg-blue-100 text-blue-700',
      ACCEPTED: 'bg-yellow-100 text-yellow-700',
      PREPARING: 'bg-orange-100 text-orange-700',
      OUT_FOR_DELIVERY: 'bg-purple-100 text-purple-700',
      DELIVERED: 'bg-green-100 text-green-700',
      CANCELLED: 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusLabel = (status) => {
    const labels = {
      PLACED: 'Order Placed',
      ACCEPTED: 'Order Accepted',
      PREPARING: 'Order Preparation',
      OUT_FOR_DELIVERY: 'On the way',
      DELIVERED: 'Delivered',
      CANCELLED: 'Cancelled'
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" className="bg-background">
      <header className="bg-white border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/')} data-testid="back-button">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="font-heading text-2xl font-bold" data-testid="profile-title">My Account</h1>
          <div></div>
        </div>
      </header>

      <div className="container mx-auto px-4 md:px-8 py-12">
        <div className="mb-8">
          <h2 className="font-heading text-4xl font-bold mb-2">Hello, {user?.name}!</h2>
          <p className="text-muted-foreground">{user?.email}</p>
        </div>

        <Tabs defaultValue="orders" className="space-y-8">
          <TabsList className="grid w-full md:w-96 grid-cols-2">
            <TabsTrigger value="orders" data-testid="orders-tab">
              <Package className="w-4 h-4 mr-2" />
              My Orders
            </TabsTrigger>
            <TabsTrigger value="reservations" data-testid="reservations-tab">
              <Calendar className="w-4 h-4 mr-2" />
              My Reservations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <div className="space-y-4">
              <h2 className="font-heading text-3xl font-semibold">Order History</h2>
              {orders.length === 0 ? (
                <div className="bg-white p-12 rounded-xl shadow-card border border-border text-center">
                  <p className="text-muted-foreground mb-4">No orders yet</p>
                  <Button onClick={() => navigate('/')}>Browse Restaurants</Button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {orders.map((order) => (
                    <div
                      key={order.order_id}
                      className="bg-white p-6 rounded-xl shadow-card border border-border hover:shadow-hover transition-shadow cursor-pointer"
                      onClick={() => navigate(`/orders/${order.order_id}`)}
                      data-testid={`order-${order.order_id}`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                        <div>
                          <p className="font-mono text-sm text-muted-foreground">Order #{order.order_id.slice(0, 8)}</p>
                          <p className="font-bold text-2xl text-primary">₹{order.total_amount}</p>
                        </div>
                        <span
                          className={`px-4 py-2 rounded-full text-sm font-bold ${getStatusColor(order.status)}`}
                          data-testid={`order-status-${order.order_id}`}
                        >
                          {getStatusLabel(order.status)}
                        </span>
                      </div>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          <span>{order.items?.length || 0} items</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>{new Date(order.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-border">
                        <p className="text-sm">
                          <span className="text-muted-foreground">Delivery to: </span>
                          {order.delivery_address}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="reservations">
            <div className="space-y-4">
              <h2 className="font-heading text-3xl font-semibold">Reservation History</h2>
              {reservations.length === 0 ? (
                <div className="bg-white p-12 rounded-xl shadow-card border border-border text-center">
                  <p className="text-muted-foreground mb-4">No reservations yet</p>
                  <Button onClick={() => navigate('/')}>Browse Restaurants</Button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {reservations.map((reservation) => (
                    <div
                      key={reservation.reservation_id}
                      className="bg-white p-6 rounded-xl shadow-card border border-border hover:shadow-hover transition-shadow cursor-pointer"
                      onClick={() => navigate(`/reservations/${reservation.reservation_id}`)}
                      data-testid={`reservation-${reservation.reservation_id}`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                        <div>
                          <p className="font-mono text-sm text-muted-foreground">
                            Reservation #{reservation.reservation_id.slice(0, 8)}
                          </p>
                          <p className="font-bold text-xl">{reservation.date} at {reservation.time}</p>
                          <p className="text-muted-foreground">{reservation.party_size} people</p>
                        </div>
                        <span
                          className={`px-4 py-2 rounded-full text-sm font-bold ${
                            reservation.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                            reservation.status === 'PENDING_PAYMENT' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {reservation.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <p>
                          <span className="text-muted-foreground">Amount: </span>
                          <span className="font-bold text-primary">₹{reservation.amount}</span>
                        </p>
                        <p>
                          <span className="text-muted-foreground">Payment: </span>
                          {reservation.payment_status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CustomerProfile;
