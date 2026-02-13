'use client';

import { IconBuilding, IconFileInvoice, IconTransform } from '@tabler/icons-react';
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';

interface TableActionsProps {
  onEdit?: () => void;
  onDelete?: () => void;
  onView?: () => void;
  onFactures?: () => void;
  onProjects?: () => void;
  onConvert?: () => void;
  convertLabel?: string;
  className?: string;
}

export default function TableActions({
  onEdit,
  onDelete,
  onView,
  onFactures,
  onProjects,
  onConvert,
  convertLabel,
  className = '',
}: TableActionsProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = useState({
    top: 0,
    left: 0,
    maxHeight: 320,
    placeAbove: false,
  });
  const { t } = useLanguage();
  // Fermer le menu au clic en dehors
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const targetNode = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(targetNode) &&
        menuRef.current &&
        !menuRef.current.contains(targetNode)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const updateMenuPosition = useCallback(() => {
    const button = buttonRef.current;
    const menu = menuRef.current;
    if (!button || !menu) return;

    const buttonRect = button.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const spaceBelow = viewportHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;
    const placeAbove = spaceBelow < menuRect.height + 12 && spaceAbove > spaceBelow;

    let top = placeAbove ? buttonRect.top - menuRect.height - 8 : buttonRect.bottom + 8;
    let left = buttonRect.left - menuRect.width - 8; // left of the button

    // Clamp within viewport
    left = Math.max(8, Math.min(left, viewportWidth - menuRect.width - 8));
    top = Math.max(8, Math.min(top, viewportHeight - menuRect.height - 8));

    const maxHeight = placeAbove ? Math.min(spaceAbove - 12, 360) : Math.min(spaceBelow - 12, 360);

    setMenuPosition({
      top,
      left,
      maxHeight: Math.max(160, maxHeight),
      placeAbove,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleResize = () => updateMenuPosition();
    const handleScroll = () => updateMenuPosition();

    requestAnimationFrame(updateMenuPosition);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [open, updateMenuPosition]);

  return (
    <div className={`relative flex items-center cursor-pointer ${className}`} ref={containerRef}>
      <button
        onClick={e => {
          e.stopPropagation();
          setOpen(o => !o);
        }}
        className="p-2 rounded hover:bg-hover focus:outline-none focus:ring-1 focus:ring-accent"
        title="Actions"
        type="button"
        ref={buttonRef}
      >
        <svg
          className="w-5 h-5 !text-muted"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="5" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="12" cy="19" r="1.5" />
        </svg>
      </button>
      {open && (
        <div
          ref={menuRef}
          className="fixed  z-[1000] p-2 w-fit bg-card border border-default shadow-lg py-1 animate-fade-in overflow-y-auto"
          style={{
            top: menuPosition.top,
            left: menuPosition.left,
            maxHeight: menuPosition.maxHeight,
          }}
        >
          {onView && (
            <button
              onClick={e => {
                e.stopPropagation();
                setOpen(false);
                onView();
              }}
              className="m-1  w-full cursor-pointer flex items-center gap-2 px-4 py-2 !text-sm !text-primary hover:bg-hover hover:!text-accent transition-colors"
              type="button"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              {t('view')}
            </button>
          )}
          {onEdit && (
            <button
              onClick={e => {
                e.stopPropagation();
                setOpen(false);
                onEdit();
              }}
              className="m-1  w-full cursor-pointer flex items-center gap-2 px-4 py-2 !text-sm !text-primary hover:bg-hover hover:!text-accent transition-colors"
              type="button"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
              {t('edit')}
            </button>
          )}

          {onFactures && (
            <button
              onClick={e => {
                e.stopPropagation();
                setOpen(false);
                onFactures();
              }}
              className="m-1  w-full cursor-pointer flex items-center gap-2 px-4 py-2 !text-sm !text-primary hover:bg-hover hover:!text-accent transition-colors"
              type="button"
            >
              <IconFileInvoice className="w-4 h-4" />
              {t('factures')}
            </button>
          )}
          {onProjects && (
            <button
              onClick={e => {
                e.stopPropagation();
                setOpen(false);
                onProjects();
              }}
              className="m-1  w-full cursor-pointer flex items-center gap-2 px-4 py-2 !text-sm !text-primary hover:bg-hover hover:!text-accent transition-colors"
              type="button"
            >
              <IconBuilding className="w-4 h-4" />
              {t('projects_list')}
            </button>
          )}
          {onConvert && (
            <button
              onClick={e => {
                e.stopPropagation();
                setOpen(false);
                onConvert();
              }}
              className="m-1  w-full cursor-pointer flex items-center gap-2 px-4 py-2 !text-sm !text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 hover:!text-green-700 dark:hover:!text-green-400 transition-colors"
              type="button"
            >
              <IconTransform className="w-4 h-4" />
              {convertLabel || t('convert_to_invoice')}
            </button>
          )}
          {onDelete && (
            <button
              onClick={e => {
                e.stopPropagation();
                setOpen(false);
                onDelete();
              }}
              className="m-1  w-full cursor-pointer flex items-center gap-2 px-4 py-2 !text-sm !text-danger hover:bg-danger-light hover:!text-danger transition-colors"
              type="button"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              {t('delete')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
