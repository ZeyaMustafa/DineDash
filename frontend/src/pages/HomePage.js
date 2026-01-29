import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Search, ShoppingCart, User, LogOut, Star, Clock, MapPin, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useTranslation } from 'react-i18next';
import LanguageToggle from '@/components/LanguageToggle';

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

const RestaurantCardSkeleton = () => (
  <div className="bg-white rounded-2xl border border-border overflow-hidden">
    <Skeleton className="aspect-[4/3] w-full" />
    <div className="p-6 space-y-3">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-16" />
      </div>
    </div>
  </div>
);

const RestaurantCard = ({ restaurant, isFavorite, onToggleFavorite }) => {
  const navigate = useNavigate();
  const { isAuthenticated, isCustomer } = useAuth();
  
  return (
    <motion.div
      data-testid={`restaurant-card-${restaurant.restaurant_id}`}
      whileHover={{ y: -8 }}
      className="group relative overflow-hidden rounded-2xl bg-white border border-border/50 hover:border-primary/50 cursor-pointer shadow-card hover:shadow-hover"
      onClick={() => navigate(`/restaurant/${restaurant.restaurant_id}`)}
      style={{ transition: 'all 0.3s ease' }}
    >
      {isAuthenticated && isCustomer && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(restaurant.restaurant_id);
          }}
          className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center hover:bg-white transition-colors"
          data-testid={`favorite-${restaurant.restaurant_id}`}
        >
          <Heart className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
        </button>
      )}
      
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
        
        <div className="flex items-center gap-4 text-sm">
          {restaurant.average_rating > 0 && (
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold">{restaurant.average_rating}</span>
              <span className="text-muted-foreground">({restaurant.total_reviews})</span>
            </div>
          )}
          {restaurant.service_type !== 'reservations' && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>30-45 min</span>
            </div>
          )}
        </div>
        
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
  const { user, logout, isAuthenticated, isCustomer, isRestaurant, token } = useAuth();
  const { getTotalItems } = useCart();
  const { t } = useTranslation();
  const [restaurants, setRestaurants] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dietFilter, setDietFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [cuisineFilter, setCuisineFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRestaurants();
    if (isAuthenticated && isCustomer) {
      fetchFavorites();
    }
  }, [searchQuery, dietFilter, serviceFilter, cuisineFilter]);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchQuery) params.search = searchQuery;
      if (dietFilter !== 'all') params.diet = dietFilter;
      if (serviceFilter !== 'all') params.service_type = serviceFilter;
      if (cuisineFilter !== 'all') params.cuisine = cuisineFilter;
      
      const response = await axios.get(`${API}/restaurants`, { params });
      setRestaurants(response.data);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFavorites = async () => {
    try {
      const response = await axios.get(`${API}/favorites`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFavorites(response.data.map(r => r.restaurant_id));
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

  const toggleFavorite = async (restaurantId) => {
    const isFavorite = favorites.includes(restaurantId);
    try {
      if (isFavorite) {
        await axios.delete(`${API}/favorites/${restaurantId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFavorites(favorites.filter(id => id !== restaurantId));
        toast.success(t('messages.favoriteRemoved'));
      } else {
        await axios.post(`${API}/favorites/${restaurantId}`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFavorites([...favorites, restaurantId]);
        toast.success(t('messages.favoriteAdded'));
      }
    } catch (error) {
      toast.error(t('messages.failedToUpdate'));
    }
  };

  const uniqueCuisines = [...new Set(restaurants.map(r => r.cuisine))];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="font-heading text-3xl font-bold text-primary" data-testid="app-title">{t('common.appName')}</h1>
            </div>
            <div className="flex items-center gap-4">
              <LanguageToggle />
              {isAuthenticated ? (
                <>
                  {isCustomer && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/favorites')}
                        data-testid="favorites-button"
                      >
                        <Heart className="w-4 h-4 mr-2" />
                        {t('navbar.favorites')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate('/cart')}
                        className="relative"
                        data-testid="cart-button"
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        {t('navbar.cart')}
                        {getTotalItems() > 0 && (
                          <span className="ml-2 px-2 py-0.5 bg-primary text-white text-xs rounded-full">
                            {getTotalItems()}
                          </span>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/customer-profile')}
                        data-testid="profile-button"
                      >
                        <User className="w-4 h-4 mr-2" />
                        {t('navbar.profile', { name: user?.name })}
                      </Button>
                    </>
                  )}
                  {isRestaurant && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => navigate('/restaurant-dashboard')}
                        data-testid="dashboard-button"
                        className="bg-primary text-primary-foreground"
                      >
                        {t('navbar.dashboard')}
                      </Button>
                      <span className="text-sm text-muted-foreground">{t('navbar.profile', { name: user?.name })}</span>
                    </>
                  )}
                  <Button variant="ghost" size="sm" onClick={logout} data-testid="logout-button">
                    <LogOut className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={() => navigate('/customer-auth')} data-testid="customer-login-button">
                    {t('navbar.customerLogin')}
                  </Button>
                  <Button size="sm" onClick={() => navigate('/restaurant-auth')} data-testid="restaurant-login-button">
                    {t('navbar.restaurantLogin')}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="relative h-[60vh] flex items-center justify-center bg-foreground text-white overflow-hidden" style={{ backgroundColor: '#2B1C10' }}>
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
            {t('home.hero.title')}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg leading-relaxed max-w-2xl mx-auto"
          >
            {t('home.hero.subtitle')}
          </motion.p>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 py-12">
        <div className="mb-8 space-y-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder={t('home.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 bg-input/50 border-transparent focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg"
                data-testid="search-input"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setServiceFilter('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                serviceFilter === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
              data-testid="filter-all"
            >
              {t('home.filters.all')}
            </button>
            <button
              onClick={() => setServiceFilter('delivery')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                serviceFilter === 'delivery'
                  ? 'bg-blue-500 text-white'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
              data-testid="filter-delivery"
            >
              {t('home.filters.delivery')}
            </button>
            <button
              onClick={() => setServiceFilter('reservations')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                serviceFilter === 'reservations'
                  ? 'bg-amber-500 text-white'
                  : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
              }`}
              data-testid="filter-reservations"
            >
              {t('home.filters.reservations')}
            </button>
            
            <div className="h-8 w-px bg-border mx-2"></div>
            
            <button
              onClick={() => setDietFilter(dietFilter === 'veg' ? 'all' : 'veg')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                dietFilter === 'veg'
                  ? 'bg-green-500 text-white'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
              data-testid="filter-veg"
            >
              {t('home.filters.veg')}
            </button>
            <button
              onClick={() => setDietFilter(dietFilter === 'non_veg' ? 'all' : 'non_veg')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                dietFilter === 'non_veg'
                  ? 'bg-red-500 text-white'
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
              }`}
              data-testid="filter-non-veg"
            >
              {t('home.filters.nonVeg')}
            </button>

            {uniqueCuisines.length > 0 && (
              <>
                <div className="h-8 w-px bg-border mx-2"></div>
                <Select value={cuisineFilter} onValueChange={setCuisineFilter}>
                  <SelectTrigger className="w-48 h-10 rounded-full" data-testid="cuisine-filter">
                    <SelectValue placeholder={t('home.filters.allCuisines')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('home.filters.allCuisines')}</SelectItem>
                    {uniqueCuisines.map((cuisine) => (
                      <SelectItem key={cuisine} value={cuisine}>{cuisine}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8" data-testid="restaurants-loading">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <RestaurantCardSkeleton key={i} />
            ))}
          </div>
        ) : restaurants.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="font-heading text-2xl font-semibold mb-2">{t('home.noRestaurants')}</h3>
            <p className="text-muted-foreground mb-6">{t('home.tryAdjust')}</p>
            <Button onClick={() => {
              setSearchQuery('');
              setDietFilter('all');
              setServiceFilter('all');
              setCuisineFilter('all');
            }}>
              {t('home.clearFilters')}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8" data-testid="restaurants-grid">
            {restaurants.map((restaurant) => (
              <RestaurantCard
                key={restaurant.restaurant_id}
                restaurant={restaurant}
                isFavorite={favorites.includes(restaurant.restaurant_id)}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
