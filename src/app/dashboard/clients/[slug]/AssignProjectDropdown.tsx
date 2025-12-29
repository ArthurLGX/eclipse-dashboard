'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconFolderPlus,
  IconChevronDown,
  IconFolder,
  IconPlus,
  IconLoader2,
  IconCheck,
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

interface Project {
  id: number;
  documentId: string;
  title: string;
  type: string;
  project_status: string;
}

interface AssignProjectDropdownProps {
  unassignedProjects: Project[];
  onAssign: (projectId: number) => Promise<void>;
  loading: boolean;
  t: (key: string) => string;
}

export default function AssignProjectDropdown({
  unassignedProjects,
  onAssign,
  loading,
  t,
}: AssignProjectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [assigningId, setAssigningId] = useState<number | null>(null);
  const [successId, setSuccessId] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Fermer le dropdown si on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAssign = async (projectId: number) => {
    setAssigningId(projectId);
    try {
      await onAssign(projectId);
      setSuccessId(projectId);
      setTimeout(() => {
        setIsOpen(false);
        setSuccessId(null);
      }, 800);
    } catch {
      // L'erreur est gérée par le parent
    } finally {
      setAssigningId(null);
    }
  };

  const handleCreateNew = () => {
    setIsOpen(false);
    router.push('/dashboard/projects?new=1');
  };

  const getTypeEmoji = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'development': return '💻';
      case 'design': return '🎨';
      case 'marketing': return '📣';
      case 'consulting': return '💼';
      default: return '📁';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-emerald-400';
      case 'in_progress': return 'text-yellow-400';
      case 'pending': return 'text-blue-400';
      default: return 'text-zinc-400';
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bouton principal */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2.5 rounded-lg font-semibold 
          hover:from-blue-400 hover:to-blue-500 transition-all duration-200 
          shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40
          flex items-center gap-2 disabled:opacity-50"
      >
        {loading ? (
          <IconLoader2 size={20} className="animate-spin" />
        ) : (
          <IconFolderPlus size={20} />
        )}
        {t('assign_project') || 'Assigner un projet'}
        <IconChevronDown 
          size={18} 
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Dropdown menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-2 w-80 bg-zinc-900 border border-zinc-700 rounded-xl 
              shadow-xl shadow-black/50 z-50 flex flex-col"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-zinc-700/50 bg-zinc-800/50 flex-shrink-0">
              <p className="text-sm font-medium text-zinc-300">
                {t('choose_project') || 'Choisir un projet'}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {unassignedProjects.length} {t('projects_available') || 'projet(s) disponible(s)'}
              </p>
            </div>

            {/* Liste des projets - scrollable */}
            <div className="max-h-48 overflow-y-hidden flex-shrink-0 z-[100]">
              {unassignedProjects.length === 0 ? (
                <div className="px-4 flex lg:flex-row flex-col gap-2 items-center justify-center py-6 text-center">
                  <IconFolder size={32} className="text-zinc-600" />
                  <p className="text-zinc-500 !text-sm">
                    {t('no_unassigned_projects') || 'Aucun projet disponible'}
                  </p>
                
                </div>
              ) : (
                unassignedProjects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleAssign(project.id)}
                    disabled={assigningId !== null}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-zinc-800 
                      transition-colors text-left border-b border-zinc-800 last:border-b-0
                      disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="text-lg">{getTypeEmoji(project.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-zinc-200 font-medium truncate">{project.title}</p>
                      <p className={`text-xs ${getStatusColor(project.project_status)}`}>
                        {project.project_status === 'completed' && '✓ Terminé'}
                        {project.project_status === 'in_progress' && '◐ En cours'}
                        {project.project_status === 'pending' && '○ En attente'}
                        {project.project_status === 'draft' && '○ Brouillon'}
                      </p>
                    </div>
                    {assigningId === project.id ? (
                      <IconLoader2 size={18} className="text-blue-400 animate-spin" />
                    ) : successId === project.id ? (
                      <IconCheck size={18} className="text-emerald-400" />
                    ) : (
                      <IconPlus size={18} className="text-zinc-500" />
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Footer - Créer un nouveau projet (toujours visible) */}
            <div className="border-t border-zinc-700/50 bg-zinc-800/30 flex-shrink-0">
              <button
                onClick={handleCreateNew}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-zinc-800/50 
                  transition-colors text-left group"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 
                  flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                  <IconPlus size={18} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-emerald-400 font-medium text-sm">
                    {t('create_new_project') || 'Créer un nouveau projet'}
                  </p>
                  <p className="text-zinc-600 text-xs">
                    {t('go_to_projects_page') || 'Aller à la page projets'}
                  </p>
                </div>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

