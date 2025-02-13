/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Configure build optimization
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Configure page optimization
  poweredByHeader: false,
  compress: true,
  // Add port configuration
  port: 3001
}

module.exports = nextConfig 