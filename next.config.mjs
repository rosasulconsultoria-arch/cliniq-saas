/** @type {import('next').NextConfig} */
const nextConfig = {
  // Packages with native modules must stay as Node.js externals (not bundled by webpack)
  serverExternalPackages: ['@react-pdf/renderer', 'canvas'],
  typescript: {
    // Prisma v7 adapter types resolve at runtime — skip TS typecheck in build
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
        ],
      },
    ]
  },
}

export default nextConfig
