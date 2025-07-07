import { motion } from 'framer-motion';
import { IconCheck, IconX } from '@tabler/icons-react';

const PopupMessage = ({
  message,
  type,
  confirmation,
}: {
  message: string;
  type: string;
  confirmation: boolean;
}) => {
  if (confirmation) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 100, scale: 0.5 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -100, scale: 0.5 }}
        transition={{ duration: 0.5 }}
        className="fixed left-1/2 bottom-2 -translate-x-1/2 z-[1000] !text-black flex flex-col lg:w-fit w-11/12 py-2 h-fit justify-center items-center px-4 rounded-xl bg-white"
      >
        <p className="!text-black">{message}</p>
        <div className="flex gap-4 mt-4">
          <button className="bg-emerald-300/10   !text-emerald-300 font-bold py-2 px-4 rounded-2xl hover:rounded-sm transition-all ease-in-out delay-50">
            YES
          </button>
          <button className="bg-red-800/10 !text-zinc-200 font-bold py-2 px-4 rounded-2xl hover:rounded-sm transition-all ease-in-out delay-50">
            NO
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.5 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.5 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
      className={`fixed lg:right-8 right-0 lg:-translate-x-0 lg:bottom-8 top-8  z-[1000] !text-black flex flex-col lg:m-0 m-4 w-11/12 flex-wrap lg:w-fit   h-fit justify-center items-center px-4 py-2 rounded-lg backdrop-blur-xl overflow-hidden ${
        type === 'success'
          ? '!bg-emerald-300/20 !border border-emerald-300'
          : '!bg-red-800/20 !border border-red-800'
      }`}
    >
      {/* Barre de progression */}
      <motion.div
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: 2.5, ease: 'linear' }}
        className={`absolute top-0 left-0 h-1 ${
          type === 'success' ? 'bg-emerald-300' : 'bg-red-500'
        }`}
      />

      <p
        className={`flex flex-row items-center gap-2 ${type === 'success' ? '!text-emerald-300' : '!text-zinc-200'}`}
      >
        {type === 'success' ? (
          <IconCheck
            size={20}
            className="!text-emerald-300 rounded-full bg-emerald-300/20 p-1"
          />
        ) : (
          <IconX
            size={20}
            className="!text-zinc-200 rounded-full bg-red-800/20 p-1"
          />
        )}
        {message}
      </p>
    </motion.div>
  );
};

export default PopupMessage;
