import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Minus, Calendar, Clock, Users, ShoppingCart, User, LogOut, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useTranslation } from 'react-i18next';
import LanguageToggle from '@/components/LanguageToggle';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const RestaurantPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token, logout, isAuthenticated, isCustomer, isRestaurant } = useAuth();
  const { addToCart, cart, getTotalItems } = useCart();
  const { t } = useTranslation();
  const [restaurant, setRestaurant] = useState(null);
  const [menu, setMenu] = useState([]);
  const [dietFilter, setDietFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [reservationData, setReservationData] = useState({
    date: '',
    time: '',
    party_size: 2
  });
  const [availability, setAvailability] = useState(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  useEffect(() => {
    fetchRestaurantData();
  }, [id]);

  useEffect(() => {
    if (restaurant?.service_type && (restaurant.service_type === 'delivery' || restaurant.service_type === 'both')) {
      fetchMenu();
    }
  }, [restaurant, dietFilter]);

  const fetchRestaurantData = async () => {
    try {
      const response = await axios.get(`${API}/restaurants/${id}`);
      setRestaurant(response.data);
    } catch (error) {
      console.error('Error fetching restaurant:', error);
      toast.error('Restaurant not found');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchMenu = async () => {
    try {
      const params = {};
      if (dietFilter !== 'all') params.diet = dietFilter;
      const response = await axios.get(`${API}/restaurants/${id}/menu`, { params });
      setMenu(response.data);
    } catch (error) {
      console.error('Error fetching menu:', error);
    }
  };

  const handleAddToCart = (item) => {
    if (!isAuthenticated) {
      toast.error('Please login to add items to cart');
      navigate('/customer-auth');
      return;
    }
    addToCart(item, restaurant);
    toast.success(`${item.name} added to cart!`);
  };

  const getItemQuantity = (itemId) => {
    const cartItem = cart.find(item => item.item_id === itemId);
    return cartItem ? cartItem.quantity : 0;
  };

  const checkAvailability = async () => {
    if (!reservationData.date || !reservationData.time) {
      toast.error('Please select date and time');
      return;
    }

    setCheckingAvailability(true);
    try {
      const response = await axios.get(`${API}/restaurants/${id}/availability`, {
        params: {
          date: reservationData.date,
          time: reservationData.time
        }
      });
      setAvailability(response.data);
      if (response.data.available) {
        toast.success(`${response.data.available_seats} seats available!`);
      } else {
        toast.error('No seats available for this slot');
      }
    } catch (error) {
      toast.error('Error checking availability');
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleReservation = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to make a reservation');
      navigate('/customer-auth');
      return;
    }

    if (!isCustomer) {
      toast.error('Only customers can make reservations');
      return;
    }

    if (!availability || !availability.available) {
      toast.error('Please check availability first');
      return;
    }

    try {
      const response = await axios.post(
        `${API}/reservations`,
        {
          restaurant_id: id,
          date: reservationData.date,
          time: reservationData.time,
          party_size: reservationData.party_size
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const reservationId = response.data.reservation_id;
      const amount = response.data.amount;

      const paymentResponse = await axios.post(
        `${API}/payments/checkout`,
        {
          payment_type: 'reservation',
          reference_id: reservationId,
          origin_url: window.location.origin
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      window.location.href = paymentResponse.data.url;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create reservation');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!restaurant) return null;

  const showDelivery = restaurant.service_type === 'delivery' || restaurant.service_type === 'both';
  const showReservations = restaurant.service_type === 'reservations' || restaurant.service_type === 'both';

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/')} data-testid="back-button">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('common.back')}
              </Button>
              <h1 className="font-heading text-2xl font-bold text-primary">{t('common.appName')}</h1>
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

      <div className="relative h-96 overflow-hidden">
        <img
          src={restaurant.image_url}
          alt={restaurant.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
          <h1 className="font-heading text-5xl md:text-6xl font-bold mb-4" data-testid="restaurant-name">
            {restaurant.name}
          </h1>
          <p className="text-lg mb-2">{restaurant.description}</p>
          <div className="flex flex-wrap gap-4 text-sm">
            <span>{restaurant.cuisine}</span>
            <span>•</span>
            <span>{restaurant.hours}</span>
            <span>•</span>
            <span>{restaurant.address}</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 py-12">
        {(showDelivery && showReservations) ? (
          <Tabs defaultValue="delivery" className="space-y-8">
            <TabsList className="grid w-full md:w-96 grid-cols-2">
              <TabsTrigger value="delivery" data-testid="delivery-tab">{t('restaurant.page.orderDelivery')}</TabsTrigger>
              <TabsTrigger value="reservation" data-testid="reservation-tab">{t('restaurant.page.reserveSeats')}</TabsTrigger>
            </TabsList>

            {showDelivery && (
              <TabsContent value="delivery" className="space-y-8">
                <div className="flex justify-between items-center">
                  <h2 className="font-heading text-3xl font-semibold">{t('restaurant.page.menu')}</h2>
                  <Select value={dietFilter} onValueChange={setDietFilter}>
                    <SelectTrigger className="w-48" data-testid="menu-diet-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('home.filters.all')}</SelectItem>
                      <SelectItem value="veg">{t('home.filters.veg')}</SelectItem>
                      <SelectItem value="non_veg">{t('home.filters.nonVeg')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {menu.map((category) => (
                  <div key={category.category_id} className="space-y-6" data-testid={`menu-category-${category.category_id}`}>
                    <h3 className="font-heading text-2xl font-semibold border-b border-border pb-2">
                      {category.name}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {category.items?.map((item) => (
                        <motion.div
                          key={item.item_id}
                          whileHover={{ scale: 1.02 }}
                          className="bg-white p-6 rounded-xl border border-border shadow-card"
                          data-testid={`menu-item-${item.item_id}`}
                        >
                          <div className="flex gap-4">
                            {item.image_url && (
                              <img
                                src={item.image_url}
                                alt={item.name}
                                className="w-24 h-24 object-cover rounded-lg"
                              />
                            )}
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-semibold text-lg">{item.name}</h4>
                                {item.is_veg ? (
                                  <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">{t('restaurant.details.veg')}</span>
                                ) : (
                                  <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">{t('restaurant.details.nonVeg')}</span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-3">{item.description}</p>
                              <div className="flex items-center justify-between">
                                <span className="text-primary font-bold text-lg">₹{item.price}</span>
                                {getItemQuantity(item.item_id) > 0 ? (
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">
                                      {t('restaurant.page.inCart', { quantity: getItemQuantity(item.item_id) })}
                                    </span>
                                    <Button
                                      size="sm"
                                      onClick={() => handleAddToCart(item)}
                                      data-testid={`add-more-${item.item_id}`}
                                    >
                                      <Plus className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    size="sm"
                                    onClick={() => handleAddToCart(item)}
                                    data-testid={`add-to-cart-${item.item_id}`}
                                  >
                                    {t('restaurant.page.addToCart')}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
              </TabsContent>
            )}

            {showReservations && (
              <TabsContent value="reservation">
                <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-card border border-border">
                  <h2 className="font-heading text-3xl font-semibold mb-6">{t('restaurant.page.bookTable')}</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="date">{t('restaurant.page.date')}</Label>
                      <Input
                        id="date"
                        type="date"
                        value={reservationData.date}
                        onChange={(e) => setReservationData({ ...reservationData, date: e.target.value })}
                        min={new Date().toISOString().split('T')[0]}
                        data-testid="reservation-date"
                      />
                    </div>

                    <div>
                      <Label htmlFor="time">{t('restaurant.page.time')}</Label>
                      <Input
                        id="time"
                        type="time"
                        value={reservationData.time}
                        onChange={(e) => setReservationData({ ...reservationData, time: e.target.value })}
                        data-testid="reservation-time"
                      />
                    </div>

                    <div>
                      <Label htmlFor="party_size">{t('restaurant.page.partySize')}</Label>
                      <Select
                        value={String(reservationData.party_size)}
                        onValueChange={(v) => setReservationData({ ...reservationData, party_size: parseInt(v) })}
                      >
                        <SelectTrigger data-testid="reservation-party-size">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                            <SelectItem key={num} value={String(num)}>{num} {num === 1 ? t('restaurant.page.person') : t('restaurant.page.people')}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={checkAvailability}
                      disabled={checkingAvailability}
                      data-testid="check-availability-button"
                    >
                      {checkingAvailability ? t('restaurant.page.checking') : t('restaurant.page.checkAvailability')}
                    </Button>

                    {availability && availability.available && (
                      <div className="p-4 bg-success/10 text-success rounded-lg" data-testid="availability-info">
                        <p className="font-semibold">{t('restaurant.page.available', { seats: availability.available_seats })}</p>
                        <p className="text-sm mt-2">{t('restaurant.page.minPayment')}</p>
                      </div>
                    )}

                    <Button
                      className="w-full"
                      onClick={handleReservation}
                      disabled={!availability || !availability.available}
                      data-testid="book-reservation-button"
                    >
                      {t('restaurant.page.bookReservation')}
                    </Button>
                  </div>
                </div>
              </TabsContent>
            )}
          </Tabs>
        ) : showDelivery ? (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="font-heading text-3xl font-semibold">Menu</h2>
              <Select value={dietFilter} onValueChange={setDietFilter}>
                <SelectTrigger className="w-48" data-testid="menu-diet-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="veg">Veg Only</SelectItem>
                  <SelectItem value="non_veg">Non-Veg</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {menu.map((category) => (
              <div key={category.category_id} className="space-y-6">
                <h3 className="font-heading text-2xl font-semibold border-b border-border pb-2">
                  {category.name}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {category.items?.map((item) => (
                    <div key={item.item_id} className="bg-white p-6 rounded-xl border border-border shadow-card">
                      <div className="flex gap-4">
                        {item.image_url && (
                          <img src={item.image_url} alt={item.name} className="w-24 h-24 object-cover rounded-lg" />
                        )}
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg">{item.name}</h4>
                          <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-primary font-bold">₹{item.price}</span>
                            <Button size="sm" onClick={() => handleAddToCart(item)}>Add to Cart</Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-card border border-border">
            <h2 className="font-heading text-3xl font-semibold mb-6">Book a Table</h2>
            <div className="space-y-6">
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={reservationData.date}
                  onChange={(e) => setReservationData({ ...reservationData, date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  data-testid="reservation-date"
                />
              </div>
              <div>
                <Label htmlFor="time">Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={reservationData.time}
                  onChange={(e) => setReservationData({ ...reservationData, time: e.target.value })}
                  data-testid="reservation-time"
                />
              </div>
              <div>
                <Label htmlFor="party_size">Party Size</Label>
                <Select
                  value={String(reservationData.party_size)}
                  onValueChange={(v) => setReservationData({ ...reservationData, party_size: parseInt(v) })}
                >
                  <SelectTrigger data-testid="reservation-party-size">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                      <SelectItem key={num} value={String(num)}>{num} {num === 1 ? 'Person' : 'People'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" variant="outline" onClick={checkAvailability} disabled={checkingAvailability} data-testid="check-availability-button">
                {checkingAvailability ? 'Checking...' : 'Check Availability'}
              </Button>
              {availability && availability.available && (
                <div className="p-4 bg-success/10 text-success rounded-lg" data-testid="availability-info">
                  <p className="font-semibold">Available! {availability.available_seats} seats remaining</p>
                  <p className="text-sm mt-2">Minimum payment: ₹300</p>
                </div>
              )}
              <Button className="w-full" onClick={handleReservation} disabled={!availability || !availability.available} data-testid="book-reservation-button">
                Book Reservation & Pay
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantPage;
