import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  
  eslint: {
    ignoreDuringBuilds: false,
  },
  
  experimental: {
    serverComponentsExternalPackages: ['fs-extra']
  }
}

export default nextConfig