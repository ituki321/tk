import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ファイルトレースのルートをこのプロジェクトに固定（複数 lockfile 警告の抑制 / Vercel での出力ファイル収集を安定化）
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
