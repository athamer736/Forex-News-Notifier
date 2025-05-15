import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe (replace with your publishable key)
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

export class PaymentService {
  static async createStripeSession(amount: number) {
    try {
      // Use Next.js rewrite to forward to backend API
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      console.log('Using origin for Stripe:', origin);
      
      const response = await fetch(`${origin}/payment/create-stripe-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Origin': typeof window !== 'undefined' ? window.location.origin : '',
        },
        body: JSON.stringify({ amount }),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        console.error('Stripe response error:', response.status, errorData);
        throw new Error(errorData.error || `Failed to create Stripe session: ${response.status}`);
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
        console.error('Stripe redirect error:', error);
        throw error;
      }
    } catch (error) {
      console.error('Payment error:', error);
      throw error;
    }
  }

  static getPayPalOptions(amount: number) {
    // Use Next.js rewrite to forward to backend API
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    console.log('Using origin for PayPal:', origin);
    
    return {
      'client-id': process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID,
      currency: 'USD',
      intent: 'capture',
      components: 'buttons',
      createOrder: async () => {
        try {
          const response = await fetch(`${origin}/payment/create-paypal-order`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Origin': typeof window !== 'undefined' ? window.location.origin : '',
            },
            body: JSON.stringify({
              amount: amount,
            }),
            credentials: 'include',
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Network error' }));
            console.error('PayPal order creation error response:', response.status, errorData);
            throw new Error(errorData.error || `Failed to create PayPal order: ${response.status}`);
          }

          const orderData = await response.json();
          return orderData.id;
        } catch (error) {
          console.error('PayPal order creation error:', error);
          throw error;
        }
      },
      onApprove: async (data: any) => {
        try {
          const response = await fetch(`${origin}/payment/capture-paypal-order`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Origin': typeof window !== 'undefined' ? window.location.origin : '',
            },
            body: JSON.stringify({
              orderId: data.orderID,
            }),
            credentials: 'include',
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Network error' }));
            console.error('PayPal capture error response:', response.status, errorData);
            throw new Error(errorData.error || `Failed to capture PayPal payment: ${response.status}`);
          }

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