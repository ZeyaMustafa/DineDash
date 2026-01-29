import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Calendar, Clock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ReservationTracking = () => {
  const { reservationId } = useParams();
  const navigate = useNavigate();
  const { token, isAuthenticated } = useAuth();
  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/customer-auth');
      return;
    }
    fetchReservation();
  }, [reservationId]);

  const fetchReservation = async () => {
    try {
      const response = await axios.get(`${API}/reservations/${reservationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReservation(response.data);
    } catch (error) {
      console.error('Error fetching reservation:', error);
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

  if (!reservation) return null;

  const statusColors = {
    PENDING_PAYMENT: 'bg-warning text-warning-foreground',
    CONFIRMED: 'bg-success text-success-foreground',
    SEATED: 'bg-info text-info-foreground',
    COMPLETED: 'bg-accent text-accent-foreground',
    CANCELLED: 'bg-error text-error-foreground',
    NO_SHOW: 'bg-muted text-muted-foreground'
  };

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
        <div className="max-w-2xl mx-auto">
          <h1 className="font-heading text-5xl font-bold mb-8" data-testid="reservation-tracking-title">Reservation Details</h1>

          <div className="bg-white p-8 rounded-xl shadow-card border border-border">
            <div className="mb-6">
              <p className="text-sm text-muted-foreground">Reservation ID</p>
              <p className="font-mono text-lg" data-testid="reservation-id">{reservation.reservation_id}</p>
            </div>

            <div className="mb-6">
              <span
                className={`px-4 py-2 rounded-full text-sm font-bold ${statusColors[reservation.status] || 'bg-muted'}`}
                data-testid="reservation-status"
              >
                {reservation.status.replace('_', ' ')}
              </span>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Calendar className="w-6 h-6 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-semibold" data-testid="reservation-date">{reservation.date}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Clock className="w-6 h-6 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Time</p>
                  <p className="font-semibold" data-testid="reservation-time">{reservation.time}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Users className="w-6 h-6 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Party Size</p>
                  <p className="font-semibold" data-testid="party-size">{reservation.party_size} People</p>
                </div>
              </div>

              <div className="border-t border-border pt-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-muted-foreground">Amount Paid</span>
                  <span className="text-2xl font-bold text-primary" data-testid="reservation-amount">₹{reservation.amount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Payment Status</span>
                  <span className="font-semibold" data-testid="payment-status">{reservation.payment_status}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReservationTracking;