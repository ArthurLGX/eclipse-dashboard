'use client';

import React from 'react';
import { motion } from 'framer-motion';
import ProtectedRoute from '@/app/components/ProtectedRoute';
export default function MentorsPage() {
  return (
    <ProtectedRoute>
      <motion.div
        initial={{ opacity: 0, y: 0 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <h1 className="!text-3xl !uppercase font-extrabold text-left !text-zinc-200">
            Mentors
          </h1>
          <button className="bg-green-500 !text-black px-4 py-2 rounded-lg hover:bg-green-400 transition-colors">
            Contacter un mentor
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
            <h3 className="!text-lg font-semibold !text-zinc-200 mb-2">
              Total Mentors
            </h3>
            <p className="!text-3xl font-bold !text-indigo-400">15</p>
          </div>
          <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
            <h3 className="!text-lg font-semibold !text-zinc-200 mb-2">
              Disponibles
            </h3>
            <p className="!text-3xl font-bold !text-green-400">12</p>
          </div>
          <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
            <h3 className="!text-lg font-semibold !text-zinc-200 mb-2">
              Sessions
            </h3>
            <p className="!text-3xl font-bold !text-blue-400">8</p>
          </div>
        </div>

        <div className="bg-zinc-900 rounded-lg border border-zinc-800">
          <div className="p-6 border-b border-zinc-800">
            <h2 className="!text-xl font-semibold !text-zinc-200">
              Liste des mentors
            </h2>
          </div>
          <div className="p-6">
            <p className="!text-zinc-400">
              Liste des mentors disponibles à implémenter...
            </p>
          </div>
        </div>
      </motion.div>
    </ProtectedRoute>
  );
}
