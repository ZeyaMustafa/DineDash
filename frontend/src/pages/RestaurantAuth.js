import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const RestaurantAuth = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // Step 1: Auth, Step 2: Restaurant Details
  const [authData, setAuthData] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: ''
  });
  const [restaurantData, setRestaurantData] = useState({
    name: '',
    description: '',
    cuisine: '',
    address: '',
    phone: '',
    hours: '9:00 AM - 10:00 PM',
    service_type: 'both',
    is_veg: false,
    is_non_veg: false,
    image_url: 'https://images.unsplash.com/photo-1687945512099-400cbe94460c?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzl8MHwxfHNlYXJjaHwyfHxtb2Rlcm4lMjByZXN0YXVyYW50JTIwaW50ZXJpb3IlMjBkZXNpZ258ZW58MHx8fHwxNzY5NjkyNzI5fDA&ixlib=rb-4.1.0&q=85'
  });

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isLogin ? '/auth/restaurant/login' : '/auth/restaurant/signup';
      const response = await axios.post(`${API}${endpoint}`, formData);
      
      if (isLogin) {
        // For login, go directly to dashboard
        login(response.data.token, {
          user_id: response.data.user_id,
          email: response.data.email,
          name: response.data.name,
          role: response.data.role
        });
        toast.success('Login successful!');
        navigate('/restaurant-dashboard');
      } else {
        // For signup, store auth data and proceed to restaurant details
        setAuthData(response.data);
        setStep(2);
        toast.success('Account created! Now add your restaurant details.');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRestaurantSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create restaurant profile
      await axios.post(
        `${API}/restaurants`,
        restaurantData,
        {
          headers: { Authorization: `Bearer ${authData.token}` }
        }
      );

      // Now login with the auth data
      login(authData.token, {
        user_id: authData.user_id,
        email: authData.email,
        name: authData.name,
        role: authData.role
      });
      
      toast.success('Restaurant profile created successfully!');
      navigate('/restaurant-dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create restaurant profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#FDFBF7' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white p-8 rounded-2xl shadow-card border border-border">
          <div className="text-center mb-8">
            <h1 className="font-heading text-4xl font-bold text-primary mb-2" data-testid="restaurant-auth-title">Restaurant Portal</h1>
            <p className="text-muted-foreground">Manage your restaurant</p>
          </div>

          <Tabs value={isLogin ? 'login' : 'signup'} onValueChange={(v) => setIsLogin(v === 'login')}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login" data-testid="login-tab">Login</TabsTrigger>
              <TabsTrigger value="signup" data-testid="signup-tab">Sign Up</TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required={!isLogin}
                    data-testid="name-input"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  data-testid="email-input"
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  data-testid="password-input"
                />
              </div>

              {!isLogin && (
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required={!isLogin}
                    data-testid="phone-input"
                  />
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
                data-testid="submit-button"
              >
                {loading ? 'Processing...' : isLogin ? 'Login' : 'Sign Up'}
              </Button>
            </form>
          </Tabs>

          <div className="mt-6 text-center">
            <Button variant="link" onClick={() => navigate('/')} data-testid="back-home-button">
              Back to Home
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default RestaurantAuth;