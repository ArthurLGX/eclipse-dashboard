"use client";
import React, {useEffect} from "react";
import {motion} from "framer-motion";
import {fetchClients} from "@/lib/api";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import Image from "next/image";

interface Client {
    id: number;
    name: string;
    email: string;
    number: string;
    enterprise: string;
    adress: string;
    image: {
        url: string;
    };
    website: string;
    processStatus: string;
    client_id: string;
    createdAt: string;
    updatedAt: string;
}

export default function Clients() {
    const [clients, setClients] = React.useState<Client[]>([]);

    useEffect(() => {
            fetchClients().then((data) => {
                console.log(data.data)
                setClients(data.data)
            });
        }
        ,
        []
    )
    ;

    const apiUrl = process.env.NEXT_PUBLIC_STRAPI_API_URL || "http://localhost:1337";

    return (
        <ProtectedRoute>
            <div className="flex w-full min-h-screen !p-16 flex-col">
                <header className="!my-18">
                    <h1 className="text-2xl !uppercase font-bold">clients</h1>
                </header>

                <div className="flex flex-row gap-4 flex-wrap">
                    {clients.map((client) => {
                        const imageUrl = client.image?.url
                            ? `${apiUrl}${client.image.url}`
                            : "/default-image.png"; // fallback image

                        return (
                            <motion.div
                                className={'flex-col flex items-start justify-start gap-4'}
                                key={client.id}
                                transition={{duration: 0.3}}
                            >
                                <p className={`${client.processStatus === "prospect" ? "bg-fuchsia-200 border-xl !text-black" : "bg-green-200 border-xl !text-black"} rounded-full !px-4 !py-1 text-sm text-gray-500 mb-2 w-fit`}>
                                    {client.processStatus}
                                </p>
                                <motion.div
                                    initial={{opacity: 0, y: 10}}
                                    animate={{opacity: 1, y: 0}}
                                    transition={{duration: 0.5, ease: "easeInOut"}}
                                    className="rounded-2xl h-[200px] w-[250px] gap-8 flex flex-col items-center justify-center shadow !p-4 bg-zinc-950 border border-zinc-800 hover:border-green-200 hover:bg-transparent transition-all ease-in-out duration-300 hover:-translate-y-[5px] cursor-pointer"
                                >
                                    <Image
                                        src={imageUrl}
                                        width={300}
                                        height={300}
                                        alt={client.name}
                                        className="w-30 h-auto mb-2"
                                    />
                                </motion.div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </ProtectedRoute>
    );
}