'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconCheck,
  IconX,
  IconSearch,
  IconTrash,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { useModalScroll } from '@/hooks/useModalFocus';

interface QuotaExceededModalProps<T> {
  isOpen: boolean;
  onClose: () => void;
  items: T[];
  quota: number;
  entityName: string; // 'clients', 'projects', 'prospects', etc.
  getItemId: (item: T) => string;
  getItemName: (item: T) => string;
  getItemSubtitle?: (item: T) => string;
  onConfirmSelection: (itemsToKeep: T[], itemsToRemove: T[]) => Promise<void>;
  renderItemIcon?: (item: T) => React.ReactNode;
}

export default function QuotaExceededModal<T>({
  isOpen,
  onClose,
  items,
  quota,
  entityName,
  getItemId,
  getItemName,
  getItemSubtitle,
  onConfirmSelection,
  renderItemIcon,
}: QuotaExceededModalProps<T>) {
  const { t } = useLanguage();
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Bloquer le scroll du body quand la modale est ouverte
  useModalScroll(isOpen);

  const exceededCount = items.length - quota;
  const mustRemove = exceededCount;

  // Initialiser avec les premiers items sélectionnés par défaut (jusqu'au quota)
  useEffect(() => {
    if (isOpen && items.length > 0 && quota > 0) {
      const initialSelection = new Set(
        items.slice(0, quota).map(item => getItemId(item))
      );
      setSelectedItems(initialSelection);
    }
  }, [isOpen, items, quota, getItemId]);

  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    return items.filter(item =>
      getItemName(item).toLowerCase().includes(searchTerm.toLowerCase()) ||
      (getItemSubtitle && getItemSubtitle(item)?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [items, searchTerm, getItemName, getItemSubtitle]);

  const toggleItem = (itemId: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      // Ne pas permettre de sélectionner plus que le quota
      if (newSelection.size < quota) {
        newSelection.add(itemId);
      }
    }
    setSelectedItems(newSelection);
  };

  const selectAll = () => {
    // Sélectionner les premiers jusqu'au quota
    const newSelection = new Set(
      filteredItems.slice(0, quota).map(item => getItemId(item))
    );
    setSelectedItems(newSelection);
  };

  const deselectAll = () => {
    setSelectedItems(new Set());
  };

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      const itemsToKeep = items.filter(item => selectedItems.has(getItemId(item)));
      const itemsToRemove = items.filter(item => !selectedItems.has(getItemId(item)));
      await onConfirmSelection(itemsToKeep, itemsToRemove);
      onClose();
    } catch (error) {
      console.error('Error processing quota selection:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const remainingToSelect = quota - selectedItems.size;
  const canConfirm = selectedItems.size === quota;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="card p-6 w-full max-w-2xl max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-start gap-4 mb-6">
            <div className="p-2  bg-muted">
              <img 
                src="/images/logo/eclipse-logo.png" 
                alt="Eclipse Logo" 
                className="w-10 h-10 object-contain"
              />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold !text-primary">
                {t('quota_exceeded_title') || 'Quota dépassé'}
              </h2>
              <p className="text-muted mt-1">
                {t('quota_exceeded_description') || 'Votre plan a changé. Vous avez'}{' '}
                <span className="font-bold !text-danger">{items.length}</span>{' '}
                {entityName} {t('but_your_limit_is') || 'mais votre limite est de'}{' '}
                <span className="font-bold !text-accent">{quota}</span>.
              </p>
              <p className="text-sm !text-muted mt-2">
                {t('select_items_to_keep') || 'Sélectionnez les éléments à conserver. Les autres seront désactivés.'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2  hover:bg-hover transition-colors"
              disabled={isProcessing}
            >
              <IconX className="w-5 h-5 !text-muted" />
            </button>
          </div>

          {/* Stats bar */}
          <div className="flex items-center justify-between gap-4 p-3  bg-muted/10 mb-4">
            <div className="flex items-center gap-4 !text-sm">
              <span className="text-muted">
                {t('selected') || 'Sélectionnés'}: <span className={`font-bold ${canConfirm ? 'text-success' : 'text-warning'}`}>{selectedItems.size}</span> / {quota}
              </span>
              {remainingToSelect > 0 && (
                <span className="text-warning">
                  {t('remaining_to_select') || 'Encore'} {remainingToSelect} {t('to_select') || 'à sélectionner'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={selectAll}
                className="!text-xs px-2 py-1 rounded bg-accent-light !text-accent hover:bg-accent-light transition-colors"
              >
                {t('select_first') || `Sélectionner les ${quota} premiers`}
              </button>
              <button
                onClick={deselectAll}
                className="!text-xs px-2 py-1 rounded bg-muted/20 !text-muted hover:bg-muted/30 transition-colors"
              >
                {t('deselect_all') || 'Tout désélectionner'}
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 !text-muted" />
            <input
              type="text"
              placeholder={t('search') || 'Rechercher...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input w-full !pl-10"
            />
          </div>

          {/* Items list */}
          <div className="flex-1 overflow-y-auto space-y-2 min-h-[200px] max-h-[400px]">
            {filteredItems.map((item) => {
              const itemId = getItemId(item);
              const isSelected = selectedItems.has(itemId);
              const canSelect = isSelected || selectedItems.size < quota;

              return (
                <motion.div
                  key={itemId}
                  layout
                  className={`
                    flex items-center gap-3 p-3  border transition-all cursor-pointer
                    ${isSelected 
                      ? 'bg-page border-muted' 
                      : canSelect 
                        ? 'bg-card border-default hover:bg-accent-light' 
                        : 'bg-muted border-muted opacity-50 cursor-not-allowed'
                    }
                  `}
                  onClick={() => canSelect && toggleItem(itemId)}
                >
                  {/* Checkbox */}
                  <div className={`
                    w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                    ${isSelected 
                      ? 'bg-success border-success' 
                      : 'border-muted'
                    }
                  `}>
                    {isSelected && <IconCheck className="w-3 h-3 !text-white" />}
                  </div>

                  {/* Icon */}
                  {renderItemIcon && (
                    <div className="flex-shrink-0">
                      {renderItemIcon(item)}
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${isSelected ? 'text-success' : 'text-primary'}`}>
                      {getItemName(item)}
                    </p>
                    {getItemSubtitle && (
                      <p className="!text-xs !text-muted truncate">
                        {getItemSubtitle(item)}
                      </p>
                    )}
                  </div>

                  {/* Status indicator */}
                  {!isSelected && (
                    <div className="flex items-center gap-1 !text-xs !text-danger">
                      <IconTrash className="w-4 h-4" />
                      <span>{t('will_be_deactivated') || 'Sera désactivé'}</span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-4 mt-6 pt-4 border-t border-muted">
            <p className="text-sm !text-muted">
              <span className="text-danger font-medium">{mustRemove}</span> {entityName}{' '}
              {t('will_be_deactivated_plural') || 'seront désactivés'}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                disabled={isProcessing}
                className="btn-secondary px-4 py-2 "
              >
                {t('cancel') || 'Annuler'}
              </button>
              <button
                onClick={handleConfirm}
                disabled={!canConfirm || isProcessing}
                className="flex items-center gap-2 px-4 py-2 bg-accent !text-white  hover:bg-[var(--color-accent)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-muted border-t-muted rounded-full animate-spin" />
                    {t('processing') || 'Traitement...'}
                  </>
                ) : (
                  <>
                    <IconCheck className="w-4 h-4" />
                    {t('confirm_selection') || 'Confirmer la sélection'}
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

