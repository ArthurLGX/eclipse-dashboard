"use client";
import React, {useEffect} from "react";
import {motion} from "framer-motion";
import {fetchMentors} from "@/lib/api";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import Image from "next/image";

interface Mentor {
    id: number;
    firstname: string;
    lastname: string;
    email: string;
    expertise: { id: number; documentId: string; name: string }[];
    adress: string;
    picture: {
        url: string;
    };
}

export default function Mentors() {
    const [mentors, setMentors] = React.useState<Mentor[]>([]);

    useEffect(() => {
            fetchMentors().then((data) => {
                console.log(data.data)
                setMentors(data.data)
            });
        }
        ,
        []
    )
    ;

    const apiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";

    return (
        <ProtectedRoute>
            <div className="flex w-full min-h-screen !p-16 flex-col">
                <header className="!my-18">
                    <h1 className="text-2xl !uppercase font-bold">mentors</h1>
                </header>

                <div className="flex flex-row gap-4 flex-wrap">
                    {mentors.map((mentor) => {
                        const imageUrl = mentor.picture?.url
                            ? `${apiUrl}${mentor.picture.url}`
                            : "/default-image.png"; // fallback image

                        return (
                            <motion.div
                                className={'flex-col flex items-start justify-start gap-4'}
                                key={mentor.id}
                                transition={{duration: 0.3}}
                            >
                                <motion.div
                                    initial={{opacity: 0, y: 10}}
                                    animate={{opacity: 1, y: 0}}
                                    transition={{duration: 0.3, ease: "easeInOut"}}
                                    className="rounded-2xl h-fit w-[250px] gap-4 flex group flex-col items-center justify-center shadow !p-4 bg-zinc-950 border border-zinc-800 hover:border-green-200 hover:bg-transparent transition-all ease-in-out duration-300 hover:-translate-y-[5px] cursor-pointer"
                                >
                                    <div className={'flex flex-row gap-2 items-center justify-center flex-wrap'}>
                                        {mentor.expertise && mentor.expertise.map((exp, index) => (
                                            <p key={index}
                                               className="text-zinc-200 !text-sm border-zinc-200 border rounded-full !px-2">{exp.name}</p>
                                        ))}</div>
                                    <Image
                                        src={imageUrl}
                                        width={300}
                                        height={300}
                                        alt={mentor.firstname + " " + mentor.lastname}
                                        className="w-30 h-auto mb-2"
                                    />
                                    <h2 className="group-hover:text-green-200 text-zinc-200 uppercase !font-bold !text-lg">{mentor.firstname} {mentor.lastname}</h2>
                                    <p className="text-zinc-400 !text-sm">{mentor.email}</p>
                                </motion.div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </ProtectedRoute>
    );
}