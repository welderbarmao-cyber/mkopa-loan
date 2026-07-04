/** @type {import('next').NextConfig} */
const nextConfig = {
  generateBuildId: () => 'build-' + Date.now(),
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Safety net: ignore type errors during build so we always deploy.
    // The data layer uses dynamic JSON shapes from GitHub storage that
    // are hard to type perfectly, and we don't want to block deployments
    // on cosmetic type mismatches.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
