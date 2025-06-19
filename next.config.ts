import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  
  images: {
    unoptimized: true
  },
  
  typescript: {
    ignoreBuildErrors: true,
  },
  
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  webpack: (config, { isServer }) => {
    if (!isServer) {
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