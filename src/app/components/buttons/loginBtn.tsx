"use client";

import React from "react";
import Link from "next/link";
import {IconKey} from "@tabler/icons-react";

export const LoginBtn = () => {

    return (
        <div className="flex w-fit flex-row items-center gap-4">
            <Link
                id="loginBtn"
                href="/login"
                className={`group flex flex-row items-center justify-center gap-2 text-zinc-200 !text-xs capitalize border border-zinc-700 rounded-full bg-zinc-900 hover:bg-zinc-950 !px-4 !py-2  transition-all ease-in-out duration-300 `}
            >
                <span><IconKey size={20} stroke={1}
                               className={'text-zinc-200 group-hover:text-green-200  transition-all ease-in-out duration-300'}/></span><span
                className={'group-hover:!text-green-200'}>Sign In</span>
            </Link>
        </div>
    );
}
