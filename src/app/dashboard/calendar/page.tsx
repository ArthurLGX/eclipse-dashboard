'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  IconCalendar,
  IconPlus,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconMapPin,
  IconPhone,
  IconCalendarEvent,
  IconTrash,
  IconEdit,
  IconCheck,
  IconBell,
  IconBellOff,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';
import { usePopup } from '@/app/context/PopupContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DeleteConfirmModal from '@/app/components/DeleteConfirmModal';
import { 
  fetchCalendarEvents, 
  createCalendarEvent, 
  updateCalendarEvent,
  deleteCalendarEvent,
  completeCalendarEvent,
} from '@/lib/api';
import { useProjects, useClients } from '@/hooks/useApi';
import { useNotifications, scheduleNotification } from '@/hooks/useNotifications';
import type { CalendarEvent, EventType, Project, Client } from '@/types';
import useSWR from 'swr';

const EVENT_COLORS: Record<EventType, string> = {
  meeting: '#6366f1',
  deadline: '#ef4444',
  reminder: '#f59e0b',
  delivery: '#22c55e',
  call: '#3b82f6',
  personal: '#8b5cf6',
};

const EVENT_ICONS: Record<EventType, React.ReactNode> = {
  meeting: <IconCalendarEvent className="w-4 h-4" />,
  deadline: <IconClock className="w-4 h-4" />,
  reminder: <IconClock className="w-4 h-4" />,
  delivery: <IconCheck className="w-4 h-4" />,
  call: <IconPhone className="w-4 h-4" />,
  personal: <IconCalendar className="w-4 h-4" />,
};

export default function CalendarPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { showGlobalPopup } = usePopup();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; event: CalendarEvent | null }>({
    isOpen: false,
    event: null,
  });

  // Notifications
  const { isSupported, permission, requestPermission, sendNotification } = useNotifications();
  const scheduledNotifications = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Fetch data
  const { data: projectsData } = useProjects(user?.id);
  const projects = useMemo(() => (projectsData as Project[]) || [], [projectsData]);
  
  const { data: clientsData } = useClients(user?.id);
  const clients = useMemo(() => (clientsData as Client[]) || [], [clientsData]);

  // Get month range
  const monthRange = useMemo(() => {
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    return { from: start.toISOString(), to: end.toISOString() };
  }, [currentDate]);

  // Fetch events
  const { data: events, mutate } = useSWR(
    user?.id ? ['calendar-events', user.id, currentDate.getMonth(), currentDate.getFullYear()] : null,
    () => fetchCalendarEvents(user!.id, monthRange)
  );

  // Enable/disable notifications
  const toggleNotifications = async () => {
    if (!isSupported) {
      showGlobalPopup(t('notifications_not_supported') || 'Notifications non supportées', 'error');
      return;
    }

    if (permission !== 'granted') {
      const result = await requestPermission();
      if (result === 'granted') {
        setNotificationsEnabled(true);
        showGlobalPopup(t('notifications_enabled') || 'Notifications activées', 'success');
      } else {
        showGlobalPopup(t('notifications_denied') || 'Permission refusée', 'error');
      }
    } else {
      setNotificationsEnabled(!notificationsEnabled);
      showGlobalPopup(
        notificationsEnabled 
          ? (t('notifications_disabled') || 'Notifications désactivées')
          : (t('notifications_enabled') || 'Notifications activées'),
        'success'
      );
    }
  };

  // Schedule notifications for upcoming events
  useEffect(() => {
    if (!notificationsEnabled || !events || permission !== 'granted') return;

    // Clear previous scheduled notifications
    scheduledNotifications.current.forEach(timeout => clearTimeout(timeout));
    scheduledNotifications.current.clear();

    const now = new Date();
    const upcomingEventsToNotify = events.filter(event => {
      const eventDate = new Date(event.start_date);
      return eventDate > now && !event.is_completed && event.reminder_minutes;
    });

    upcomingEventsToNotify.forEach(event => {
      const reminderMinutes = event.reminder_minutes || 15;
      const eventDate = new Date(event.start_date);
      
      const timeoutId = scheduleNotification(
        sendNotification,
        eventDate,
        reminderMinutes,
        {
          title: `📅 ${event.title}`,
          body: `Dans ${reminderMinutes} minutes${event.location ? ` - ${event.location}` : ''}`,
          tag: event.documentId,
          onClick: () => {
            window.focus();
            setSelectedDate(eventDate);
          },
        }
      );

      if (timeoutId) {
        scheduledNotifications.current.set(event.documentId, timeoutId);
      }
    });

    return () => {
      scheduledNotifications.current.forEach(timeout => clearTimeout(timeout));
    };
  }, [events, notificationsEnabled, permission, sendNotification]);

  // Load notifications preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('calendar-notifications');
    if (saved === 'true' && permission === 'granted') {
      setNotificationsEnabled(true);
    }
  }, [permission]);

  // Save notifications preference
  useEffect(() => {
    localStorage.setItem('calendar-notifications', notificationsEnabled.toString());
  }, [notificationsEnabled]);

  // Get days in month
  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];
    
    // Add days from previous month to fill the first week
    const startDayOfWeek = firstDay.getDay() || 7; // Convert Sunday (0) to 7
    for (let i = startDayOfWeek - 1; i > 0; i--) {
      days.push(new Date(year, month, 1 - i));
    }
    
    // Add all days of current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    
    // Add days from next month to fill the last week
    const remainingDays = 42 - days.length; // 6 rows x 7 days
    for (let i = 1; i <= remainingDays; i++) {
      days.push(new Date(year, month + 1, i));
    }
    
    return days;
  }, [currentDate]);

  // Get events for a specific day
  const getEventsForDay = useCallback((date: Date) => {
    if (!events) return [];
    return events.filter(event => {
      const eventDate = new Date(event.start_date);
      return eventDate.getDate() === date.getDate() &&
             eventDate.getMonth() === date.getMonth() &&
             eventDate.getFullYear() === date.getFullYear();
    });
  }, [events]);

  // Navigate months
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  const goToToday = () => setCurrentDate(new Date());

  // Check if date is today
  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  // Check if date is in current month
  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteModal.event) return;
    try {
      await deleteCalendarEvent(deleteModal.event.documentId);
      await mutate();
      showGlobalPopup(t('event_deleted') || 'Événement supprimé', 'success');
      setDeleteModal({ isOpen: false, event: null });
    } catch {
      showGlobalPopup(t('delete_error') || 'Erreur lors de la suppression', 'error');
    }
  };

  // Handle complete
  const handleComplete = async (event: CalendarEvent) => {
    try {
      await completeCalendarEvent(event.documentId);
      await mutate();
      showGlobalPopup(t('event_completed') || 'Événement terminé', 'success');
    } catch {
      showGlobalPopup(t('error') || 'Erreur', 'error');
    }
  };

  // Format time
  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  // Upcoming events
  const upcomingEvents = useMemo(() => {
    if (!events) return [];
    const now = new Date();
    return events
      .filter(e => new Date(e.start_date) >= now && !e.is_completed)
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
      .slice(0, 5);
  }, [events]);

  return (
    <ProtectedRoute>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
              <IconCalendar className="w-7 h-7 text-accent" />
              {t('calendar') || 'Calendrier'}
            </h1>
            <p className="text-muted text-sm mt-1">
              {t('calendar_desc') || 'Gérez vos rendez-vous et deadlines'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Notifications toggle */}
            {isSupported && (
              <button
                onClick={toggleNotifications}
                className={`p-2.5 rounded-lg border transition-colors ${
                  notificationsEnabled
                    ? 'bg-accent/10 border-accent text-accent'
                    : 'border-default text-muted hover:text-primary hover:border-primary'
                }`}
                title={notificationsEnabled 
                  ? (t('disable_notifications') || 'Désactiver les notifications')
                  : (t('enable_notifications') || 'Activer les notifications')
                }
              >
                {notificationsEnabled ? (
                  <IconBell className="w-5 h-5" />
                ) : (
                  <IconBellOff className="w-5 h-5" />
                )}
              </button>
            )}
            
            <button
              onClick={() => {
                setSelectedDate(new Date());
                setShowAddModal(true);
              }}
              className="btn-primary px-4 py-2 flex items-center gap-2 rounded-lg"
            >
              <IconPlus className="w-4 h-4" />
              {t('new_event') || 'Nouvel événement'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Calendar Grid */}
          <div className="lg:col-span-3 card p-4">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <button onClick={prevMonth} className="p-2 hover:bg-hover rounded-lg">
                  <IconChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="text-lg font-semibold text-primary min-w-[200px] text-center">
                  {currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                </h2>
                <button onClick={nextMonth} className="p-2 hover:bg-hover rounded-lg">
                  <IconChevronRight className="w-5 h-5" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={goToToday}
                  className="btn-ghost px-3 py-1.5 text-sm"
                >
                  {t('today') || "Aujourd'hui"}
                </button>
              </div>
            </div>

            {/* Days of week */}
            <div className="grid grid-cols-7 mb-2">
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
                <div key={day} className="text-center text-xs font-medium text-muted py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {daysInMonth.map((date, index) => {
                const dayEvents = getEventsForDay(date);
                const isSelected = selectedDate?.getTime() === date.getTime();
                
                return (
                  <div
                    key={index}
                    onClick={() => setSelectedDate(date)}
                    className={`
                      min-h-[80px] p-1 rounded-lg border cursor-pointer transition-all
                      ${isToday(date) ? 'border-accent bg-accent/5' : 'border-transparent hover:border-default'}
                      ${isSelected ? 'ring-2 ring-accent' : ''}
                      ${!isCurrentMonth(date) ? 'opacity-40' : ''}
                    `}
                  >
                    <div className={`
                      text-sm font-medium mb-1
                      ${isToday(date) ? 'text-accent' : 'text-primary'}
                    `}>
                      {date.getDate()}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map((event) => (
                        <div
                          key={event.documentId}
                          className="text-xs px-1 py-0.5 rounded truncate"
                          style={{ 
                            backgroundColor: `${event.color || EVENT_COLORS[event.event_type]}20`,
                            color: event.color || EVENT_COLORS[event.event_type],
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingEvent(event);
                          }}
                        >
                          {event.all_day ? '' : formatTime(event.start_date) + ' '}
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-muted">
                          +{dayEvents.length - 3} {t('more_items') || 'plus'}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sidebar - Upcoming Events */}
          <div className="space-y-4">
            <div className="card p-4">
              <h3 className="font-semibold text-primary mb-4">
                {t('upcoming_events') || 'Événements à venir'}
              </h3>
              {upcomingEvents.length === 0 ? (
                <p className="text-sm text-muted">{t('no_upcoming_events') || 'Aucun événement'}</p>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map((event) => (
                    <div
                      key={event.documentId}
                      className="p-3 rounded-lg border border-default hover:border-accent transition-colors cursor-pointer"
                      onClick={() => setEditingEvent(event)}
                    >
                      <div className="flex items-start gap-2">
                        <div
                          className="p-1.5 rounded"
                          style={{ 
                            backgroundColor: `${event.color || EVENT_COLORS[event.event_type]}20`,
                            color: event.color || EVENT_COLORS[event.event_type],
                          }}
                        >
                          {EVENT_ICONS[event.event_type]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-primary text-sm truncate">{event.title}</p>
                          <p className="text-xs text-muted">
                            {new Date(event.start_date).toLocaleDateString('fr-FR', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                            })}
                            {!event.all_day && ` ${formatTime(event.start_date)}`}
                          </p>
                          {event.location && (
                            <p className="text-xs text-muted flex items-center gap-1 mt-1">
                              <IconMapPin className="w-3 h-3" />
                              {event.location}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Day Details */}
            {selectedDate && (
              <div className="card p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-primary">
                    {selectedDate.toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </h3>
                  <button
                    onClick={() => {
                      setShowAddModal(true);
                    }}
                    className="p-1.5 hover:bg-hover rounded-lg"
                  >
                    <IconPlus className="w-4 h-4" />
                  </button>
                </div>
                
                {getEventsForDay(selectedDate).length === 0 ? (
                  <p className="text-sm text-muted">{t('no_events') || 'Aucun événement'}</p>
                ) : (
                  <div className="space-y-2">
                    {getEventsForDay(selectedDate).map((event) => (
                      <div
                        key={event.documentId}
                        className={`p-2 rounded-lg border ${event.is_completed ? 'opacity-50' : ''}`}
                        style={{ 
                          borderColor: event.color || EVENT_COLORS[event.event_type],
                          backgroundColor: `${event.color || EVENT_COLORS[event.event_type]}10`,
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm text-primary">{event.title}</p>
                          <div className="flex items-center gap-1">
                            {!event.is_completed && (
                              <button
                                onClick={() => handleComplete(event)}
                                className="p-1 hover:bg-success/20 rounded text-success"
                              >
                                <IconCheck className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              onClick={() => setEditingEvent(event)}
                              className="p-1 hover:bg-hover rounded"
                            >
                              <IconEdit className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setDeleteModal({ isOpen: true, event })}
                              className="p-1 hover:bg-error/20 rounded text-error"
                            >
                              <IconTrash className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-muted">
                          {event.all_day ? (t('all_day') || 'Toute la journée') : formatTime(event.start_date)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Add/Edit Modal */}
        <EventModal
          isOpen={showAddModal || !!editingEvent}
          onClose={() => {
            setShowAddModal(false);
            setEditingEvent(null);
          }}
          event={editingEvent}
          defaultDate={selectedDate}
          projects={projects}
          clients={clients}
          onSave={async (data) => {
            try {
              if (editingEvent) {
                await updateCalendarEvent(editingEvent.documentId, data);
                showGlobalPopup(t('event_updated') || 'Événement mis à jour', 'success');
              } else {
                await createCalendarEvent(user!.id, data);
                showGlobalPopup(t('event_created') || 'Événement créé', 'success');
              }
              await mutate();
              setShowAddModal(false);
              setEditingEvent(null);
            } catch {
              showGlobalPopup(t('save_error') || 'Erreur lors de la sauvegarde', 'error');
            }
          }}
        />

        {/* Delete Modal */}
        <DeleteConfirmModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, event: null })}
          onConfirm={handleDelete}
          title={t('delete_event') || 'Supprimer l\'événement'}
          itemName={deleteModal.event?.title || ''}
          itemType="event"
        />
      </motion.div>
    </ProtectedRoute>
  );
}

// Event Modal Component
interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEvent | null;
  defaultDate: Date | null;
  projects: Project[];
  clients: Client[];
  onSave: (data: {
    title: string;
    description?: string;
    start_date: string;
    end_date?: string;
    all_day?: boolean;
    event_type?: EventType;
    color?: string;
    location?: string;
    reminder_minutes?: number;
    project?: number;
    client?: number;
  }) => Promise<void>;
}

function EventModal({ isOpen, onClose, event, defaultDate, projects, clients, onSave }: EventModalProps) {
  const { t } = useLanguage();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('10:00');
  const [allDay, setAllDay] = useState(false);
  const [eventType, setEventType] = useState<EventType>('meeting');
  const [location, setLocation] = useState('');
  const [reminderMinutes, setReminderMinutes] = useState(30);
  const [projectId, setProjectId] = useState<string>('');
  const [clientId, setClientId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form
  React.useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || '');
      const start = new Date(event.start_date);
      setStartDate(start.toISOString().split('T')[0]);
      setStartTime(start.toTimeString().slice(0, 5));
      if (event.end_date) {
        const end = new Date(event.end_date);
        setEndDate(end.toISOString().split('T')[0]);
        setEndTime(end.toTimeString().slice(0, 5));
      }
      setAllDay(event.all_day);
      setEventType(event.event_type);
      setLocation(event.location || '');
      setReminderMinutes(event.reminder_minutes);
      setProjectId(event.project?.documentId || '');
      setClientId(event.client?.documentId || '');
    } else {
      setTitle('');
      setDescription('');
      const date = defaultDate || new Date();
      setStartDate(date.toISOString().split('T')[0]);
      setStartTime('09:00');
      setEndDate('');
      setEndTime('10:00');
      setAllDay(false);
      setEventType('meeting');
      setLocation('');
      setReminderMinutes(30);
      setProjectId('');
      setClientId('');
    }
  }, [event, defaultDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const startDateTime = allDay
        ? new Date(startDate).toISOString()
        : new Date(`${startDate}T${startTime}`).toISOString();
      
      const endDateTime = endDate
        ? (allDay
            ? new Date(endDate).toISOString()
            : new Date(`${endDate}T${endTime}`).toISOString())
        : undefined;

      await onSave({
        title,
        description: description || undefined,
        start_date: startDateTime,
        end_date: endDateTime,
        all_day: allDay,
        event_type: eventType,
        location: location || undefined,
        reminder_minutes: reminderMinutes,
        project: projectId ? projects.find(p => p.documentId === projectId)?.id : undefined,
        client: clientId ? clients.find(c => c.documentId === clientId)?.id : undefined,
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg bg-card border border-default rounded-xl shadow-xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-default">
          <h2 className="text-lg font-semibold text-primary">
            {event ? (t('edit_event') || 'Modifier l\'événement') : (t('new_event') || 'Nouvel événement')}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              {t('title') || 'Titre'} *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input w-full"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                {t('event_type') || 'Type'}
              </label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value as EventType)}
                className="input w-full"
              >
                <option value="meeting">{t('meeting_event') || 'Réunion'}</option>
                <option value="deadline">{t('deadline_event') || 'Deadline'}</option>
                <option value="reminder">{t('reminder_event') || 'Rappel'}</option>
                <option value="delivery">{t('delivery_event') || 'Livraison'}</option>
                <option value="call">{t('call_event') || 'Appel'}</option>
                <option value="personal">{t('personal_event') || 'Personnel'}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                {t('reminder') || 'Rappel'}
              </label>
              <select
                value={reminderMinutes}
                onChange={(e) => setReminderMinutes(Number(e.target.value))}
                className="input w-full"
              >
                <option value={0}>{t('no_reminder') || 'Aucun'}</option>
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={60}>1h</option>
                <option value={1440}>1 jour</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="allDay"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="allDay" className="text-sm text-secondary">
              {t('all_day') || 'Toute la journée'}
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                {t('start_date') || 'Date de début'} *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input w-full"
                required
              />
            </div>
            {!allDay && (
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  {t('start_time') || 'Heure'}
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="input w-full"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                {t('end_date') || 'Date de fin'}
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input w-full"
              />
            </div>
            {!allDay && endDate && (
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  {t('end_time') || 'Heure'}
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="input w-full"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              {t('location') || 'Lieu'}
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Zoom, Bureau, etc."
              className="input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              {t('description') || 'Description'}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input w-full"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                {t('project') || 'Projet'}
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="input w-full"
              >
                <option value="">{t('none_option') || 'Aucun'}</option>
                {projects.map((p) => (
                  <option key={p.documentId} value={p.documentId}>{p.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                {t('client') || 'Client'}
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="input w-full"
              >
                <option value="">{t('none_option') || 'Aucun'}</option>
                {clients.map((c) => (
                  <option key={c.documentId} value={c.documentId}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4">
            <button type="button" onClick={onClose} className="btn-ghost px-4 py-2">
              {t('cancel') || 'Annuler'}
            </button>
            <button
              type="submit"
              disabled={isSaving || !title || !startDate}
              className="btn-primary px-4 py-2 rounded-lg flex items-center gap-2"
            >
              {isSaving && <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />}
              {event ? (t('save') || 'Sauvegarder') : (t('create') || 'Créer')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

