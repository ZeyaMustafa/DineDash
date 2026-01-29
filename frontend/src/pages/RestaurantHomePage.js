import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Plus, Package, Calendar, DollarSign, TrendingUp, Clock, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';
import LanguageToggle from '@/components/LanguageToggle';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const RestaurantHomePage = () => {
  const navigate = useNavigate();
  const { user, logout, token } = useAuth();
  const { t } = useTranslation();
  const [restaurant, setRestaurant] = useState(null);
  const [stats, setStats] = useState({ totalRevenue: 0, pendingOrders: 0, totalOrders: 0 });
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRestaurantData();
  }, []);

  const fetchRestaurantData = async () => {
    try {
      // Get all restaurants for this owner
      const restaurantsRes = await axios.get(`${API}/restaurants`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const myRestaurant = restaurantsRes.data.find(r => r.owner_id === user.user_id);
      
      if (!myRestaurant) {
        setLoading(false);
        return;
      }
      
      setRestaurant(myRestaurant);
      
      // Fetch menu
      const menuRes = await axios.get(`${API}/restaurants/${myRestaurant.restaurant_id}/menu`);
      setMenu(menuRes.data);
      
      // Fetch orders for stats
      const ordersRes = await axios.get(`${API}/restaurant/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const myOrders = ordersRes.data.filter(o => o.restaurant_id === myRestaurant.restaurant_id);
      const totalRevenue = myOrders.reduce((sum, order) => sum + order.total_amount, 0);
      const pendingOrders = myOrders.filter(o => ['PLACED', 'ACCEPTED', 'PREPARING'].includes(o.status)).length;
      
      setStats({
        totalRevenue,
        pendingOrders,
        totalOrders: myOrders.length
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="font-heading text-3xl font-bold mb-4">No Restaurant Found</h2>
          <p className="text-muted-foreground mb-6">Please create your restaurant profile</p>
          <Button onClick={() => navigate('/restaurant-auth')}>Create Restaurant</Button>
        </div>
      </div>
    );
  }

  const totalItems = menu.reduce((sum, cat) => sum + (cat.items?.length || 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-heading text-3xl font-bold text-primary" data-testid="restaurant-title">
                {restaurant.name}
              </h1>
              <p className="text-sm text-muted-foreground">{restaurant.cuisine}</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Hi, {user?.name}</span>
              <Button variant="ghost" size="sm" onClick={logout} data-testid="logout-button">
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 md:px-8 py-12">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-card p-6 rounded-xl shadow-card border border-border">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">₹{stats.totalRevenue.toFixed(2)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-card p-6 rounded-xl shadow-card border border-border">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-warning/10 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Orders</p>
                <p className="text-2xl font-bold">{stats.pendingOrders}</p>
              </div>
            </div>
          </div>

          <div className="bg-card p-6 rounded-xl shadow-card border border-border">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{stats.totalOrders}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <button
            onClick={() => navigate('/restaurant-dashboard?tab=orders')}
            className="bg-primary text-white p-8 rounded-xl shadow-card hover:shadow-hover transition-all group"
            data-testid="manage-orders-button"
          >
            <Package className="w-12 h-12 mb-4 mx-auto group-hover:scale-110 transition-transform" />
            <h3 className="font-heading text-2xl font-semibold mb-2">Manage Orders</h3>
            <p className="text-primary-foreground/80">View and update order status</p>
          </button>

          <button
            onClick={() => navigate('/restaurant-dashboard?tab=menu')}
            className="bg-secondary text-white p-8 rounded-xl shadow-card hover:shadow-hover transition-all group"
            data-testid="manage-menu-button"
          >
            <Plus className="w-12 h-12 mb-4 mx-auto group-hover:scale-110 transition-transform" />
            <h3 className="font-heading text-2xl font-semibold mb-2">Manage Menu</h3>
            <p className="text-secondary-foreground/80">Add or edit menu items</p>
          </button>

          <button
            onClick={() => navigate('/restaurant-dashboard?tab=reservations')}
            className="bg-accent text-white p-8 rounded-xl shadow-card hover:shadow-hover transition-all group"
            data-testid="manage-reservations-button"
          >
            <Calendar className="w-12 h-12 mb-4 mx-auto group-hover:scale-110 transition-transform" />
            <h3 className="font-heading text-2xl font-semibold mb-2">Reservations</h3>
            <p className="text-accent-foreground/80">Manage table bookings</p>
          </button>
        </div>

        {/* Menu Preview */}
        <div className="bg-card p-8 rounded-xl shadow-card border border-border">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-heading text-3xl font-semibold">Your Menu</h2>
              <p className="text-muted-foreground">{menu.length} categories • {totalItems} items</p>
            </div>
            <Button onClick={() => navigate('/restaurant-dashboard')} data-testid="edit-menu-button">
              <Edit className="w-4 h-4 mr-2" />
              Edit Menu
            </Button>
          </div>

          {menu.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No menu items yet</p>
              <Button onClick={() => navigate('/restaurant-dashboard')}>Add Menu Items</Button>
            </div>
          ) : (
            <div className="space-y-8">
              {menu.map((category) => (
                <div key={category.category_id}>
                  <h3 className="font-heading text-xl font-semibold mb-4 border-b border-border pb-2">
                    {category.name}
                  </h3>
                  {category.items && category.items.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {category.items.map((item) => (
                        <div key={item.item_id} className="flex gap-3 p-3 bg-background rounded-lg border border-border">
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold truncate">{item.name}</h4>
                            <p className="text-sm text-muted-foreground line-clamp-1">{item.description}</p>
                            <p className="font-bold text-primary">₹{item.price}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No items in this category</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RestaurantHomePage;
