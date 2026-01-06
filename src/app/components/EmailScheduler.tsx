'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { IconClock, IconCheck, IconAlertTriangle } from '@tabler/icons-react';

interface EmailSchedulerProps {
  onSchedule: (scheduledAt: Date | null) => void;
  initialDate?: Date | null;
  disabled?: boolean;
}

export default function EmailScheduler({ onSchedule, initialDate, disabled }: EmailSchedulerProps) {
  const [isScheduled, setIsScheduled] = useState(!!initialDate);
  const [scheduledDate, setScheduledDate] = useState<string>(
    initialDate ? formatDateForInput(initialDate) : ''
  );
  const [scheduledTime, setScheduledTime] = useState<string>(
    initialDate ? formatTimeForInput(initialDate) : ''
  );

  function formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  function formatTimeForInput(date: Date): string {
    return date.toTimeString().slice(0, 5);
  }

  function getMinDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  function getMinTime(): string {
    const now = new Date();
    const selectedDate = new Date(scheduledDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    
    if (selectedDate.getTime() === today.getTime()) {
      // Si c'est aujourd'hui, on ne peut pas programmer dans le passé
      return now.toTimeString().slice(0, 5);
    }
    return '00:00';
  }

  function handleToggle(enabled: boolean) {
    setIsScheduled(enabled);
    if (!enabled) {
      setScheduledDate('');
      setScheduledTime('');
      onSchedule(null);
    }
  }

  function handleDateTimeChange(date: string, time: string) {
    setScheduledDate(date);
    setScheduledTime(time);
    
    if (date && time) {
      const scheduledAt = new Date(`${date}T${time}`);
      if (scheduledAt > new Date()) {
        onSchedule(scheduledAt);
      }
    }
  }

  // Suggestions de dates rapides
  const quickScheduleOptions = [
    { label: 'Dans 1 heure', hours: 1 },
    { label: 'Dans 3 heures', hours: 3 },
    { label: 'Demain 9h', type: 'tomorrow9' as const },
    { label: 'Demain 14h', type: 'tomorrow14' as const },
    { label: 'Lundi prochain 9h', type: 'nextMonday' as const },
  ];

  function applyQuickSchedule(option: typeof quickScheduleOptions[0]) {
    const now = new Date();
    let targetDate: Date;

    if ('hours' in option && typeof option.hours === 'number') {
      targetDate = new Date(now.getTime() + option.hours * 60 * 60 * 1000);
    } else if (option.type === 'tomorrow9') {
      targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + 1);
      targetDate.setHours(9, 0, 0, 0);
    } else if (option.type === 'tomorrow14') {
      targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + 1);
      targetDate.setHours(14, 0, 0, 0);
    } else if (option.type === 'nextMonday') {
      targetDate = new Date(now);
      const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
      targetDate.setDate(targetDate.getDate() + daysUntilMonday);
      targetDate.setHours(9, 0, 0, 0);
    } else {
      return;
    }

    setScheduledDate(formatDateForInput(targetDate));
    setScheduledTime(formatTimeForInput(targetDate));
    setIsScheduled(true);
    onSchedule(targetDate);
  }

  const isValidSchedule = scheduledDate && scheduledTime && 
    new Date(`${scheduledDate}T${scheduledTime}`) > new Date();

  return (
    <div className="bg-card rounded-xl p-5 border border-default hover:border-accent/30 transition-all duration-300 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
            <IconClock className="w-5 h-5 text-warning" />
          </div>
          <div>
            <h3 className="text-primary font-medium">Planifier l&apos;envoi</h3>
            <p className="text-muted text-sm">Programmer l&apos;envoi pour plus tard</p>
          </div>
        </div>
        
        <button
          onClick={() => !disabled && handleToggle(!isScheduled)}
          disabled={disabled}
          className={`relative w-12 h-6 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            isScheduled ? 'bg-accent' : 'bg-gray-300 dark:bg-gray-600'
          }`}
        >
          <div 
            className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
              isScheduled ? 'left-7' : 'left-1'
            }`}
          />
        </button>
      </div>

      <AnimatePresence>
        {isScheduled && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 overflow-hidden"
          >
            {/* Quick options */}
            <div className="flex flex-wrap gap-2">
              {quickScheduleOptions.map((option, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => applyQuickSchedule(option)}
                  disabled={disabled}
                  className="px-3 py-1.5 text-xs bg-muted text-secondary rounded-lg hover:bg-hover hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-default"
                >
                  {option.label}
                </button>
              ))}
            </div>

            {/* Date/Time inputs */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-muted mb-1">Date</label>
                <input
                  type="date"
                  value={scheduledDate}
                  min={getMinDate()}
                  onChange={(e) => handleDateTimeChange(e.target.value, scheduledTime)}
                  disabled={disabled}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Heure</label>
                <input
                  type="time"
                  value={scheduledTime}
                  min={getMinTime()}
                  onChange={(e) => handleDateTimeChange(scheduledDate, e.target.value)}
                  disabled={disabled}
                  className="input w-full"
                />
              </div>
            </div>

            {/* Preview - Success */}
            {isValidSchedule && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-3 bg-success/10 border border-success/30 rounded-lg"
              >
                <IconCheck className="w-5 h-5 text-success" />
                <span className="text-success text-sm">
                  Envoi programmé le{' '}
                  <strong>
                    {new Date(`${scheduledDate}T${scheduledTime}`).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </strong>
                  {' '}à{' '}
                  <strong>{scheduledTime}</strong>
                </span>
              </motion.div>
            )}

            {/* Preview - Error */}
            {scheduledDate && scheduledTime && !isValidSchedule && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-3 bg-danger/10 border border-danger/30 rounded-lg"
              >
                <IconAlertTriangle className="w-5 h-5 text-danger" />
                <span className="text-danger text-sm">
                  La date/heure doit être dans le futur
                </span>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

