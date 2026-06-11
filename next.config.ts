import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // このプロジェクトをルートにして lockfile 警告を抑制
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
