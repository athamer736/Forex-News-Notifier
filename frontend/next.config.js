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
          // Updated CSP for AdSense          {             key: 'Content-Security-Policy',             value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https: http:; frame-src 'self' https: http:; img-src 'self' data: https: http:; style-src 'self' 'unsafe-inline' https: http:; connect-src 'self' https: http:; font-src 'self' data: https: http:;"          },
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