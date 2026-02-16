import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Shield, LogOut, LayoutDashboard, Store, ShoppingBag, CalendarDays, Users,
  TrendingUp, DollarSign, Clock, CheckCircle, XCircle, Eye, Trash2, Ban,
  ChevronDown, Search, Filter, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Stats Card Component
const StatsCard = ({ title, value, icon: Icon, trend, color = 'primary' }) => (
  <div className="bg-white rounded-xl p-6 shadow-card border border-border" data-testid={`stats-${title.toLowerCase().replace(/\s/g, '-')}`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-muted-foreground mb-1">{title}</p>
        <p className="text-3xl font-bold">{value}</p>
        {trend && (
          <p className={`text-sm mt-1 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend > 0 ? '+' : ''}{trend}% from last week
          </p>
        )}
      </div>
      <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-${color}/10`}>
        <Icon className={`w-6 h-6 text-${color}`} />
      </div>
    </div>
  </div>
);

// Status Badge Component
const StatusBadge = ({ status }) => {
  const statusColors = {
    active: 'bg-green-100 text-green-700',
    approved: 'bg-green-100 text-green-700',
    suspended: 'bg-red-100 text-red-700',
    rejected: 'bg-red-100 text-red-700',
    pending: 'bg-yellow-100 text-yellow-700',
    PLACED: 'bg-blue-100 text-blue-700',
    ACCEPTED: 'bg-indigo-100 text-indigo-700',
    PREPARING: 'bg-orange-100 text-orange-700',
    OUT_FOR_DELIVERY: 'bg-purple-100 text-purple-700',
    DELIVERED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-700',
    PENDING_PAYMENT: 'bg-yellow-100 text-yellow-700',
    CONFIRMED: 'bg-green-100 text-green-700',
    SEATED: 'bg-blue-100 text-blue-700',
    COMPLETED: 'bg-green-100 text-green-700',
    NO_SHOW: 'bg-gray-100 text-gray-700',
    paid: 'bg-green-100 text-green-700'
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || 'bg-gray-100 text-gray-700'}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, token, logout, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [orders, setOrders] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (!isAdmin) {
      navigate('/admin-auth');
      return;
    }
    fetchDashboardData();
  }, [isAdmin]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const [statsRes, restaurantsRes, ordersRes, reservationsRes, usersRes] = await Promise.all([
        axios.get(`${API}/admin/dashboard/stats`, { headers }),
        axios.get(`${API}/admin/restaurants`, { headers }),
        axios.get(`${API}/admin/orders`, { headers }),
        axios.get(`${API}/admin/reservations`, { headers }),
        axios.get(`${API}/admin/users`, { headers })
      ]);

      setStats(statsRes.data);
      setRestaurants(restaurantsRes.data);
      setOrders(ordersRes.data);
      setReservations(reservationsRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleRestaurantStatus = async (restaurantId, status) => {
    try {
      await axios.put(`${API}/admin/restaurants/${restaurantId}/status`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Restaurant ${status}`);
      fetchDashboardData();
    } catch (error) {
      toast.error('Failed to update restaurant status');
    }
  };

  const handleDeleteRestaurant = async (restaurantId) => {
    if (!window.confirm('Are you sure you want to delete this restaurant? This action cannot be undone.')) return;
    
    try {
      await axios.delete(`${API}/admin/restaurants/${restaurantId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Restaurant deleted');
      fetchDashboardData();
    } catch (error) {
      toast.error('Failed to delete restaurant');
    }
  };

  const handleOrderStatus = async (orderId, status) => {
    try {
      await axios.put(`${API}/admin/orders/${orderId}/status`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Order status updated');
      fetchDashboardData();
    } catch (error) {
      toast.error('Failed to update order status');
    }
  };

  const handleReservationStatus = async (reservationId, status) => {
    try {
      await axios.put(`${API}/admin/reservations/${reservationId}/status`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Reservation status updated');
      fetchDashboardData();
    } catch (error) {
      toast.error('Failed to update reservation status');
    }
  };

  const handleUserStatus = async (userId, status) => {
    try {
      await axios.put(`${API}/admin/users/${userId}/status`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`User ${status}`);
      fetchDashboardData();
    } catch (error) {
      toast.error('Failed to update user status');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    
    try {
      await axios.delete(`${API}/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('User deleted');
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete user');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const filteredRestaurants = restaurants.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (statusFilter === 'all' || r.status === statusFilter)
  );

  const filteredOrders = orders.filter(o => 
    (o.order_id?.includes(searchQuery) || o.restaurant_name?.toLowerCase().includes(searchQuery.toLowerCase())) &&
    (statusFilter === 'all' || o.status === statusFilter)
  );

  const filteredReservations = reservations.filter(r => 
    (r.reservation_id?.includes(searchQuery) || r.restaurant_name?.toLowerCase().includes(searchQuery.toLowerCase())) &&
    (statusFilter === 'all' || r.status === statusFilter)
  );

  const filteredUsers = users.filter(u => 
    (u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || u.email?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900 text-white">
        <div className="container mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-xl font-bold">DineDash Admin</h1>
                <p className="text-sm text-gray-400">Management Console</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400">Welcome, {user?.name}</span>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white hover:text-white hover:bg-white/10">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 md:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white shadow-card border border-border p-1 rounded-xl">
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg">
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="restaurants" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg">
              <Store className="w-4 h-4 mr-2" />
              Restaurants
            </TabsTrigger>
            <TabsTrigger value="orders" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg">
              <ShoppingBag className="w-4 h-4 mr-2" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="reservations" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg">
              <CalendarDays className="w-4 h-4 mr-2" />
              Reservations
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg">
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatsCard title="Total Revenue" value={`₹${stats?.total_revenue?.toLocaleString() || 0}`} icon={DollarSign} color="green-600" />
              <StatsCard title="Total Orders" value={stats?.total_orders || 0} icon={ShoppingBag} color="blue-600" />
              <StatsCard title="Total Reservations" value={stats?.total_reservations || 0} icon={CalendarDays} color="purple-600" />
              <StatsCard title="Total Users" value={stats?.total_users || 0} icon={Users} color="orange-600" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatsCard title="Restaurants" value={stats?.total_restaurants || 0} icon={Store} color="primary" />
              <StatsCard title="Pending Orders" value={stats?.pending_orders || 0} icon={Clock} color="yellow-600" />
              <StatsCard title="Recent Orders (7d)" value={stats?.recent_orders || 0} icon={TrendingUp} color="green-600" />
              <StatsCard title="Recent Reservations (7d)" value={stats?.recent_reservations || 0} icon={TrendingUp} color="blue-600" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Orders */}
              <div className="bg-white rounded-xl p-6 shadow-card border border-border">
                <h3 className="font-semibold text-lg mb-4">Recent Orders</h3>
                <div className="space-y-3">
                  {orders.slice(0, 5).map(order => (
                    <div key={order.order_id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="font-medium">{order.restaurant_name}</p>
                        <p className="text-sm text-muted-foreground">₹{order.total_amount}</p>
                      </div>
                      <StatusBadge status={order.status} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Reservations */}
              <div className="bg-white rounded-xl p-6 shadow-card border border-border">
                <h3 className="font-semibold text-lg mb-4">Recent Reservations</h3>
                <div className="space-y-3">
                  {reservations.slice(0, 5).map(reservation => (
                    <div key={reservation.reservation_id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="font-medium">{reservation.restaurant_name}</p>
                        <p className="text-sm text-muted-foreground">{reservation.date} at {reservation.time}</p>
                      </div>
                      <StatusBadge status={reservation.status} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Restaurants Tab */}
          <TabsContent value="restaurants" className="space-y-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search restaurants..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={fetchDashboardData}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>

            <div className="bg-white rounded-xl shadow-card border border-border overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Restaurant</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Owner</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Cuisine</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Orders</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Revenue</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRestaurants.map(restaurant => (
                    <tr key={restaurant.restaurant_id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img src={restaurant.image_url} alt={restaurant.name} className="w-10 h-10 rounded-lg object-cover" />
                          <div>
                            <p className="font-medium">{restaurant.name}</p>
                            <p className="text-sm text-muted-foreground">{restaurant.service_type}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm">{restaurant.owner?.name}</p>
                        <p className="text-xs text-muted-foreground">{restaurant.owner?.email}</p>
                      </td>
                      <td className="px-4 py-3 text-sm">{restaurant.cuisine}</td>
                      <td className="px-4 py-3 text-sm">{restaurant.order_count}</td>
                      <td className="px-4 py-3 text-sm font-medium">₹{restaurant.revenue?.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={restaurant.status || 'approved'} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate(`/restaurant/${restaurant.restaurant_id}`)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {restaurant.status !== 'suspended' ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-yellow-600"
                              onClick={() => handleRestaurantStatus(restaurant.restaurant_id, 'suspended')}
                            >
                              <Ban className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-green-600"
                              onClick={() => handleRestaurantStatus(restaurant.restaurant_id, 'approved')}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600"
                            onClick={() => handleDeleteRestaurant(restaurant.restaurant_id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredRestaurants.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  No restaurants found
                </div>
              )}
            </div>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="PLACED">Placed</SelectItem>
                  <SelectItem value="ACCEPTED">Accepted</SelectItem>
                  <SelectItem value="PREPARING">Preparing</SelectItem>
                  <SelectItem value="OUT_FOR_DELIVERY">Out for Delivery</SelectItem>
                  <SelectItem value="DELIVERED">Delivered</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={fetchDashboardData}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>

            <div className="bg-white rounded-xl shadow-card border border-border overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Order ID</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Restaurant</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Customer</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Amount</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Payment</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map(order => (
                    <tr key={order.order_id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-sm">{order.order_id?.slice(0, 8)}...</td>
                      <td className="px-4 py-3 text-sm">{order.restaurant_name}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm">{order.customer?.name}</p>
                        <p className="text-xs text-muted-foreground">{order.customer?.email}</p>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">₹{order.total_amount}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={order.payment_status} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          value={order.status}
                          onValueChange={(value) => handleOrderStatus(order.order_id, value)}
                        >
                          <SelectTrigger className="w-32 h-8">
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredOrders.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  No orders found
                </div>
              )}
            </div>
          </TabsContent>

          {/* Reservations Tab */}
          <TabsContent value="reservations" className="space-y-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search reservations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="PENDING_PAYMENT">Pending Payment</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                  <SelectItem value="SEATED">Seated</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  <SelectItem value="NO_SHOW">No Show</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={fetchDashboardData}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>

            <div className="bg-white rounded-xl shadow-card border border-border overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">ID</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Restaurant</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Customer</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Date & Time</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Party Size</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Amount</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReservations.map(reservation => (
                    <tr key={reservation.reservation_id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-sm">{reservation.reservation_id?.slice(0, 8)}...</td>
                      <td className="px-4 py-3 text-sm">{reservation.restaurant_name}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm">{reservation.customer?.name}</p>
                        <p className="text-xs text-muted-foreground">{reservation.customer?.email}</p>
                      </td>
                      <td className="px-4 py-3 text-sm">{reservation.date} at {reservation.time}</td>
                      <td className="px-4 py-3 text-sm">{reservation.party_size} people</td>
                      <td className="px-4 py-3 text-sm font-medium">₹{reservation.amount}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={reservation.status} />
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          value={reservation.status}
                          onValueChange={(value) => handleReservationStatus(reservation.reservation_id, value)}
                        >
                          <SelectTrigger className="w-36 h-8">
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredReservations.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  No reservations found
                </div>
              )}
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" onClick={fetchDashboardData}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>

            <div className="bg-white rounded-xl shadow-card border border-border overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Customer</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Phone</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Activity</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(userItem => (
                    <tr key={userItem.user_id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-primary font-medium">{userItem.name?.charAt(0).toUpperCase()}</span>
                          </div>
                          <p className="font-medium">{userItem.name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{userItem.email}</td>
                      <td className="px-4 py-3 text-sm">{userItem.phone || '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        <span>{userItem.order_count || 0} orders, {userItem.reservation_count || 0} reservations</span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={userItem.status || 'active'} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {userItem.status !== 'suspended' ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-yellow-600"
                              onClick={() => handleUserStatus(userItem.user_id, 'suspended')}
                              title="Suspend user"
                            >
                              <Ban className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-green-600"
                              onClick={() => handleUserStatus(userItem.user_id, 'active')}
                              title="Activate user"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600"
                            onClick={() => handleDeleteUser(userItem.user_id)}
                            title="Delete user"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredUsers.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  No customers found
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
