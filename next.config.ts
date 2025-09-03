import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a static export in the `out` directory
  output: "export",
  images: {
    // Required for `next/image` with static export
    unoptimized: true,
  },
};

export default nextConfig;
