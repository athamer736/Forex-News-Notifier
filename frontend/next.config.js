/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Configure build optimization
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Important for running behind Nginx
  poweredByHeader: false,
  compress: true,
  
  // Configure image domains
  images: {
    domains: ['fxalert.co.uk', 'localhost', '127.0.0.1'],
  },
  
  // Configure environment variables
  env: {
    BACKEND_URL: process.env.NODE_ENV === 'production' 
      ? 'https://fxalert.co.uk' 
      : 'http://localhost:5000',
  },
  
  // Handle API rewrites
  async rewrites() {
    const apiUrl = process.env.NODE_ENV === 'production'
      ? 'http://localhost:5000'  // In production, Nginx handles the HTTPS, so use plain HTTP locally
      : 'https://localhost:5000'; // For local development
    
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
      {
        source: '/events',
        destination: `${apiUrl}/events`,
      },
      {
        source: '/timezone',
        destination: `${apiUrl}/timezone`,
      },
      // Add Stripe and PayPal payment endpoints
      {
        source: '/payment/create-stripe-session',
        destination: `${apiUrl}/payment/create-stripe-session`,
      },
      {
        source: '/payment/create-paypal-order',
        destination: `${apiUrl}/payment/create-paypal-order`,
      },
      {
        source: '/payment/capture-paypal-order',
        destination: `${apiUrl}/payment/capture-paypal-order`,
      },
    ];
  },
  
  // Add security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          // Enable CSP with AdSense domains
          { 
            key: 'Content-Security-Policy', 
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://pagead2.googlesyndication.com https://partner.googleadservices.com https://tpc.googlesyndication.com https://www.googletagmanager.com https://adservice.google.com; frame-src 'self' https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://www.google.com; img-src 'self' data: https: https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://www.google-analytics.com https://www.googletagmanager.com https://adservice.google.com; style-src 'self' 'unsafe-inline'; connect-src 'self' https: https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://adservice.google.com https://www.google-analytics.com;"
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Origin, Authorization' },
        ],
      },
    ];
  },
}

module.exports = nextConfig 