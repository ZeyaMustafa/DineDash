import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Search, ShoppingCart, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ServiceBadge = ({ serviceType }) => {
  const badges = {
    delivery: { text: 'DELIVERS', className: 'bg-blue-100 text-blue-700' },
    reservations: { text: 'RESERVATIONS', className: 'bg-amber-100 text-amber-700' },
    both: { text: 'BOTH', className: 'bg-purple-100 text-purple-700' }
  };
  
  const badge = badges[serviceType] || badges.both;
  
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${badge.className}`} data-testid={`service-badge-${serviceType}`}>
      {badge.text}
    </span>
  );
};

const RestaurantCard = ({ restaurant }) => {
  const navigate = useNavigate();
  
  return (
    <motion.div
      data-testid={`restaurant-card-${restaurant.restaurant_id}`}
      whileHover={{ y: -8 }}
      className="group relative overflow-hidden rounded-2xl bg-white border border-border/50 hover:border-primary/50 cursor-pointer shadow-card hover:shadow-hover"
      onClick={() => navigate(`/restaurant/${restaurant.restaurant_id}`)}
      style={{ transition: 'all 0.3s ease' }}
    >
      <div className="aspect-[4/3] overflow-hidden">
        <img
          src={restaurant.image_url}
          alt={restaurant.name}
          className="w-full h-full object-cover group-hover:scale-110"
          style={{ transition: 'transform 0.5s ease' }}
        />
      </div>
      <div className="p-6 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <h3 className="font-heading text-2xl font-semibold text-foreground">{restaurant.name}</h3>
          <ServiceBadge serviceType={restaurant.service_type} />
        </div>
        <p className="text-sm text-muted-foreground uppercase tracking-wider">{restaurant.cuisine}</p>
        {(restaurant.is_veg || restaurant.is_non_veg) && (
          <div className="flex gap-2">
            {restaurant.is_veg && (
              <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">Veg</span>
            )}
            {restaurant.is_non_veg && (
              <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">Non-Veg</span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

const HomePage = () => {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated, isCustomer, isRestaurant } = useAuth();
  const { getTotalItems } = useCart();
  const [restaurants, setRestaurants] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dietFilter, setDietFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRestaurants();
  }, [searchQuery, dietFilter]);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchQuery) params.search = searchQuery;
      if (dietFilter !== 'all') params.diet = dietFilter;
      
      const response = await axios.get(`${API}/restaurants`, { params });
      setRestaurants(response.data);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-black/5">
        <div className="container mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="font-heading text-3xl font-bold text-primary" data-testid="app-title">DineDash</h1>
            </div>
            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <>
                  {isCustomer && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/cart')}
                      className="relative"
                      data-testid="cart-button"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      {getTotalItems() > 0 && (
                        <span className="absolute -top-2 -right-2 bg-primary text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                          {getTotalItems()}
                        </span>
                      )}
                    </Button>
                  )}
                  {isRestaurant && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/restaurant-dashboard')}
                      data-testid="dashboard-button"
                    >
                      Dashboard
                    </Button>
                  )}
                  <span className="text-sm text-muted-foreground" data-testid="user-name">Hi, {user?.name}</span>
                  <Button variant="ghost" size="sm" onClick={logout} data-testid="logout-button">
                    <LogOut className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={() => navigate('/customer-auth')} data-testid="customer-login-button">
                    Customer Login
                  </Button>
                  <Button size="sm" onClick={() => navigate('/restaurant-auth')} data-testid="restaurant-login-button">
                    Restaurant Login
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="relative h-[60vh] flex items-center justify-center bg-foreground text-white overflow-hidden">
        <div className="absolute inset-0 bg-black/40 z-10"></div>
        <img
          src="https://images.unsplash.com/photo-1687945512099-400cbe94460c?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzl8MHwxfHNlYXJjaHwyfHxtb2Rlcm4lMjByZXN0YXVyYW50JTIwaW50ZXJpb3IlMjBkZXNpZ258ZW58MHx8fHwxNzY5NjkyNzI5fDA&ixlib=rb-4.1.0&q=85"
          alt="Hero"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="relative z-20 text-center space-y-8 px-4">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-heading text-5xl md:text-6xl font-bold tracking-tight leading-tight"
          >
            Order. Reserve. Enjoy.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg leading-relaxed max-w-2xl mx-auto"
          >
            Discover the best restaurants for delivery and dine-in reservations
          </motion.p>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 py-12">
        <div className="mb-12 space-y-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search restaurants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 bg-input/50 border-transparent focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg"
                data-testid="search-input"
              />
            </div>
            <Select value={dietFilter} onValueChange={setDietFilter}>
              <SelectTrigger className="w-full md:w-48 h-12" data-testid="diet-filter">
                <SelectValue placeholder="Diet Preference" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="veg">Veg Only</SelectItem>
                <SelectItem value="non_veg">Non-Veg</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading restaurants...</p>
          </div>
        ) : restaurants.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No restaurants found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8" data-testid="restaurants-grid">
            {restaurants.map((restaurant) => (
              <RestaurantCard key={restaurant.restaurant_id} restaurant={restaurant} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;