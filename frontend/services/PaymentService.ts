import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe (replace with your publishable key)
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

export class PaymentService {
  static async createStripeSession(amount: number) {
    try {
      const response = await fetch('/api/create-stripe-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ amount }),
        credentials: 'same-origin',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create Stripe session');
      }

      const session = await response.json();
      const stripe = await stripePromise;

      if (!stripe) {
        throw new Error('Stripe failed to load');
      }

      const { error } = await stripe.redirectToCheckout({
        sessionId: session.id,
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Payment error:', error);
      throw error;
    }
  }

  static getPayPalOptions(amount: number) {
    return {
      'client-id': process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID,
      currency: 'USD',
      intent: 'capture',
      components: 'buttons',
      createOrder: async () => {
        try {
          const response = await fetch('/api/create-paypal-order', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              amount: amount,
            }),
          });

          const orderData = await response.json();
          return orderData.id;
        } catch (error) {
          console.error('PayPal order creation error:', error);
          throw error;
        }
      },
      onApprove: async (data: any) => {
        try {
          const response = await fetch(`/api/capture-paypal-order`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              orderId: data.orderID,
            }),
          });

          const orderData = await response.json();
          return orderData;
        } catch (error) {
          console.error('PayPal capture error:', error);
          throw error;
        }
      },
    };
  }
} 