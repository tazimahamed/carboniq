/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // pdfjs-dist browser-এ চলে; server-এর "canvas" package লাগে না
    config.resolve.alias.canvas = false;
    return config;
  },
};
export default nextConfig;
