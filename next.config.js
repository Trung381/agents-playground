const path = require("path");
const createNextPluginPreval = require("next-plugin-preval/config");
const withNextPluginPreval = createNextPluginPreval();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "./"),
  async rewrites() {
    return [
      {
        source: "/api/voxa/:path*",
        destination: `${
          process.env.VOXA_API_BASE_URL ||
          process.env.CALLYTICS_BASE ||
          "https://api.app.voxa.vn/api"
        }/:path*`,
      },
    ];
  },
};

module.exports = withNextPluginPreval(nextConfig);
