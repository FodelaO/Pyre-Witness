import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Classic dynamic rendering: the app is a client-rendered twin plus streaming API routes.
  devIndicators: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
