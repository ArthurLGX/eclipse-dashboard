import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    images: {
        domains: ['localhost', 'api.dashboard.eclipsestudiodev.fr'], // Allow localhost and your API domain
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