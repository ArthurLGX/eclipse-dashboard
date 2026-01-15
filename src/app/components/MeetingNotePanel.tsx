'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconNotes,
  IconFileText,
  IconListCheck,
  IconUsers,
  IconClock,
  IconLink,
  IconPlus,
  IconTrash,
  IconCheck,
  IconEdit,
  IconChevronDown,
  IconChevronUp,
  IconSparkles,
  IconLoader2,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';
import { usePopup } from '@/app/context/PopupContext';
import {
  fetchMeetingNoteByCalendarEvent,
  createMeetingNote,
  updateMeetingNote,
  deleteMeetingNote,
} from '@/lib/api';
import type { 
  MeetingNote, 
  ActionItem, 
  MeetingAttendee,
  CalendarEvent,
  Project,
  Client,
} from '@/types';

interface MeetingNotePanelProps {
  calendarEvent: CalendarEvent;
  project?: Project | null;
  client?: Client | null;
  onNoteChange?: () => void;
}

export default function MeetingNotePanel({ 
  calendarEvent, 
  project, 
  client,
  onNoteChange 
}: MeetingNotePanelProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { showGlobalPopup } = usePopup();
  
  const [note, setNote] = useState<MeetingNote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  
  // Form state
  const [summary, setSummary] = useState('');
  const [transcription, setTranscription] = useState('');
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [attendees, setAttendees] = useState<MeetingAttendee[]>([]);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
  const [recordingUrl, setRecordingUrl] = useState('');
  const [newActionItem, setNewActionItem] = useState('');
  const [newAttendee, setNewAttendee] = useState('');

  // Load existing note
  useEffect(() => {
    const loadNote = async () => {
      if (!calendarEvent?.documentId) return;
      
      setIsLoading(true);
      try {
        const existingNote = await fetchMeetingNoteByCalendarEvent(calendarEvent.documentId);
        if (existingNote) {
          setNote(existingNote);
          setSummary(existingNote.summary || '');
          setTranscription(existingNote.transcription || '');
          setActionItems(existingNote.action_items || []);
          setAttendees(existingNote.attendees || []);
          setDurationMinutes(existingNote.duration_minutes);
          setRecordingUrl(existingNote.recording_url || '');
        }
      } catch (error) {
        console.error('Error loading meeting note:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadNote();
  }, [calendarEvent?.documentId]);

  // Save note
  const handleSave = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const noteData = {
        title: calendarEvent.title,
        summary: summary || undefined,
        transcription: transcription || undefined,
        action_items: actionItems.length > 0 ? actionItems : undefined,
        attendees: attendees.length > 0 ? attendees : undefined,
        duration_minutes: durationMinutes || undefined,
        recording_url: recordingUrl || undefined,
        meeting_date: calendarEvent.start_date,
        calendar_event: calendarEvent.id,
        project: project?.id,
        client: client?.id,
        status: 'completed' as const,
        source: 'manual' as const,
      };

      if (note) {
        const updated = await updateMeetingNote(note.documentId, noteData);
        setNote(updated);
        showGlobalPopup(t('meeting_note_updated') || 'Notes mises à jour', 'success');
      } else {
        const created = await createMeetingNote(user.id, noteData);
        setNote(created);
        showGlobalPopup(t('meeting_note_created') || 'Notes créées', 'success');
      }
      
      setIsEditing(false);
      onNoteChange?.();
    } catch (error) {
      console.error('Error saving meeting note:', error);
      showGlobalPopup(t('save_error') || 'Erreur lors de la sauvegarde', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete note
  const handleDelete = async () => {
    if (!note) return;
    
    if (!confirm(t('delete_meeting_note_confirm') || 'Supprimer ces notes de réunion ?')) {
      return;
    }
    
    try {
      await deleteMeetingNote(note.documentId);
      setNote(null);
      setSummary('');
      setTranscription('');
      setActionItems([]);
      setAttendees([]);
      setDurationMinutes(null);
      setRecordingUrl('');
      showGlobalPopup(t('meeting_note_deleted') || 'Notes supprimées', 'success');
      onNoteChange?.();
    } catch (error) {
      console.error('Error deleting meeting note:', error);
      showGlobalPopup(t('delete_error') || 'Erreur lors de la suppression', 'error');
    }
  };

  // Add action item
  const addActionItem = () => {
    if (!newActionItem.trim()) return;
    
    const item: ActionItem = {
      id: Date.now().toString(),
      text: newActionItem.trim(),
      completed: false,
    };
    
    setActionItems([...actionItems, item]);
    setNewActionItem('');
  };

  // Toggle action item completion
  const toggleActionItem = (id: string) => {
    setActionItems(actionItems.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  // Remove action item
  const removeActionItem = (id: string) => {
    setActionItems(actionItems.filter(item => item.id !== id));
  };

  // Add attendee
  const addAttendee = () => {
    if (!newAttendee.trim()) return;
    
    const attendee: MeetingAttendee = {
      name: newAttendee.trim(),
    };
    
    setAttendees([...attendees, attendee]);
    setNewAttendee('');
  };

  // Remove attendee
  const removeAttendee = (index: number) => {
    setAttendees(attendees.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <IconLoader2 className="w-5 h-5 animate-spin !text-accent" />
      </div>
    );
  }

  const hasContent = note || summary || transcription || actionItems.length > 0;

  return (
    <div className="border-t border-default mt-4 pt-4">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-2 hover:bg-hover rounded-lg transition-colors"
      >
        <div className="flex items-center gap-2">
          <IconNotes className="w-5 h-5 !text-accent" />
          <span className="font-medium text-primary">
            {t('meeting_notes') || 'Notes de réunion'}
          </span>
          {note && (
            <span className="px-2 py-0.5 bg-success-light text-success text-xs rounded-full">
              {t('saved') || 'Enregistré'}
            </span>
          )}
        </div>
        {isExpanded ? (
          <IconChevronUp className="w-4 h-4 text-muted" />
        ) : (
          <IconChevronDown className="w-4 h-4 text-muted" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3 space-y-4">
              {/* Actions */}
              <div className="flex items-center gap-2 justify-end">
                {!isEditing && hasContent && (
                  <>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="btn-tertiary px-3 py-1.5 text-sm rounded-lg flex items-center gap-1"
                    >
                      <IconEdit className="w-4 h-4" />
                      {t('edit') || 'Modifier'}
                    </button>
                    <button
                      onClick={handleDelete}
                      className="btn-tertiary px-3 py-1.5 text-sm rounded-lg text-error flex items-center gap-1"
                    >
                      <IconTrash className="w-4 h-4" />
                    </button>
                  </>
                )}
                {!isEditing && !hasContent && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="btn-primary px-3 py-1.5 text-sm rounded-lg flex items-center gap-1"
                  >
                    <IconPlus className="w-4 h-4" />
                    {t('add_notes') || 'Ajouter des notes'}
                  </button>
                )}
              </div>

              {/* View Mode */}
              {!isEditing && hasContent && (
                <div className="space-y-4">
                  {/* Summary */}
                  {summary && (
                    <div className="p-3 bg-accent-light rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <IconSparkles className="w-4 h-4 !text-accent" />
                        <span className="text-sm font-medium !text-accent">
                          {t('summary') || 'Résumé'}
                        </span>
                      </div>
                      <p className="text-sm text-primary whitespace-pre-wrap">{summary}</p>
                    </div>
                  )}

                  {/* Action Items */}
                  {actionItems.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <IconListCheck className="w-4 h-4 text-success" />
                        <span className="text-sm font-medium text-primary">
                          {t('action_items') || 'Actions à faire'} ({actionItems.filter(i => !i.completed).length}/{actionItems.length})
                        </span>
                      </div>
                      <div className="space-y-1">
                        {actionItems.map((item) => (
                          <div
                            key={item.id}
                            className={`flex items-center gap-2 p-2 rounded-lg ${
                              item.completed ? 'bg-success-light' : 'bg-hover'
                            }`}
                          >
                            <IconCheck className={`w-4 h-4 ${
                              item.completed ? 'text-success' : 'text-muted'
                            }`} />
                            <span className={`text-sm ${
                              item.completed ? 'text-muted line-through' : 'text-primary'
                            }`}>
                              {item.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Attendees */}
                  {attendees.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <IconUsers className="w-4 h-4 text-info" />
                        <span className="text-sm font-medium text-primary">
                          {t('attendees') || 'Participants'} ({attendees.length})
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {attendees.map((attendee, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-info-light text-info text-xs rounded-full"
                          >
                            {attendee.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Transcription */}
                  {transcription && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <IconFileText className="w-4 h-4 text-muted" />
                        <span className="text-sm font-medium text-primary">
                          {t('transcription') || 'Transcription'}
                        </span>
                      </div>
                      <div className="p-3 bg-hover rounded-lg max-h-40 overflow-y-auto">
                        <p className="text-sm text-secondary whitespace-pre-wrap">{transcription}</p>
                      </div>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="flex flex-wrap gap-4 text-xs text-muted">
                    {durationMinutes && (
                      <div className="flex items-center gap-1">
                        <IconClock className="w-3 h-3" />
                        {durationMinutes} min
                      </div>
                    )}
                    {recordingUrl && (
                      <a
                        href={recordingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 !text-accent hover:underline"
                      >
                        <IconLink className="w-3 h-3" />
                        {t('recording') || 'Enregistrement'}
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Edit Mode */}
              {isEditing && (
                <div className="space-y-4">
                  {/* Summary */}
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1">
                      {t('summary') || 'Résumé'}
                    </label>
                    <textarea
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      placeholder={t('meeting_summary_placeholder') || 'Points clés de la réunion...'}
                      className="input w-full h-24 resize-none"
                    />
                  </div>

                  {/* Action Items */}
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1">
                      {t('action_items') || 'Actions à faire'}
                    </label>
                    <div className="space-y-2">
                      {actionItems.map((item) => (
                        <div key={item.id} className="flex items-center gap-2">
                          <button
                            onClick={() => toggleActionItem(item.id)}
                            className={`p-1 rounded ${
                              item.completed ? 'bg-success text-white' : 'bg-hover text-muted'
                            }`}
                          >
                            <IconCheck className="w-4 h-4" />
                          </button>
                          <span className={`flex-1 text-sm ${
                            item.completed ? 'line-through text-muted' : 'text-primary'
                          }`}>
                            {item.text}
                          </span>
                          <button
                            onClick={() => removeActionItem(item.id)}
                            className="p-1 text-error hover:bg-error-light rounded"
                          >
                            <IconTrash className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newActionItem}
                          onChange={(e) => setNewActionItem(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addActionItem()}
                          placeholder={t('add_action_item') || 'Nouvelle action...'}
                          className="input flex-1"
                        />
                        <button
                          onClick={addActionItem}
                          disabled={!newActionItem.trim()}
                          className="btn-tertiary p-2 rounded-lg"
                        >
                          <IconPlus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Attendees */}
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1">
                      {t('attendees') || 'Participants'}
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {attendees.map((attendee, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-info-light text-info text-xs rounded-full"
                        >
                          {attendee.name}
                          <button
                            onClick={() => removeAttendee(index)}
                            className="hover:text-error"
                          >
                            <IconTrash className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newAttendee}
                        onChange={(e) => setNewAttendee(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addAttendee()}
                        placeholder={t('add_attendee') || 'Nom du participant...'}
                        className="input flex-1"
                      />
                      <button
                        onClick={addAttendee}
                        disabled={!newAttendee.trim()}
                        className="btn-tertiary p-2 rounded-lg"
                      >
                        <IconPlus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Duration & Recording */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-1">
                        {t('duration') || 'Durée'} (min)
                      </label>
                      <input
                        type="number"
                        value={durationMinutes || ''}
                        onChange={(e) => setDurationMinutes(e.target.value ? Number(e.target.value) : null)}
                        placeholder="60"
                        className="input w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-1">
                        {t('recording_url') || 'Lien enregistrement'}
                      </label>
                      <input
                        type="url"
                        value={recordingUrl}
                        onChange={(e) => setRecordingUrl(e.target.value)}
                        placeholder="https://..."
                        className="input w-full"
                      />
                    </div>
                  </div>

                  {/* Transcription */}
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1">
                      {t('transcription') || 'Transcription'}
                    </label>
                    <textarea
                      value={transcription}
                      onChange={(e) => setTranscription(e.target.value)}
                      placeholder={t('transcription_placeholder') || 'Collez ici la transcription de la réunion...'}
                      className="input w-full h-32 resize-none font-mono text-xs"
                    />
                  </div>

                  {/* Save/Cancel Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        // Reset to original values
                        if (note) {
                          setSummary(note.summary || '');
                          setTranscription(note.transcription || '');
                          setActionItems(note.action_items || []);
                          setAttendees(note.attendees || []);
                          setDurationMinutes(note.duration_minutes);
                          setRecordingUrl(note.recording_url || '');
                        }
                      }}
                      className="btn-ghost px-4 py-2"
                    >
                      {t('cancel') || 'Annuler'}
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="btn-primary px-4 py-2 rounded-lg flex items-center gap-2"
                    >
                      {isSaving && <IconLoader2 className="w-4 h-4 animate-spin" />}
                      {t('save') || 'Enregistrer'}
                    </button>
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!isEditing && !hasContent && (
                <div className="text-center py-6">
                  <IconNotes className="w-10 h-10 text-muted mx-auto mb-2 opacity-50" />
                  <p className="text-sm text-muted">
                    {t('no_meeting_notes') || 'Aucune note pour cette réunion'}
                  </p>
                  <p className="text-xs text-muted mt-1">
                    {t('meeting_notes_hint') || 'Ajoutez des notes, un résumé ou des actions à faire'}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

