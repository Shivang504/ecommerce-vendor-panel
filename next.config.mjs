/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    qualities: [75, 80, 85],
  },
  serverExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
  experimental: {
    outputFileTracingIncludes: {
      '/api/admin/dashboard/export': ['./node_modules/@sparticuz/chromium/**/*'],
    },
  },
}

export default nextConfig
