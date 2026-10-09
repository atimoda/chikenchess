import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: process.env.CHICKENCHESS_NEXT_BUILD_DIR || '.next',
  turbopack: { root: projectRoot },
  outputFileTracingRoot: projectRoot,
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
 
}

// The maintenance bridge exists only in the explicit local admin command.
if (process.env.CHICKENCHESS_ADMIN_SERVICE_URL && process.env.NODE_ENV !== 'production') {
  delete nextConfig.output
  nextConfig.rewrites = async () => [{ source: '/__admin-local/:path*', destination: `${process.env.CHICKENCHESS_ADMIN_SERVICE_URL}/:path*` }]
}

export default nextConfig
