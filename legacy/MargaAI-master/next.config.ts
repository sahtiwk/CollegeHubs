import type { NextConfig } from "next";
import path from 'node:path';

const nextConfig: NextConfig = {
  // One prefix across Next routes/assets/RSC and the gateway. Native URLs use moduleUrl.
  basePath: '/learn',
  turbopack: { root: path.resolve(__dirname, '..') },
  outputFileTracingRoot: path.resolve(__dirname, '..'),
};

export default nextConfig;
