import type { NextConfig } from "next";

// CSP : unsafe-eval requis uniquement en dev (React/Next.js pour les erreurs)
// En prod, éviter unsafe-eval réduit les risques d'injection de code
const isDev = process.env.NODE_ENV === 'development';

const cspHeader = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' https://js.stripe.com https://vercel.live${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' blob: data: https: http:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://api.dashboard.eclipsestudiodev.fr https://*.stripe.com https://docs.google.com wss:",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
].join('; ');

const nextConfig: NextConfig = {
    eslint: { ignoreDuringBuilds: true },
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
            {
                protocol: 'https',
                hostname: 'randomuser.me',
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
                    {
                        key: "Content-Security-Policy",
                        value: cspHeader,
                    },
                ],
            },
        ];
    },
};

export default nextConfig;