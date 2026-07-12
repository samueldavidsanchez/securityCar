import path from 'node:path'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@securitycar/shared'],
  // Monorepo root — silences multi-lockfile inference warning.
  turbopack: {
    root: path.resolve(__dirname, '..', '..'),
  },
}

export default nextConfig
