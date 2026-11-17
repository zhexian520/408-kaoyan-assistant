import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* 关闭开发环境左下角的 Next.js 调试浮标 */
  devIndicators: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // 本地开发时也走与线上一致的相对路径：
  // /api/*    -> Java 8080
  // /api/ai/* -> Python 8000
  // /pilot/*  -> 408 Pilot 8010
  async rewrites() {
    return [
      { source: "/api/ai/:path*", destination: "http://127.0.0.1:8000/api/ai/:path*" },
      { source: "/api/:path*", destination: "http://127.0.0.1:8080/api/:path*" },
      { source: "/ai-api/:path*", destination: "http://127.0.0.1:8000/:path*" },
      { source: "/pilot/:path*", destination: "http://127.0.0.1:8010/:path*" },
    ];
  },
};

export default nextConfig;
