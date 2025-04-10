import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    images: {
        domains: ['localhost', 'api.dashboard.eclipsestudiodev.fr'], // Autorise localhost et ton domaine API
    },
};

export default nextConfig;
