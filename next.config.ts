import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    qualities: [75, 92],
  },
  experimental: {
    serverActions: {
      // Vercel Functions cap request bodies at 4.5 MB. Keep the framework
      // ceiling below that, while the customer CSV flow enforces a stricter
      // 3 MB file limit to leave room for multipart/form-data overhead.
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
