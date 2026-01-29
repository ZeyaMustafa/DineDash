import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CartCheckout = () => {
  const navigate = useNavigate();
  const { token, isAuthenticated } = useAuth();
  const { cart, restaurantName, getTotalAmount, removeFromCart, updateQuantity, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState({
    delivery_address: '',
    delivery_phone: '',
    notes: '',
    payment_method: 'COD'
  });

  if (!isAuthenticated) {
    navigate('/customer-auth');
    return null;
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FDFBF7' }}>
        <div className="text-center">
          <h2 className="font-heading text-3xl font-bold mb-4">Your cart is empty</h2>
          <Button onClick={() => navigate('/')} data-testid="go-home-button">Browse Restaurants</Button>
        </div>
      </div>
    );
  }

  const handleCheckout = async () => {
    if (!orderData.delivery_address || !orderData.delivery_phone) {
      toast.error('Please fill in delivery details');
      return;
    }

    setLoading(true);
    try {
      const orderResponse = await axios.post(
        `${API}/orders`,
        {
          restaurant_id: cart[0].restaurant_id,
          items: cart.map(item => ({
            item_id: item.item_id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            instructions: null
          })),
          delivery_address: orderData.delivery_address,
          delivery_phone: orderData.delivery_phone,
          notes: orderData.notes,
          payment_method: orderData.payment_method
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const orderId = orderResponse.data.order_id;

      if (orderData.payment_method === 'Stripe') {
        const paymentResponse = await axios.post(
          `${API}/payments/checkout`,
          {
            payment_type: 'order',
            reference_id: orderId,
            origin_url: window.location.origin
          },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        window.location.href = paymentResponse.data.url;
      } else {
        clearCart();
        toast.success('Order placed successfully!');
        navigate(`/orders/${orderId}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FDFBF7' }}>
      <header className="bg-white border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 md:px-8 py-4">
          <Button variant="ghost" onClick={() => navigate(-1)} data-testid="back-button">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 md:px-8 py-12">
        <h1 className="font-heading text-5xl font-bold mb-8" data-testid="cart-title">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-card border border-border">
              <h2 className="font-heading text-2xl font-semibold mb-4">Order from {restaurantName}</h2>
              <div className="space-y-4">
                {cart.map((item) => (
                  <div key={item.item_id} className="flex items-center gap-4 pb-4 border-b border-border last:border-0" data-testid={`cart-item-${item.item_id}`}>
                    <img src={item.image_url} alt={item.name} className="w-20 h-20 object-cover rounded-lg" />
                    <div className="flex-1">
                      <h3 className="font-semibold">{item.name}</h3>
                      <p className="text-primary font-bold">₹{item.price}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateQuantity(item.item_id, item.quantity - 1)}
                        data-testid={`decrease-${item.item_id}`}
                      >
                        -
                      </Button>
                      <span className="w-8 text-center" data-testid={`quantity-${item.item_id}`}>{item.quantity}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateQuantity(item.item_id, item.quantity + 1)}
                        data-testid={`increase-${item.item_id}`}
                      >
                        +
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFromCart(item.item_id)}
                        data-testid={`remove-${item.item_id}`}
                      >
                        <Trash2 className="w-4 h-4 text-error" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-card border border-border">
              <h2 className="font-heading text-2xl font-semibold mb-4">Delivery Details</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="address">Delivery Address</Label>
                  <Input
                    id="address"
                    value={orderData.delivery_address}
                    onChange={(e) => setOrderData({ ...orderData, delivery_address: e.target.value })}
                    placeholder="Enter your delivery address"
                    data-testid="delivery-address-input"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={orderData.delivery_phone}
                    onChange={(e) => setOrderData({ ...orderData, delivery_phone: e.target.value })}
                    placeholder="Enter your phone number"
                    data-testid="delivery-phone-input"
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Order Notes (Optional)</Label>
                  <Input
                    id="notes"
                    value={orderData.notes}
                    onChange={(e) => setOrderData({ ...orderData, notes: e.target.value })}
                    placeholder="Any special instructions?"
                    data-testid="order-notes-input"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-card border border-border">
              <h2 className="font-heading text-2xl font-semibold mb-4">Payment Method</h2>
              <RadioGroup value={orderData.payment_method} onValueChange={(v) => setOrderData({ ...orderData, payment_method: v })}>
                <div className="flex items-center space-x-2" data-testid="payment-cod">
                  <RadioGroupItem value="COD" id="cod" />
                  <Label htmlFor="cod">Cash on Delivery</Label>
                </div>
                <div className="flex items-center space-x-2" data-testid="payment-stripe">
                  <RadioGroupItem value="Stripe" id="stripe" />
                  <Label htmlFor="stripe">Pay with Card (Stripe)</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <div>
            <div className="bg-white p-6 rounded-xl shadow-card border border-border sticky top-24">
              <h2 className="font-heading text-2xl font-semibold mb-4">Order Summary</h2>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{getTotalAmount().toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span>₹40.00</span>
                </div>
                <div className="border-t border-border pt-3">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span data-testid="total-amount">₹{(getTotalAmount() + 40).toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <Button
                className="w-full"
                onClick={handleCheckout}
                disabled={loading}
                data-testid="place-order-button"
              >
                {loading ? 'Processing...' : 'Place Order'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartCheckout;