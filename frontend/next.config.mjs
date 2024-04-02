/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    optimizePackageImports: ['@mantine/core', '@mantine/hooks'],
  },
  images: {
    remotePatterns: [
      {
        hostname: "i.scdn.co",
        protocol: "https",
      }
    ]
  }
};

export default nextConfig;
