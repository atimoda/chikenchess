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

export default nextConfig
