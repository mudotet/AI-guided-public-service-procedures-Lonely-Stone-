/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  env: {
    VITE_API_BASE_URL: process.env.VITE_API_BASE_URL || "http://localhost:8000",
  },
};

export default nextConfig;
