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
}

module.exports = nextConfig 