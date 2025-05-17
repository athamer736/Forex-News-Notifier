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
      // Add PayPal payment endpoints
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
  
  // Add security headers - with CSP completely disabled for AdSense
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Allow AdSense iframes
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          
          // CORS headers to allow AdSense and other Google services
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Origin, Authorization' },
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Max-Age', value: '86400' },
          
          // Cross-Origin settings for AdSense
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'credentialless' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Origin, Authorization' },
          { key: 'Access-Control-Max-Age', value: '86400' }, // 24 hours cache for preflight requests
        ],
      },
    ];
  },
}

module.exports = nextConfig 