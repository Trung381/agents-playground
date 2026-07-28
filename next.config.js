const createNextPluginPreval = require("next-plugin-preval/config");
const withNextPluginPreval = createNextPluginPreval();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/voxa/:path*",
        destination: "https://pbx.voxa.vn/api/:path*",
      },
    ];
  },
};

module.exports = withNextPluginPreval(nextConfig);
