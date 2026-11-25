import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = dirname(fileURLToPath(import.meta.url))
// one id per deploy (lib/build-id.ts): the commit on Vercel, else the build's time
const buildId = (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 12) || String(Date.now())

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  env: { NEXT_PUBLIC_BUILD_ID: buildId },
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
