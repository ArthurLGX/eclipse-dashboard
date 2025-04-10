"use client";

import React, {useEffect} from "react";
import {motion} from "framer-motion";
import {fetchLogin} from "@/lib/api";
import {useRouter} from "next/navigation";
import {useAuth} from '@/app/context/AuthContext';


export default function Login() {
    /*
        const [email, setEmail] = React.useState("");
    */
    const [username, setUsername] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [error, setError] = React.useState("");
    const router = useRouter(); // Initialize the router
    const {authenticated, hasHydrated, login} = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const data = await fetchLogin(username, password);
            console.log(data);
            console.log('Data error : ' + data.error);
            if (!data.error) {
                // Handle successful login
                console.log("Login successful");
                localStorage.setItem('token', data.jwt); // Stockage du JWT dans localStorage ou cookies
                localStorage.setItem('user', JSON.stringify(data.user)); // Stockage de l'utilisateur
                login(data.user, data.jwt); // met à jour l'état global
                router.push("/"); // Redirect to the dashboard
            } else {
                // Handle login failure
                console.error("Login failed");
                setError("Invalid email or password");
            }
        } catch (error) {
            console.error("Error during login:", error);
            setError("An error occurred during login");
        }
    }

    useEffect(() => {
        console.log("NEXT_PUBLIC_STRAPI_API_URL:", process.env.NEXT_PUBLIC_STRAPI_API_URL);
        if (!hasHydrated) return;
        if (authenticated) {
            router.push("/")
        }
    })

    return (
        <div className="flex w-full min-h-screen items-center justify-center !p-16 flex-col">
            <header className="!my-18">
                <motion.h1
                    initial={{opacity: 0, y: -20}}
                    animate={{opacity: 1, y: 0}}
                    transition={{duration: 0.5, ease: "easeInOut"}}
                    className="text-2xl !uppercase font-bold">Login
                </motion.h1>
            </header>

            <motion.form
                initial={{opacity: 0}}
                animate={{opacity: 1}}
                transition={{duration: 0.5, ease: "easeInOut"}}
                onSubmit={handleSubmit} className="flex flex-col w-1/2 gap-4">
                {error && (
                    <div className="flex w-full items-center justify-center">
                        <p className={'!text-red-500 !text-sm'}>{error}</p>
                    </div>
                )}
                <label
                    className={'text-zinc-200'}
                >Nom d&#39;utilisateur<span className={'text-red-500'}>*</span></label>
                <input
                    type="username"
                    placeholder="Nom d'utilisateur"
                    value={username}
                    required={true}
                    onChange={(e) => setUsername(e.target.value)}
                    className="border border-zinc-700 !p-2 rounded !text-zinc-200"

                />
                <label
                    className={'text-zinc-200'}
                >Password<span className={'text-red-500'}>*</span></label>
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border border-zinc-700 !p-2 rounded !text-zinc-200"
                />
                <button type="submit"
                        className="bg-green-200 text-black border border-green-200 cursor-pointer !p-2 rounded transition-all ease-in-out duration-300 hover:bg-transparent hover:!text-green-200">
                    Login
                </button>
            </motion.form>
        </div>
    );
}