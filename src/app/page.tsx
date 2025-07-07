'use client';
import useLenis from '@/utils/useLenis';
import { motion } from 'framer-motion';
import React from 'react';

import Image from 'next/image';
import { TryBtn } from './components/buttons/tryBtn';

export default function Home() {
  useLenis();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center">
      <Image
        src="/images/background.jpg"
        alt="background"
        width={1000}
        height={1000}
        className="absolute top-0 left-0 w-full h-full object-cover opacity-20"
      />
      <div
        className={
          '!text-zinc-200 z-10 flex flex-col gap-16 items-center justify-center w-full p-4  h-full '
        }
      >
        <div
          className={
            'flex flex-col gap-8 items-center justify-center w-1/2 font-bold h-fit tracking-tighter gap-4'
          }
        >
          <motion.h1
            initial={{ opacity: 0, y: '20%' }}
            animate={{ opacity: 1, y: 1 }}
            transition={{ duration: 0.6, ease: 'easeInOut', delay: 0.1 }}
            className="flex flex-col items-center justify-center gap-2"
          >
            <motion.span
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 1 }}
              transition={{ duration: 0.6, ease: 'easeInOut', delay: 0.2 }}
              className="text-xl text-zinc-200 font-light"
            >
              Handle your freelance activity{' '}
            </motion.span>
            manage your projects{' '}
            <motion.span
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 1 }}
              transition={{ duration: 0.6, ease: 'easeInOut', delay: 0.3 }}
              className="bg-emerald-300/20 backdrop-blur-xs py-2 px-4 rounded-full text-green-200 font-extrabold shadow-md shadow-emerald-300/20"
            >
              with ease
            </motion.span>
          </motion.h1>

          <TryBtn />
        </div>
        {/* <div
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
                                    className="group bg-zinc-950 lg:w-[250px] h-[200px] border border-zinc-800 hover:border-green-200 !p-2 rounded-lg shadow-md items-center justify-center flex flex-col transition-all ease-in-out duration-300 hover:bg-zinc-900 cursor-pointer hover:-translate-y-[5px] hover:shadow-md hover:shadow-zinc-800">

                                    <div
                                        className={'flex flex-col items-start justify-start gap-2 w-full h-full rounded-sm'}>
                                        <video
                                            autoPlay
                                            loop
                                            muted
                                            className={'rounded-sm w-full h-full object-cover'}>
                                            <source src={item.videoSrc} type="video/mp4"/>
                                            Your browser does not support the video tag.
                                        </video>
                                    </div>
                                    {item.number !== undefined && (
                                        <div
                                            className={'flex flex-row items-center justify-between gap-2 w-full h-full !px-4'}>

                                            <div className={'flex flex-row items-center justify-start gap-2'}>
                                                <h2 className="!text-sm !font-light !text-zinc-200 group-hover:!text-green-200">{item.title}</h2>
                                            </div>
                                            <p className={`!text-2xl font-bold ${item.number > 0 ? "!text-green-200" : "!text-fuchsia-300"}`}>
                                                {item.number}
                                            </p>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </div>*/}
      </div>
    </main>
  );
}
