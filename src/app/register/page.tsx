"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import axios from "axios";

export default function Register() {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [profilePicture, setProfilePicture] = useState<File | null>(null);
    const [error, setError] = useState("");
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        try {
            // Étape 1: Inscription de l'utilisateur
            const res = await axios.post(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/auth/local/register`, {
                username,
                email,
                password,
            });

            if (res.status === 200) {
                const { jwt, user } = res.data;

                // Étape 2: Téléchargement de l'image de profil si présente
                if (profilePicture) {
                    const formData = new FormData();
                    formData.append("files", profilePicture);
                    formData.append("ref", "plugin::users-permissions.user");
                    formData.append("refId", user.id);
                    formData.append("field", "profile_picture");

                    await axios.post(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/upload`, formData, {
                        headers: {
                            Authorization: `Bearer ${jwt}`,
                        },
                    });
                }

                // Redirection ou autre action après l'inscription réussie
                router.push("/");
            } else {
                setError("Une erreur est survenue lors de l'inscription.");
            }
        } catch (error) {
            console.error("Erreur lors de l'inscription:", error);
            setError("Erreur lors de l'inscription. Veuillez réessayer.");
        }
    };

    return (
        <div className="flex w-full min-h-screen items-center justify-center p-16 flex-col">
            <header className="mb-8">
                <motion.h1
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="text-2xl uppercase font-bold"
                >
                    Inscription
                </motion.h1>
            </header>

            <motion.form
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                onSubmit={handleSubmit}
                className="flex flex-col w-1/2 gap-4"
            >
                {error && (
                    <div className="flex w-full items-center justify-center">
                        <p className="text-red-500 text-sm">{error}</p>
                    </div>
                )}
                <label className="text-zinc-200">
                    Nom d&#39;utilisateur<span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    placeholder="Nom d'utilisateur"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="border border-zinc-700 p-2 rounded text-zinc-200"
                />
                <label className="text-zinc-200">
                    Email<span className="text-red-500">*</span>
                </label>
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="border border-zinc-700 p-2 rounded text-zinc-200"
                />
                <label className="text-zinc-200">
                    Mot de passe<span className="text-red-500">*</span>
                </label>
                <input
                    type="password"
                    placeholder="Mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="border border-zinc-700 p-2 rounded text-zinc-200"
                />
                <label className="text-zinc-200">Photo de profil</label>
                <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setProfilePicture(e.target.files?.[0] || null)}
                    className="border border-zinc-700 p-2 rounded text-zinc-200"
                />
                <button
                    type="submit"
                    className="bg-green-200 text-black border border-green-200 cursor-pointer p-2 rounded transition-all ease-in-out duration-300 hover:bg-transparent hover:text-green-200"
                >
                    S&#39;inscrire
                </button>
            </motion.form>
        </div>
    );
}
