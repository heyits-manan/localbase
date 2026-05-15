import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: false,
  turbopack: {
    rules: {
      "*.webm": {
        type: "asset"
      }
    }
  }
};

export default nextConfig;
