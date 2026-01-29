import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Package, Calendar, Plus, DollarSign, TrendingUp, Clock, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const RestaurantDashboard = () => {
  const navigate = useNavigate();
  const { token, isAuthenticated, isRestaurant, user } = useAuth();
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [orders, setOrders] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddMenuItem, setShowAddMenuItem] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', display_order: 0 });
  const [newMenuItem, setNewMenuItem] = useState({
    category_id: '',
    name: '',
    description: '',
    price: '',
    is_veg: true,
    image_url: ''
  });

  const foodImages = [
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400',
    'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400',
    'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400',
    'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
    'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=400',
    'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400'
  ];

  useEffect(() => {
    if (!isAuthenticated || !isRestaurant) {
      navigate('/restaurant-auth');
      return;
    }
    fetchRestaurants();
  }, []);

  useEffect(() => {
    if (selectedRestaurant) {
      fetchData();
      const interval = setInterval(fetchData, 10000);
      return () => clearInterval(interval);
    }
  }, [selectedRestaurant]);

  const fetchRestaurants = async () => {
    try {
      const response = await axios.get(`${API}/restaurants`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const myRestaurants = response.data.filter(r => r.owner_id === user.user_id);
      setRestaurants(myRestaurants);
      if (myRestaurants.length > 0) {
        setSelectedRestaurant(myRestaurants[0]);
      }
    } catch (error) {
      console.error('Error fetching restaurants:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      const [ordersRes, reservationsRes, menuRes] = await Promise.all([
        axios.get(`${API}/restaurant/orders`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/restaurant/reservations`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/restaurants/${selectedRestaurant.restaurant_id}/menu`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setOrders(ordersRes.data.filter(o => o.restaurant_id === selectedRestaurant.restaurant_id));
      setReservations(reservationsRes.data.filter(r => r.restaurant_id === selectedRestaurant.restaurant_id));
      setCategories(menuRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
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

  const markOrderAsPrepared = async (orderId) => {
    await updateOrderStatus(orderId, 'OUT_FOR_DELIVERY');
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

  const handleAddCategory = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `${API}/restaurants/${selectedRestaurant.restaurant_id}/categories`,
        newCategory,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      toast.success('Category added!');
      setShowAddCategory(false);
      setNewCategory({ name: '', display_order: 0 });
      fetchData();
    } catch (error) {
      toast.error('Failed to add category');
    }
  };

  const handleAddMenuItem = async (e) => {
    e.preventDefault();
    try {
      const imageUrl = newMenuItem.image_url || foodImages[Math.floor(Math.random() * foodImages.length)];
      
      await axios.post(
        `${API}/restaurants/${selectedRestaurant.restaurant_id}/items`,
        {
          ...newMenuItem,
          price: parseFloat(newMenuItem.price),
          image_url: imageUrl
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      toast.success('Menu item added!');
      setShowAddMenuItem(false);
      setNewMenuItem({
        category_id: '',
        name: '',
        description: '',
        price: '',
        is_veg: true,
        image_url: ''
      });
      fetchData();
    } catch (error) {
      toast.error('Failed to add menu item');
    }
  };

  const getOrderStats = () => {
    const total = orders.reduce((sum, order) => sum + order.total_amount, 0);
    const pending = orders.filter(o => ['PLACED', 'ACCEPTED', 'PREPARING'].includes(o.status)).length;
    return { total, pending, count: orders.length };
  };

  const stats = getOrderStats();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (restaurants.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center" className="bg-background">
        <div className="text-center">
          <h2 className="font-heading text-3xl font-bold mb-4">No Restaurant Found</h2>
          <p className="text-muted-foreground mb-6">Please create a restaurant profile first</p>
          <Button onClick={() => navigate('/restaurant-auth')}>Create Restaurant</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" className="bg-background">
      <header className="bg-white border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/')} data-testid="back-button">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Home
          </Button>
          <h1 className="font-heading text-2xl font-bold" data-testid="dashboard-title">
            {selectedRestaurant?.name}
          </h1>
          <div></div>
        </div>
      </header>

      <div className="container mx-auto px-4 md:px-8 py-12">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-card border border-border">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">₹{stats.total.toFixed(2)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-card border border-border">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-warning/10 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Orders</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-card border border-border">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{stats.count}</p>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="orders" className="space-y-8">
          <TabsList className="grid w-full md:w-[600px] grid-cols-3">
            <TabsTrigger value="orders" data-testid="orders-tab">
              <Package className="w-4 h-4 mr-2" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="reservations" data-testid="reservations-tab">
              <Calendar className="w-4 h-4 mr-2" />
              Reservations
            </TabsTrigger>
            <TabsTrigger value="menu" data-testid="menu-tab">
              <Plus className="w-4 h-4 mr-2" />
              Menu Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <div className="space-y-4">
              <h2 className="font-heading text-3xl font-semibold">Current Orders ({orders.length})</h2>
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
                          <p className="text-sm text-muted-foreground mt-1">
                            {new Date(order.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Select
                            value={order.status}
                            onValueChange={(status) => updateOrderStatus(order.order_id, status)}
                          >
                            <SelectTrigger className="w-48" data-testid={`order-status-${order.order_id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PLACED">Order Placed</SelectItem>
                              <SelectItem value="ACCEPTED">Order Accepted</SelectItem>
                              <SelectItem value="PREPARING">Order Preparation</SelectItem>
                              <SelectItem value="OUT_FOR_DELIVERY">On the way</SelectItem>
                              <SelectItem value="DELIVERED">Delivered</SelectItem>
                              <SelectItem value="CANCELLED">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                          {order.status === 'PREPARING' && (
                            <Button
                              size="sm"
                              onClick={() => markOrderAsPrepared(order.order_id)}
                              data-testid={`mark-prepared-${order.order_id}`}
                            >
                              Mark as Prepared
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Address: {order.delivery_address}</p>
                        <p>Phone: {order.delivery_phone}</p>
                        <p>Payment: {order.payment_method} ({order.payment_status})</p>
                        <p>Items: {order.items?.length || 0}</p>
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

          <TabsContent value="menu">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-3xl font-semibold">Menu Management</h2>
                <div className="flex gap-2">
                  <Dialog open={showAddCategory} onOpenChange={setShowAddCategory}>
                    <DialogTrigger asChild>
                      <Button variant="outline" data-testid="add-category-button">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Category
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Menu Category</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleAddCategory} className="space-y-4">
                        <div>
                          <Label htmlFor="category_name">Category Name</Label>
                          <Input
                            id="category_name"
                            value={newCategory.name}
                            onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                            required
                          />
                        </div>
                        <Button type="submit" className="w-full">Add Category</Button>
                      </form>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={showAddMenuItem} onOpenChange={setShowAddMenuItem}>
                    <DialogTrigger asChild>
                      <Button data-testid="add-menu-item-button">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Menu Item
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Menu Item</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleAddMenuItem} className="space-y-4">
                        <div>
                          <Label htmlFor="category">Category</Label>
                          <select
                            id="category"
                            value={newMenuItem.category_id}
                            onChange={(e) => setNewMenuItem({ ...newMenuItem, category_id: e.target.value })}
                            className="w-full h-10 px-3 rounded-lg border border-input bg-input/50"
                            required
                          >
                            <option value="">Select Category</option>
                            {categories.map((cat) => (
                              <option key={cat.category_id} value={cat.category_id}>{cat.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label htmlFor="item_name">Item Name</Label>
                          <Input
                            id="item_name"
                            value={newMenuItem.name}
                            onChange={(e) => setNewMenuItem({ ...newMenuItem, name: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Input
                            id="description"
                            value={newMenuItem.description}
                            onChange={(e) => setNewMenuItem({ ...newMenuItem, description: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="price">Price (₹)</Label>
                          <Input
                            id="price"
                            type="number"
                            step="0.01"
                            value={newMenuItem.price}
                            onChange={(e) => setNewMenuItem({ ...newMenuItem, price: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="image_url">Image URL (Optional)</Label>
                          <Input
                            id="image_url"
                            type="url"
                            value={newMenuItem.image_url}
                            onChange={(e) => setNewMenuItem({ ...newMenuItem, image_url: e.target.value })}
                            placeholder="Leave blank for random food image"
                          />
                          <p className="text-xs text-muted-foreground mt-1">If left blank, a random food image will be used</p>
                        </div>
                        <div>
                          <Label>Food Type</Label>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2">
                              <input
                                type="radio"
                                checked={newMenuItem.is_veg}
                                onChange={() => setNewMenuItem({ ...newMenuItem, is_veg: true })}
                              />
                              <span>Veg</span>
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="radio"
                                checked={!newMenuItem.is_veg}
                                onChange={() => setNewMenuItem({ ...newMenuItem, is_veg: false })}
                              />
                              <span>Non-Veg</span>
                            </label>
                          </div>
                        </div>
                        <Button type="submit" className="w-full">Add Item</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {categories.length === 0 ? (
                <p className="text-muted-foreground">No menu categories yet. Add one to get started!</p>
              ) : (
                <div className="space-y-6">
                  {categories.map((category) => (
                    <div key={category.category_id} className="bg-white p-6 rounded-xl shadow-card border border-border">
                      <h3 className="font-heading text-2xl font-semibold mb-4">{category.name}</h3>
                      {category.items && category.items.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {category.items.map((item) => (
                            <div key={item.item_id} className="flex gap-4 p-4 border border-border rounded-lg">
                              <img
                                src={item.image_url}
                                alt={item.name}
                                className="w-20 h-20 object-cover rounded-lg"
                              />
                              <div className="flex-1">
                                <div className="flex items-start justify-between mb-1">
                                  <h4 className="font-semibold">{item.name}</h4>
                                  <span className={`text-xs px-2 py-1 rounded ${item.is_veg ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {item.is_veg ? 'Veg' : 'Non-Veg'}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                                <p className="font-bold text-primary">₹{item.price}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No items in this category yet. Use "Add Menu Item" to add items.</p>
                      )}
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
