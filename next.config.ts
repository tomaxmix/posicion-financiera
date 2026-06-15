import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite imágenes de Google (avatar del usuario)
  images: {
    domains: ['lh3.googleusercontent.com'],
  },
};

export default nextConfig;
