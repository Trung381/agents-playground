const path = require("path");
const createNextPluginPreval = require("next-plugin-preval/config");
const withNextPluginPreval = createNextPluginPreval();

const isDev = process.env.NODE_ENV !== "production";

// Next.js emits inline bootstrap scripts, so script-src needs 'unsafe-inline'
// (dev also needs 'unsafe-eval' for React refresh). connect-src allows https/wss
// because the LiveKit server URL is deployment-specific and returned at runtime.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "media-src 'self' blob: mediastream:",
  "connect-src 'self' https: wss:" + (isDev ? " ws:" : ""),
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(self), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  // Do not advertise the framework (X-Powered-By: Next.js).
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
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
