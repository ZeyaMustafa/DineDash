import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Package, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const RestaurantDashboard = () => {
  const navigate = useNavigate();
  const { token, isAuthenticated, isRestaurant } = useAuth();
  const [orders, setOrders] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !isRestaurant) {
      navigate('/restaurant-auth');
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [ordersRes, reservationsRes] = await Promise.all([
        axios.get(`${API}/restaurant/orders`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/restaurant/reservations`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setOrders(ordersRes.data);
      setReservations(reservationsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      await axios.put(
        `${API}/orders/${orderId}/status`,
        { status },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      toast.success('Order status updated');
      fetchData();
    } catch (error) {
      toast.error('Failed to update order status');
    }
  };

  const updateReservationStatus = async (reservationId, status) => {
    try {
      await axios.put(
        `${API}/reservations/${reservationId}/status`,
        { status },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      toast.success('Reservation status updated');
      fetchData();
    } catch (error) {
      toast.error('Failed to update reservation status');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FDFBF7' }}>
      <header className="bg-white border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/')} data-testid="back-button">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="font-heading text-2xl font-bold" data-testid="dashboard-title">Restaurant Dashboard</h1>
          <div></div>
        </div>
      </header>

      <div className="container mx-auto px-4 md:px-8 py-12">
        <Tabs defaultValue="orders" className="space-y-8">
          <TabsList className="grid w-full md:w-96 grid-cols-2">
            <TabsTrigger value="orders" data-testid="orders-tab">
              <Package className="w-4 h-4 mr-2" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="reservations" data-testid="reservations-tab">
              <Calendar className="w-4 h-4 mr-2" />
              Reservations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <div className="space-y-4">
              <h2 className="font-heading text-3xl font-semibold">Orders ({orders.length})</h2>
              {orders.length === 0 ? (
                <p className="text-muted-foreground">No orders yet</p>
              ) : (
                <div className="grid gap-4">
                  {orders.map((order) => (
                    <div
                      key={order.order_id}
                      className="bg-white p-6 rounded-xl shadow-card border border-border"
                      data-testid={`order-${order.order_id}`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                        <div>
                          <p className="font-mono text-sm text-muted-foreground">#{order.order_id.slice(0, 8)}</p>
                          <p className="font-bold text-xl">₹{order.total_amount}</p>
                        </div>
                        <div className="flex flex-col md:flex-row gap-4">
                          <Select
                            value={order.status}
                            onValueChange={(status) => updateOrderStatus(order.order_id, status)}
                          >
                            <SelectTrigger className="w-48" data-testid={`order-status-${order.order_id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PLACED">Placed</SelectItem>
                              <SelectItem value="ACCEPTED">Accepted</SelectItem>
                              <SelectItem value="PREPARING">Preparing</SelectItem>
                              <SelectItem value="OUT_FOR_DELIVERY">Out for Delivery</SelectItem>
                              <SelectItem value="DELIVERED">Delivered</SelectItem>
                              <SelectItem value="CANCELLED">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Address: {order.delivery_address}</p>
                        <p>Phone: {order.delivery_phone}</p>
                        <p>Payment: {order.payment_method} ({order.payment_status})</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="reservations">
            <div className="space-y-4">
              <h2 className="font-heading text-3xl font-semibold">Reservations ({reservations.length})</h2>
              {reservations.length === 0 ? (
                <p className="text-muted-foreground">No reservations yet</p>
              ) : (
                <div className="grid gap-4">
                  {reservations.map((reservation) => (
                    <div
                      key={reservation.reservation_id}
                      className="bg-white p-6 rounded-xl shadow-card border border-border"
                      data-testid={`reservation-${reservation.reservation_id}`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                        <div>
                          <p className="font-mono text-sm text-muted-foreground">#{reservation.reservation_id.slice(0, 8)}</p>
                          <p className="font-bold text-xl">{reservation.date} at {reservation.time}</p>
                          <p className="text-muted-foreground">{reservation.party_size} people</p>
                        </div>
                        <div className="flex flex-col md:flex-row gap-4">
                          <Select
                            value={reservation.status}
                            onValueChange={(status) => updateReservationStatus(reservation.reservation_id, status)}
                          >
                            <SelectTrigger className="w-48" data-testid={`reservation-status-${reservation.reservation_id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PENDING_PAYMENT">Pending Payment</SelectItem>
                              <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                              <SelectItem value="SEATED">Seated</SelectItem>
                              <SelectItem value="COMPLETED">Completed</SelectItem>
                              <SelectItem value="CANCELLED">Cancelled</SelectItem>
                              <SelectItem value="NO_SHOW">No Show</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Amount: ₹{reservation.amount}</p>
                        <p>Payment: {reservation.payment_status}</p>
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

export default RestaurantDashboard;