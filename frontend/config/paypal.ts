export const PAYPAL_API_URL = process.env.NODE_ENV === 'production'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

export const getPayPalConfig = () => ({
  clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '',
  clientSecret: process.env.PAYPAL_CLIENT_SECRET,
  apiUrl: PAYPAL_API_URL,
  currency: 'USD',
  intent: 'capture'
}); 