"use client";
import React, {useEffect} from "react";
import {usePathname} from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {LoginBtn} from "@/app/components/buttons/loginBtn";
import {motion} from "framer-motion";
import {useAuth} from '@/app/context/AuthContext';
import {
    IconBrain,
    IconBuilding,
    IconLayout,
    IconLogout,
    IconMagnet,
    IconMail,
    IconUser,
    IconUsers
} from "@tabler/icons-react";
import {useRouter} from "next/navigation";
import {fetchUserById} from "@/lib/api";

interface User {
    id: number;
    username: string;
    email: string;
    profile_picture: {
        url: string;
    }
    confirmed: boolean;
    blocked: boolean;
    // Add other user properties as needed
}

export const Header = () => {
    const links = [
        {name: "dashboard", path: "/", icon: <IconLayout size={16} stroke={1}/>},
        {name: "clients", path: "/clients", icon: <IconUsers size={16} stroke={1}/>},
        {name: "prospects", path: "/prospects", icon: <IconMagnet size={16} stroke={1}/>},
        {name: "projects", path: "/projects", icon: <IconBuilding size={16} stroke={1}/>},
        {name: "mentors", path: "/mentors", icon: <IconBrain size={16} stroke={1}/>},

        {name: "newsletters", path: "/newsletters", icon: <IconMail size={16} stroke={1}/>},
    ];
    const [user_, setUser_] = React.useState<User | null>(null);
    const [profilePictureUrl, setProfilePictureUrl] = React.useState<string | null>(null);

    const router = useRouter();
    const {authenticated} = useAuth();
    const {logout} = useAuth();
    const {user} = useAuth();


    const pathname = usePathname();
    const isActive = (path: string) => pathname === path;

    const handleLogout = () => {
        logout();
        router.push('/login'); // redirige vers la page login
    };

    useEffect(() => {
        const userLocalStorage = localStorage.getItem('user');
        if (userLocalStorage) {
            const parsedUser = JSON.parse(userLocalStorage);
            setUser_(parsedUser[0]);
        }
        if (user_ && user_.id) {
            console.log("Fetching user by ID:", user_.id);
            fetchUserById(user_.id).then((data) => {
                    console.log("Fetched user data:", data);
                    setProfilePictureUrl(process.env.NEXT_PUBLIC_STRAPI_URL + data[0].profile_picture.url);
                    setUser_(data[0]);
                }
            ).catch((error) => {
                console.error("Failed to fetch user by ID:", error);
            });
        }
        /* }
 */
    }, [profilePictureUrl, user]);

    return (
        <motion.div
            initial={{opacity: 0, y: -10}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.5, ease: "easeInOut"}}
            className="z-[199] fixed top-8 left-1/2 -translate-x-1/2 flex flex-col w-full h-fit items-center justify-center"
        >
            <header
                className="z-[199] flex  h-fit flex-row w-11/12 backdrop-blur-xl !p-4 border border-zinc-700 rounded-full gap-16 items-center justify-between text-white">
                <div className="flex items-center gap-4 justify-center">
                    <Link href="/" className="flex items-center">
                        <Image
                            src="/images/logo/eclipse-logo.png"
                            alt="Logo"
                            width={40}
                            height={40}
                        />
                    </Link>
                </div>
                <nav className={'lg:flex flex-row gap-8 hidden w-full  h-fit items-center justify-between'}>
                    <ul className="flex w-fit flex-row items-center gap-8">
                        {links.map((link, index) => (
                            <motion.li
                                initial={{opacity: 0, y: -10}}
                                animate={{opacity: 1, y: 0}}
                                transition={{duration: 0.5, delay: 0.15 * index, ease: "easeInOut"}}
                                className={`!flex !flex-row gap-1 items-center justify-center ${
                                    isActive(link.path) ? "text-green-200  items-center justify-center gap-2  !px-2 border border-green-200" : "text-zinc-200"
                                } hover:text-green-200 uppercase !text-sm`} key={link.name}>
                                {link.icon && (
                                    <span>
                                            {link.icon}
                                        </span>
                                )}
                                <Link
                                    href={link.path}
                                >{link.name}
                                </Link>

                            </motion.li>
                        ))}
                    </ul>
                    {!authenticated ? (
                        <LoginBtn/>
                    ) : (
                        <div className={'flex flex-row items-center justify-center w-fit gap-4'}>
                            <div className={'flex flex-row items-center justify-center w-fit gap-4'}>
                                {profilePictureUrl ? (
                                    <div
                                        className={'flex w-10 h-10 cursor-pointer hover:scale-[1.05] hover:border-green-200 transition-all ease-in-out duration-300 border-orange-300 border-2 rounded-full relative overflow-hidden'}>
                                        <Image
                                            alt={"user profile picture"}
                                            src={`${profilePictureUrl}`}
                                            fill
                                            style={{objectFit: "cover"}}
                                        />
                                    </div>
                                ) : (
                                    <IconUser
                                        className={'flex w-10 h-10 cursor-pointer hover:scale-[1.05] hover:border-green-200 transition-all ease-in-out duration-300 border-orange-300 border-2 rounded-full relative overflow-hidden'}
                                        size={40}
                                    />
                                )}
                                {user_ && (
                                    <p id={"header"}>{user_.username}</p>
                                )}
                            </div>
                            <IconLogout
                                onClick={handleLogout}
                                className={'group-hover:!text-green-200 cursor-pointer hover:scale-[1.1] !text-zinc-200 transition-all ease-in-out duration-300 group-hover:!-translate-y-[5px]'}
                                size={24}/>
                        </div>
                    )}
                </nav>


            </header>
        </motion.div>
    );

}
