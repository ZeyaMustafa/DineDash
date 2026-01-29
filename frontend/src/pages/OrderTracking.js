import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Package, Truck, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const OrderTracking = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { token, isAuthenticated } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/customer-auth');
      return;
    }
    fetchOrder();
    const interval = setInterval(fetchOrder, 10000);
    return () => clearInterval(interval);
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const response = await axios.get(`${API}/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrder(response.data);
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!order) return null;

  const statusSteps = [
    { key: 'PLACED', label: 'Order Placed', icon: Package },
    { key: 'ACCEPTED', label: 'Order Accepted', icon: CheckCircle },
    { key: 'PREPARING', label: 'Order Preparation', icon: Package },
    { key: 'OUT_FOR_DELIVERY', label: 'On the way', icon: Truck },
    { key: 'DELIVERED', label: 'Delivered', icon: CheckCircle }
  ];

  const currentStepIndex = statusSteps.findIndex(step => step.key === order.status);

  return (
    <div className="min-h-screen" className="bg-background">
      <header className="bg-white border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 md:px-8 py-4">
          <Button variant="ghost" onClick={() => navigate('/')} data-testid="back-button">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 md:px-8 py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-heading text-5xl font-bold mb-8" data-testid="order-tracking-title">Order Tracking</h1>

          <div className="bg-white p-8 rounded-xl shadow-card border border-border mb-8">
            <div className="mb-6">
              <p className="text-sm text-muted-foreground">Order ID</p>
              <p className="font-mono text-lg" data-testid="order-id">{order.order_id}</p>
            </div>

            <div className="space-y-4 mb-8">
              {statusSteps.map((step, index) => {
                const Icon = step.icon;
                const isActive = index <= currentStepIndex;
                const timestamp = order.status_timestamps?.[step.key];
                return (
                  <div key={step.key} className="flex items-center gap-4" data-testid={`status-${step.key}`}>
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        isActive ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <p className={`font-semibold ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                        {step.label}
                      </p>
                      {timestamp && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(timestamp).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-border pt-6 space-y-4">
              {order.estimated_delivery_time && order.status !== 'DELIVERED' && (
                <div className="bg-primary/5 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Estimated Delivery Time</p>
                  <p className="text-xl font-bold text-primary">
                    {new Date(order.estimated_delivery_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Delivery Address</p>
                <p data-testid="delivery-address">{order.delivery_address}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p data-testid="delivery-phone">{order.delivery_phone}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold text-primary" data-testid="order-total">₹{order.total_amount}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Payment Method</p>
                <p data-testid="payment-method">{order.payment_method}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Payment Status</p>
                <p data-testid="payment-status">{order.payment_status}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-card border border-border">
            <h2 className="font-heading text-2xl font-semibold mb-4">Order Items</h2>
            <div className="space-y-4">
              {order.items?.map((item, index) => (
                <div key={index} className="flex justify-between items-center pb-4 border-b border-border last:border-0">
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                  </div>
                  <p className="font-bold">₹{item.price * item.quantity}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTracking;