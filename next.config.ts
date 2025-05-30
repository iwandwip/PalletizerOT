import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Enable static export for ESP32
  output: 'export',
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  distDir: 'out',
  
  // Disable image optimization (not needed for ESP32)
  images: {
    unoptimized: true
  },
  
  // Optimize for single file
  experimental: {
    optimizeCss: true,
  },
  
  // Custom webpack config for single file
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Bundle everything into fewer chunks
      config.optimization.splitChunks = {
        chunks: 'all',
        minSize: 0,
        cacheGroups: {
          default: {
            chunks: 'all',
            minChunks: 1,
            priority: -20,
            reuseExistingChunk: true
          }
        }
      }
    }
    return config
  }
}

export default nextConfig