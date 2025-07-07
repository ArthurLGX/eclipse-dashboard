"use client";
import React, {useEffect} from "react";
import {motion} from "framer-motion";
import {fetchProjects} from "@/lib/api";
import Image from "next/image";
import ProtectedRoute from '@/app/components/ProtectedRoute';

interface Project {
    bgColor: string;
    textColor: string;
    bgColorType: string;
    textColorType: string;
    id: number;
    title: string;
    description: string;
    project_status: string;
    start_date: string;
    end_date: string;
    document: {
        url: string;
    };
    notes: string;
    type: string;
}

export default function Projects() {
    const [projects, setProjects] = React.useState<Project[]>([]);

    useEffect(() => {
        fetchProjects().then((data) => {
            const updatedProjects = data.data.map((project: Project) => {
                let bgColor = "";
                let textColor = "";
                let bgColorType = "";
                let textColorType = "";

                // Set colors based on project_status
                if (project.project_status === "planning") {
                    bgColor = "bg-zinc-200";
                    textColor = "!text-black";
                } else if (project.project_status === "in_progress") {
                    bgColor = "bg-orange-200";
                    textColor = "!text-black";
                } else if (project.project_status === "completed") {
                    bgColor = "bg-green-200";
                    textColor = "!text-black";
                } else {
                    bgColor = "bg-red-200";
                    textColor = "!text-black";
                }

                // Set colors based on type
                if (project.type === "design") {
                    bgColorType = "bg-blue-200";
                    textColorType = "!text-black";
                } else if (project.type === "development") {
                    bgColorType = "bg-yellow-200";
                    textColorType = "!text-black";
                } else if (project.type === "maintenance") {
                    bgColorType = "bg-red-300";
                    textColorType = "!text-black";
                } else {
                    bgColorType = "bg-red-200";
                    textColorType = "!text-black";
                }

                return {
                    ...project,
                    bgColor,
                    textColor,
                    bgColorType,
                    textColorType,
                };
            });

            setProjects(updatedProjects);
        });
    }, []);

    const apiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";

    return (
        <ProtectedRoute>
            <div className="flex w-full min-h-screen !p-16 flex-col">
                <header className="!my-18">
                    <h1 className="text-2xl !uppercase font-bold">Projects</h1>
                </header>

                <div className={'grid grid-cols-4 gap-4'}>
                    {projects.map((project) => {
                        const documentUrl = project.document?.url
                            ? `${apiUrl}${project.document.url}`
                            : null;

                        return (
                            <motion.div
                                className={'flex-col flex items-start justify-start gap-4'}
                                key={project.id}
                                transition={{duration: 0.3}}
                            >
                                <div className={'flex flex-row items-center justify-center gap-2'}>
                                    <p className={`text-sm ${project.bgColor} ${project.textColor} rounded-full !px-4 !py-1 text-sm text-zinc-500 mb-2 w-fit`}>
                                        {project.project_status.replace(/_/g, " ")}
                                    </p>
                                    <p className={`text-sm ${project.bgColorType} ${project.textColorType} rounded-full !px-4 !py-1 text-sm text-zinc-500 mb-2 w-fit`}>
                                        {project.type.replace(/_/g, " ")}
                                    </p>
                                </div>
                                <motion.div
                                    initial={{opacity: 0, y: 10}}
                                    animate={{opacity: 1, y: 0}}
                                    transition={{duration: 0.5, ease: "easeInOut"}}
                                    className="rounded-2xl h-[250px] shadow !p-8 flex flex-col gap-4 bg-zinc-950 border border-zinc-800 hover:border-green-200 hover:bg-transparent transition-all ease-in-out duration-300 hover:-translate-y-[5px] cursor-pointer"
                                >
                                    {documentUrl && (
                                        <Image
                                            src={documentUrl}
                                            width={300}
                                            height={300}
                                            alt={project.title}
                                            className="w-48 h-48 rounded-xl mb-2"
                                        />
                                    )}
                                    <p className="text-zinc-300 text-sm">{project.start_date} - {project.end_date ? project.end_date : "Present"}</p>
                                    <h2 className="!text-xl !text-zinc-200 font-bold mb-1">{project.title}</h2>
                                    <p className="text-zinc-300 text-sm ">
                                        {project.description.split(" ").slice(0, 10).join(" ")}...
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