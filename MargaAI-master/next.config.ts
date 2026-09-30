import type { NextConfig } from "next";
import path from 'node:path';

const nextConfig: NextConfig = {
  // The session spike needs this prefix for its path-scoped cookies; deployment routing is P3.2.
  basePath: '/learn',
  turbopack: { root: path.resolve(__dirname, '..') },
  outputFileTracingRoot: path.resolve(__dirname, '..'),
};

export default nextConfig;
