import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'http',
                hostname: 'localhost',
            },
            {
                protocol: 'https',
                hostname: 'api.dashboard.eclipsestudiodev.fr',
            },
            {
                protocol: 'https',
                hostname: 'www.google.com',
            },
            {
                protocol: 'https',
                hostname: 'icons.duckduckgo.com',
            },
            {
                protocol: 'https',
                hostname: 't0.gstatic.com',
            },
            {
                protocol: 'https',
                hostname: 't1.gstatic.com',
            },
            {
                protocol: 'https',
                hostname: 't2.gstatic.com',
            },
            {
                protocol: 'https',
                hostname: 't3.gstatic.com',
            },
        ],
    },
    async headers() {
        return [
            {
                source: "/(.*)", // Match all routes
                headers: [
                    {
                        key: "Access-Control-Allow-Origin",
                        value: "https://api.dashboard.eclipsestudiodev.fr", // Allow your API domain
                    },
                ],
            },
        ];
    },
};

export default nextConfig;