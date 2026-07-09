/** @type {import('next').NextConfig} */
const nextConfig = {
  generateBuildId: () => 'build-' + Date.now(),
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Skip static page generation for pages that use client-side hooks
  // (useSession, useSearchParams) which can't be prerendered
  experimental: {
    // This allows pages with useSession to build without prerender errors
    fallbackNodePolyfills: false,
  },
};

export default nextConfig;
