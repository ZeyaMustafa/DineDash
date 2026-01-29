import React from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PaymentCancel = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center" className="bg-background">
      <div className="text-center max-w-md">
        <XCircle className="w-24 h-24 text-error mx-auto mb-6" data-testid="cancel-icon" />
        <h1 className="font-heading text-4xl font-bold mb-4">Payment Cancelled</h1>
        <p className="text-muted-foreground mb-8">
          Your payment was cancelled. No charges were made.
        </p>
        <div className="flex gap-4 justify-center">
          <Button variant="outline" onClick={() => navigate(-1)} data-testid="go-back-button">
            Go Back
          </Button>
          <Button onClick={() => navigate('/')} data-testid="go-home-button">
            Go to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancel;