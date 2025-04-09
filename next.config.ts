import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    images: {
        domains: ['localhost'], // Autorise le domaine localhost pour les images
    },
};

export default nextConfig;
