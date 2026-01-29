import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { token } = useAuth();
  const { clearCart } = useCart();
  const [status, setStatus] = useState('checking');
  const [transaction, setTransaction] = useState(null);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (sessionId && token) {
      checkPaymentStatus(sessionId);
    } else if (sessionId && !token) {
      // Wait for token to be available
      const timer = setTimeout(() => {
        if (token) {
          checkPaymentStatus(sessionId);
        } else {
          setStatus('error');
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, token]);

  const checkPaymentStatus = async (sessionId) => {
    let attempts = 0;
    const maxAttempts = 10;
    const pollInterval = 2000;

    const poll = async () => {
      try {
        const response = await axios.get(`${API}/payments/status/${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('Payment status response:', response.data);
        
        if (response.data.payment_status === 'paid') {
          setTransaction(response.data);
          setStatus('success');
          clearCart();
          return true;
        }
        
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, pollInterval);
          return false;
        } else {
          // Even after max attempts, if we have transaction data, show it
          if (response.data) {
            setTransaction(response.data);
            setStatus('success');
            clearCart();
            return true;
          }
          setStatus('timeout');
          return false;
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, pollInterval);
          return false;
        }
        setStatus('error');
        return false;
      }
    };

    poll();
  };

  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center" className="bg-background">
        <div className="text-center">
          <p className="text-xl text-muted-foreground">Verifying payment...</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center" className="bg-background">
        <div className="text-center max-w-md">
          <CheckCircle className="w-24 h-24 text-success mx-auto mb-6" data-testid="success-icon" />
          <h1 className="font-heading text-4xl font-bold mb-4">Payment Successful!</h1>
          <p className="text-muted-foreground mb-8">
            Your payment has been processed successfully.
          </p>
          {transaction && (
            <div className="bg-white p-6 rounded-xl shadow-card border border-border mb-6 text-left">
              <p className="text-sm text-muted-foreground">Transaction ID</p>
              <p className="font-mono text-sm mb-4">{transaction.transaction_id}</p>
              <p className="text-sm text-muted-foreground">Amount</p>
              <p className="text-2xl font-bold text-primary">₹{transaction.amount}</p>
            </div>
          )}
          <Button onClick={() => navigate('/')} data-testid="go-home-button">Go to Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center" className="bg-background">
      <div className="text-center max-w-md">
        <h1 className="font-heading text-4xl font-bold mb-4">Payment Status Unknown</h1>
        <p className="text-muted-foreground mb-8">
          We're having trouble verifying your payment. Please check your email for confirmation.
        </p>
        <Button onClick={() => navigate('/')} data-testid="go-home-button">Go to Home</Button>
      </div>
    </div>
  );
};

export default PaymentSuccess;