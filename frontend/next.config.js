/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Configure build optimization
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Enable static optimization
  experimental: {
    // Enable optimizations
    optimizeCss: true,
    // Enable modern build output
    optimizePackageImports: ['@mui/material', '@mui/icons-material'],
  },
  // Configure page optimization
  poweredByHeader: false,
  compress: true,
  server: {
    https: {
      cert: "C:\\Certbot\\live\\fxalert.co.uk\\fullchain.pem",
      key: "C:\\Certbot\\live\\fxalert.co.uk\\privkey.pem"
    },
    port: 3000
  }
}

module.exports = nextConfig 