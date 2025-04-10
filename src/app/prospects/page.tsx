"use client";
import React, {useEffect} from "react";
import {motion} from "framer-motion";
import {fetchProspects} from "@/lib/api";
import Image from "next/image";
import ProtectedRoute from '@/app/components/ProtectedRoute';

interface Prospect {
    bgColor: string;
    textColor: string;
    bgColorType: string;
    textColorType: string;
    id: number;
    title: string;
    description: string;
    prospect_status: string;
    contacted_date: string;
    image: {
        url: string;
    };
    notes: string;
    email: string;
    website:string;
}

export default function Prospects() {
    const [prospects, setProspects] = React.useState<Prospect[]>([]);

    useEffect(() => {
        fetchProspects().then((data) => {
            console.log(data.data);
            const updatedProspects = data.data.map((prospect: Prospect) => {
                let bgColor = "";
                let textColor = "";

                // Set colors based on project_status
                if (prospect.prospect_status === "to be contacted") {
                    bgColor = "bg-zinc-200";
                    textColor = "!text-black";
                } else if (prospect.prospect_status === "contacted") {
                    bgColor = "bg-orange-200";
                    textColor = "!text-black";
                } else if (prospect.prospect_status === "answer") {
                    bgColor = "bg-green-200";
                    textColor = "!text-black";
                } else {
                    bgColor = "bg-red-200";
                    textColor = "!text-black";
                }

                return {
                    ...prospect,
                    bgColor,
                    textColor,
                };
            });

            setProspects(updatedProspects);
        });
    }, []);

    const apiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";

    return (
        <ProtectedRoute>
            <div className="flex w-full min-h-screen !p-16 flex-col">
                <header className="!my-18">
                    <h1 className="text-2xl !uppercase font-bold">Prospects</h1>
                </header>

                <div className={'grid grid-cols-4 gap-4'}>
                    {prospects.map((prospect) => {
                        const imageUrl = prospect.image?.url
                            ? `${apiUrl}${prospect.image.url}`
                            : null;

                        return (
                            <motion.div
                                className={'flex-col flex items-start justify-start gap-4'}
                                key={prospect.id}
                                transition={{duration: 0.3}}
                            >
                                <div className={'flex flex-row items-center justify-center gap-2'}>
                                    <p className={`text-sm ${prospect.bgColor} ${prospect.textColor} rounded-full !px-4 !py-1 text-sm text-zinc-500 mb-2 w-fit`}>
                                        {prospect.prospect_status.replace(/_/g, " ")}
                                    </p>
                                </div>
                                <motion.div
                                    initial={{opacity: 0, y: 10}}
                                    animate={{opacity: 1, y: 0}}
                                    transition={{duration: 0.5, ease: "easeInOut"}}
                                    className="rounded-2xl h-[250px] shadow !p-8 flex flex-col gap-4 bg-zinc-950 border border-zinc-800 hover:border-green-200 hover:bg-transparent transition-all ease-in-out duration-300 hover:-translate-y-[5px] cursor-pointer"
                                >
                                    {imageUrl && (
                                        <Image
                                            src={imageUrl}
                                            width={300}
                                            height={300}
                                            alt={prospect.title}
                                            className="w-48 h-48 rounded-xl mb-2"
                                        />
                                    )}
                                    <p className="text-zinc-300 text-sm">{prospect.contacted_date}</p>
                                    <h2 className="!text-xl !text-zinc-200 font-bold mb-1">{prospect.title}</h2>
                                    <p className="text-zinc-300 text-sm ">
                                        {prospect.description.split(" ").slice(0, 10).join(" ")}...
                                    </p>
                                </motion.div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </ProtectedRoute>
    );
}