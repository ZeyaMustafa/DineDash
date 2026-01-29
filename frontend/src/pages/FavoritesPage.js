import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Heart, Star, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

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
    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${badge.className}`}>
      {badge.text}
    </span>
  );
};

const FavoritesPage = () => {
  const navigate = useNavigate();
  const { token, isAuthenticated, isCustomer } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !isCustomer) {
      navigate('/customer-auth');
      return;
    }
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      const response = await axios.get(`${API}/favorites`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFavorites(response.data);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      toast.error('Failed to load favorites');
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (restaurantId) => {
    try {
      await axios.delete(`${API}/favorites/${restaurantId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFavorites(favorites.filter(r => r.restaurant_id !== restaurantId));
      toast.success('Removed from favorites');
    } catch (error) {
      toast.error('Failed to remove favorite');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 md:px-8 py-4">
          <Button variant="ghost" onClick={() => navigate('/')} data-testid="back-button">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 md:px-8 py-12">
        <div className="mb-8">
          <h1 className="font-heading text-5xl font-bold mb-2 flex items-center gap-3">
            <Heart className="w-10 h-10 fill-red-500 text-red-500" />
            My Favorites
          </h1>
          <p className="text-muted-foreground">{favorites.length} saved restaurants</p>
        </div>

        {favorites.length === 0 ? (
          <div className="text-center py-20">
            <Heart className="w-24 h-24 mx-auto mb-6 text-muted-foreground" />
            <h3 className="font-heading text-2xl font-semibold mb-2">No favorites yet</h3>
            <p className="text-muted-foreground mb-6">
              Start adding restaurants to your favorites to see them here
            </p>
            <Button onClick={() => navigate('/')}>Browse Restaurants</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {favorites.map((restaurant) => (
              <motion.div
                key={restaurant.restaurant_id}
                whileHover={{ y: -8 }}
                className="group relative overflow-hidden rounded-2xl bg-card border border-border hover:border-primary/50 cursor-pointer shadow-card hover:shadow-hover"
                style={{ transition: 'all 0.3s ease' }}
                data-testid={`favorite-restaurant-${restaurant.restaurant_id}`}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFavorite(restaurant.restaurant_id);
                  }}
                  className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center hover:bg-white transition-colors"
                  data-testid={`remove-favorite-${restaurant.restaurant_id}`}
                >
                  <Heart className="w-5 h-5 fill-red-500 text-red-500" />
                </button>
                
                <div
                  className="aspect-[4/3] overflow-hidden"
                  onClick={() => navigate(`/restaurant/${restaurant.restaurant_id}`)}
                >
                  <img
                    src={restaurant.image_url}
                    alt={restaurant.name}
                    className="w-full h-full object-cover group-hover:scale-110"
                    style={{ transition: 'transform 0.5s ease' }}
                  />
                </div>
                
                <div
                  className="p-6 space-y-3"
                  onClick={() => navigate(`/restaurant/${restaurant.restaurant_id}`)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-heading text-2xl font-semibold text-foreground">
                      {restaurant.name}
                    </h3>
                    <ServiceBadge serviceType={restaurant.service_type} />
                  </div>
                  <p className="text-sm text-muted-foreground uppercase tracking-wider">
                    {restaurant.cuisine}
                  </p>
                  
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
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FavoritesPage;
