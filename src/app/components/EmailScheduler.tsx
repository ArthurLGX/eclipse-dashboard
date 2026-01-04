'use client';

import { useState } from 'react';

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
    <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-white font-medium">Planifier l&apos;envoi</h3>
            <p className="text-gray-400 text-sm">Programmer l&apos;envoi pour plus tard</p>
          </div>
        </div>
        
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={isScheduled}
            onChange={(e) => handleToggle(e.target.checked)}
            disabled={disabled}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
        </label>
      </div>

      {isScheduled && (
        <div className="space-y-4 animate-fadeIn">
          {/* Quick options */}
          <div className="flex flex-wrap gap-2">
            {quickScheduleOptions.map((option, index) => (
              <button
                key={index}
                type="button"
                onClick={() => applyQuickSchedule(option)}
                disabled={disabled}
                className="px-3 py-1.5 text-xs bg-gray-700/50 text-gray-300 rounded-lg hover:bg-gray-600/50 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Date/Time inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Date</label>
              <input
                type="date"
                value={scheduledDate}
                min={getMinDate()}
                onChange={(e) => handleDateTimeChange(e.target.value, scheduledTime)}
                disabled={disabled}
                className="w-full px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Heure</label>
              <input
                type="time"
                value={scheduledTime}
                min={getMinTime()}
                onChange={(e) => handleDateTimeChange(scheduledDate, e.target.value)}
                disabled={disabled}
                className="w-full px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all disabled:opacity-50"
              />
            </div>
          </div>

          {/* Preview */}
          {isValidSchedule && (
            <div className="flex items-center gap-2 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-purple-300 text-sm">
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
            </div>
          )}

          {scheduledDate && scheduledTime && !isValidSchedule && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-red-300 text-sm">
                La date/heure doit être dans le futur
              </span>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}

