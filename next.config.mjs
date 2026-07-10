/** @type {import('next').NextConfig} */
const apiTarget = process.env.API_PROXY_TARGET || 'http://127.0.0.1:8000'

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Proxy API calls through Next.js (same origin) — avoids CORS / "Failed to fetch"
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${apiTarget}/api/:path*` },
      { source: '/health', destination: `${apiTarget}/health` },
    ]
  },
}

export default nextConfig
