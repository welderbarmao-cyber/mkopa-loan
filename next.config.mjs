/** @type {import('next').NextConfig} */
const nextConfig = {
  generateBuildId: () => 'build-' + Date.now(),
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
