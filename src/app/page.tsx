"use client";
import useLenis from '../utils/useLenis';
import {IconUser, IconMail, IconUsers, IconBuilding, IconMagnet, IconBrain} from "@tabler/icons-react";
import {motion} from "framer-motion";
import {fetchNumberOfClients, fetchNumberOfProjects, fetchNumberOfUsers, fetchNumberOfMentors} from "@/lib/api";
import React, {useEffect} from "react";
import {useAuth} from '@/app/context/AuthContext';
import {useRouter} from "next/navigation";
import ProtectedRoute from "@/app/components/ProtectedRoute";


export default function Home() {
    const [numberOfClients, setNumberOfClients] = React.useState(0);
    const [numberOfProjects, setNumberOfProjects] = React.useState(0);
    const [numberOfMentors, setNumberOfMentors] = React.useState(0);
    /*
        const [numberOfProspects, setNumberOfProspects] = React.useState(0);
    */
    const [numberOfUsers, setNumberOfUsers] = React.useState(0);
    const {authenticated} = useAuth();
    const router = useRouter();


    useEffect(() => {
        if (!authenticated) {
            router.push('/login');
        }
        fetchNumberOfUsers().then((data) => {
            setNumberOfUsers(data);
        });
        fetchNumberOfMentors().then((data) => {
            setNumberOfMentors(data);
        });

        /*fetchNumberOfProspects().then((data) => {
            setNumberOfProspects(data);
        });*/
        fetchNumberOfClients().then((data) => {
            setNumberOfClients(data);
        });
        fetchNumberOfProjects().then((data) => {
            setNumberOfProjects(data);
        });
    }, [authenticated, router]);

    useLenis();
    const gridItems = [
        {
            id: 1,
            number: numberOfClients,
            icon: <IconUsers
                className={'group-hover:!text-green-200 !text-zinc-200 transition-all ease-in-out duration-300 group-hover:!-translate-y-[5px]'}
                size={24}/>,
            title: 'Clients',
            link: '/clients',
            description: 'Manage your clients'
        },
        {
            id: 2,
            number: 0,
            icon: <IconMagnet size={24}
                              className={'group-hover:!text-green-200 !text-zinc-200 transition-all ease-in-out duration-300 group-hover:!-translate-y-[5px]'}/>,
            title: 'Prospects',
            link: '/prospects',
            description: 'Manage your prospects'
        },
        {
            id: 3,
            number: numberOfProjects,
            icon: <IconBuilding size={24}
                                className={'group-hover:!text-green-200 !text-zinc-200 transition-all ease-in-out duration-300 group-hover:!-translate-y-[5px]'}/>,
            title: 'Projects',
            link: '/projects',
            description: 'Manage your projects'
        },
        {
            id: 4,
            icon: <IconMail size={24}
                            className={'group-hover:!text-green-200 !text-zinc-200 transition-all ease-in-out duration-300 group-hover:!-translate-y-[5px]'}/>,
            number: 0,
            title: 'Newsletters',
            link: '/newsletters',
            description: 'Manage your newsletters'
        },
        {
            id: 5,
            number: numberOfUsers,
            icon: <IconUser size={24}
                            className={'group-hover:!text-green-200 !text-zinc-200 transition-all ease-in-out duration-300 group-hover:!-translate-y-[5px]'}/>,
            title: 'Users',
            link: '/users',
            description: 'Manage users'
        },
        {
            id: 6,
            number: numberOfMentors,
            icon: <IconBrain size={24}
                             className={'group-hover:!text-green-200 !text-zinc-200 transition-all ease-in-out duration-300 group-hover:!-translate-y-[5px]'}/>,
            title: 'Mentors',
            link: '/mentors',
            description: 'Contact mentors'
        },

    ];
    return (
        <ProtectedRoute>
            <div className="flex flex-col gap-[32px] items-center justify-center min-h-screen p-24 text-center">
                <main>
                    <div
                        className={"!text-zinc-200 !mt-32 z-10 flex flex-col gap-16 items-center justify-center w-11/12 h-full "}>
                        <h1>Here, you can <span className={'italic !text-green-200'}>handle </span><br/>your <span
                            className={'italic !text-green-200'}>Freelance activity</span>
                        </h1>
                        <div
                            className={'flex sm:flex-row flex-col flex-wrap items-center justify-start w-fit h-full gap-1 p-0'}>
                            {gridItems.map((item, index) => (
                                <motion.div
                                    onClick={() => {
                                        window.location.href = item.link;
                                    }}
                                    initial={{opacity: 0, y: 10}}
                                    animate={{opacity: 1, y: 0}}
                                    transition={{duration: 1, delay: index * 0.1, ease: "easeInOut"}}
                                    key={item.id}
                                    className="group bg-zinc-950 lg:w-[250px] h-[200px] border border-zinc-800 hover:border-green-200 !py-4 !px-8 rounded-lg shadow-md shadow-zinc-950 items-center justify-center flex flex-col transition-all ease-in-out duration-300 hover:bg-zinc-900 cursor-pointer hover:-translate-y-[5px] hover:shadow-md hover:shadow-zinc-800">
                                    {item.icon}

                                    <h2 className="text-lg font-bold !text-zinc-200 group-hover:!text-green-200">{item.title}</h2>
                                    <p className={"text-sm text-green-200"}>{item.description}</p>
                                    {item.number !== undefined && (
                                        <p className={`!text-2xl font-bold ${item.number > 0 ? "!text-green-200" : "!text-fuchsia-300"}`}>
                                            {item.number}
                                        </p>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </main>
            </div>
        </ProtectedRoute>
    );
}
