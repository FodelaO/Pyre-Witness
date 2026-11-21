import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Classic dynamic rendering: the app is a client-rendered twin plus streaming API routes.
  devIndicators: false,
  turbopack: {
    rules: {
      // Tailwind only processes the one stylesheet that imports it. Running the Tailwind loader
      // over every component stylesheet made concurrent dev compiles attribute one file's output
      // to another (the global stylesheet was served with unrelated CSS and the app lost its
      // styles). Component stylesheets are plain CSS and need no loader.
      "*.css": {
        condition: { path: /src\/app\/globals\.css$/ },
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
