import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/refund', destination: '/terms#refund', permanent: false },
    ]
  },
};

export default nextConfig;
