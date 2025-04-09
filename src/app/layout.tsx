import type {Metadata} from "next";
import React from "react";
import "./globals.css";
import {Header} from "@/app/components/header";
import {AuthProvider} from '@/app/context/AuthContext';
import {Footer} from "@/app/components/footer";


export const metadata: Metadata = {
    title: "Eclipse Development Dashboard",
    description: "Gère ton entreprise de manière efficace et rapide",
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
        <body
            className={` antialiased`}
        >
        <AuthProvider>
            <Header/>
            {children}
            <Footer/>
        </AuthProvider>
        </body>
        </html>
    );
}
