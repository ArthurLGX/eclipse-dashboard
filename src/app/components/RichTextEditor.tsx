'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  IconBold,
  IconItalic,
  IconList,
  IconListNumbers,
  IconLink,
  IconPhoto,
  IconFileText,
  IconAlignLeft,
  IconAlignCenter,
  IconAlignRight,
  IconH1,
  IconH2,
  IconTypography,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import MediaPickerModal from './MediaPickerModal';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  maxHeight?: string;
  showMediaOptions?: boolean;
  className?: string;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeight = '150px',
  maxHeight = '400px',
  showMediaOptions = true,
  className = '',
}: RichTextEditorProps) {
  const { t } = useLanguage();
  const editorRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);
  const isInternalChange = useRef(false);
  const lastExternalValue = useRef<string>('');
  
  // UI state
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaPickerType, setMediaPickerType] = useState<'image' | 'pdf'>('image');
  
  // Selected media state
  const [selectedMedia, setSelectedMedia] = useState<HTMLElement | null>(null);
  const [mediaToolbarPosition, setMediaToolbarPosition] = useState({ top: 0, left: 0 });

  // Internal onChange wrapper
  const notifyChange = useCallback(() => {
    if (editorRef.current) {
      isInternalChange.current = true;
      lastExternalValue.current = editorRef.current.innerHTML;
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  // Initialize and sync with external changes
  useEffect(() => {
    if (editorRef.current) {
      if (!isInitialized.current) {
        editorRef.current.innerHTML = value || '';
        lastExternalValue.current = value || '';
        isInitialized.current = true;
      } else if (!isInternalChange.current && value !== lastExternalValue.current) {
        editorRef.current.innerHTML = value || '';
        lastExternalValue.current = value || '';
        setSelectedMedia(null);
      }
      isInternalChange.current = false;
    }
  }, [value]);

  // Execute formatting command
  const execCommand = useCallback((command: string, val?: string) => {
    document.execCommand(command, false, val);
    editorRef.current?.focus();
    notifyChange();
  }, [notifyChange]);

  // Handle input
  const handleInput = () => {
    notifyChange();
  };

  // Insert link
  const insertLink = () => {
    if (linkUrl) {
      execCommand('createLink', linkUrl);
      setLinkUrl('');
      setShowLinkInput(false);
    }
  };

  // Handle media click for selection
  const handleEditorClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    
    if (target.tagName === 'IMG') {
      e.preventDefault();
      setSelectedMedia(target);
      
      const rect = target.getBoundingClientRect();
      const editorRect = editorRef.current?.getBoundingClientRect();
      if (editorRect) {
        setMediaToolbarPosition({
          top: rect.top - editorRect.top - 45,
          left: rect.left - editorRect.left + rect.width / 2,
        });
      }
    } else {
      setSelectedMedia(null);
    }
  }, []);

  // Deselect media when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (selectedMedia && editorRef.current && !editorRef.current.contains(e.target as Node)) {
        setSelectedMedia(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedMedia]);

  // Delete selected media
  const deleteSelectedMedia = useCallback(() => {
    if (!selectedMedia) return;
    if (selectedMedia.parentNode) {
      selectedMedia.parentNode.removeChild(selectedMedia);
    }
    setSelectedMedia(null);
    notifyChange();
  }, [selectedMedia, notifyChange]);

  // Handle Delete key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedMedia && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        deleteSelectedMedia();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedMedia, deleteSelectedMedia]);

  // Set media alignment
  const setMediaAlignment = (alignment: 'left' | 'center' | 'right') => {
    if (!selectedMedia) return;
    
    selectedMedia.style.float = '';
    selectedMedia.style.display = '';
    selectedMedia.style.margin = '';
    selectedMedia.style.marginLeft = '';
    selectedMedia.style.marginRight = '';
    
    switch (alignment) {
      case 'left':
        selectedMedia.style.float = 'left';
        selectedMedia.style.marginRight = '16px';
        selectedMedia.style.marginBottom = '8px';
        break;
      case 'right':
        selectedMedia.style.float = 'right';
        selectedMedia.style.marginLeft = '16px';
        selectedMedia.style.marginBottom = '8px';
        break;
      case 'center':
        selectedMedia.style.display = 'block';
        selectedMedia.style.marginLeft = 'auto';
        selectedMedia.style.marginRight = 'auto';
        selectedMedia.style.marginBottom = '8px';
        break;
    }
    
    notifyChange();
  };

  // Set media size
  const setMediaSize = (size: 'small' | 'medium' | 'large' | 'full') => {
    if (!selectedMedia) return;
    
    switch (size) {
      case 'small': selectedMedia.style.width = '150px'; break;
      case 'medium': selectedMedia.style.width = '300px'; break;
      case 'large': selectedMedia.style.width = '450px'; break;
      case 'full': selectedMedia.style.width = '100%'; break;
    }
    selectedMedia.style.height = 'auto';
    notifyChange();
  };

  // Insert media from picker
  const handleMediaSelect = (url: string) => {
    if (mediaPickerType === 'image') {
      const imgHtml = `<img src="${url}" alt="Image" style="max-width: 100%; height: auto; border-radius: 8px; margin: 8px 0;" />`;
      execCommand('insertHTML', imgHtml);
    } else {
      // PDF as link
      const fileName = url.split('/').pop() || 'Document.pdf';
      const linkHtml = `<a href="${url}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 4px; color: #7c3aed; text-decoration: underline;">📄 ${fileName}</a>`;
      execCommand('insertHTML', linkHtml);
    }
    setShowMediaPicker(false);
  };

  return (
    <div className={`border border-default rounded-xl overflow-hidden bg-card ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-default bg-hover">
        {/* Text format */}
        <div className="flex items-center gap-0.5 border-r border-default pr-2 mr-1">
          <button
            type="button"
            onClick={() => execCommand('formatBlock', 'h1')}
            className="p-1.5 rounded hover:bg-muted text-secondary hover:text-primary transition-colors"
            title={t('toolbar_heading1') || 'Titre 1'}
          >
            <IconH1 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCommand('formatBlock', 'h2')}
            className="p-1.5 rounded hover:bg-muted text-secondary hover:text-primary transition-colors"
            title={t('toolbar_heading2') || 'Titre 2'}
          >
            <IconH2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCommand('formatBlock', 'p')}
            className="p-1.5 rounded hover:bg-muted text-secondary hover:text-primary transition-colors"
            title={t('toolbar_paragraph') || 'Paragraphe'}
          >
            <IconTypography className="w-4 h-4" />
          </button>
        </div>

        {/* Bold & Italic */}
        <div className="flex items-center gap-0.5 border-r border-default pr-2 mr-1">
          <button
            type="button"
            onClick={() => execCommand('bold')}
            className="p-1.5 rounded hover:bg-muted text-secondary hover:text-primary transition-colors"
            title={t('toolbar_bold') || 'Gras'}
          >
            <IconBold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCommand('italic')}
            className="p-1.5 rounded hover:bg-muted text-secondary hover:text-primary transition-colors"
            title={t('toolbar_italic') || 'Italique'}
          >
            <IconItalic className="w-4 h-4" />
          </button>
        </div>

        {/* Lists */}
        <div className="flex items-center gap-0.5 border-r border-default pr-2 mr-1">
          <button
            type="button"
            onClick={() => execCommand('insertUnorderedList')}
            className="p-1.5 rounded hover:bg-muted text-secondary hover:text-primary transition-colors"
            title={t('toolbar_bullet_list') || 'Liste à puces'}
          >
            <IconList className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCommand('insertOrderedList')}
            className="p-1.5 rounded hover:bg-muted text-secondary hover:text-primary transition-colors"
            title={t('toolbar_numbered_list') || 'Liste numérotée'}
          >
            <IconListNumbers className="w-4 h-4" />
          </button>
        </div>

        {/* Alignment */}
        <div className="flex items-center gap-0.5 border-r border-default pr-2 mr-1">
          <button
            type="button"
            onClick={() => execCommand('justifyLeft')}
            className="p-1.5 rounded hover:bg-muted text-secondary hover:text-primary transition-colors"
            title={t('toolbar_align_left') || 'Aligner à gauche'}
          >
            <IconAlignLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCommand('justifyCenter')}
            className="p-1.5 rounded hover:bg-muted text-secondary hover:text-primary transition-colors"
            title={t('toolbar_align_center') || 'Centrer'}
          >
            <IconAlignCenter className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCommand('justifyRight')}
            className="p-1.5 rounded hover:bg-muted text-secondary hover:text-primary transition-colors"
            title={t('toolbar_align_right') || 'Aligner à droite'}
          >
            <IconAlignRight className="w-4 h-4" />
          </button>
        </div>

        {/* Link */}
        <div className="relative flex items-center gap-0.5 border-r border-default pr-2 mr-1">
          <button
            type="button"
            onClick={() => setShowLinkInput(!showLinkInput)}
            className={`p-1.5 rounded transition-colors ${showLinkInput ? 'bg-accent text-white' : 'hover:bg-muted text-secondary hover:text-primary'}`}
            title={t('toolbar_insert_link') || 'Insérer un lien'}
          >
            <IconLink className="w-4 h-4" />
          </button>
          
          {showLinkInput && (
            <div className="absolute top-full left-0 mt-1 p-2 bg-card border border-default rounded-lg shadow-lg z-10 flex gap-2">
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://..."
                className="px-2 py-1 text-sm bg-input border border-input rounded text-primary w-48"
                onKeyDown={(e) => e.key === 'Enter' && insertLink()}
              />
              <button
                type="button"
                onClick={insertLink}
                className="px-3 py-1 bg-accent text-white rounded text-sm"
              >
                OK
              </button>
              <button
                type="button"
                onClick={() => setShowLinkInput(false)}
                className="p-1 text-secondary hover:text-primary"
              >
                <IconX className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Media */}
        {showMediaOptions && (
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => { setMediaPickerType('image'); setShowMediaPicker(true); }}
              className="p-1.5 rounded hover:bg-muted text-secondary hover:text-primary transition-colors"
              title={t('toolbar_insert_image') || 'Insérer une image'}
            >
              <IconPhoto className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => { setMediaPickerType('pdf'); setShowMediaPicker(true); }}
              className="p-1.5 rounded hover:bg-muted text-secondary hover:text-primary transition-colors"
              title={t('toolbar_insert_document') || 'Insérer un document'}
            >
              <IconFileText className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Editor Area */}
      <div className="relative">
        {/* Media Toolbar - appears when image is selected */}
        {selectedMedia && (
          <div 
            className="absolute z-20 flex items-center gap-1 p-1.5 bg-gray-900 rounded-lg shadow-xl"
            style={{ 
              top: mediaToolbarPosition.top,
              left: mediaToolbarPosition.left,
              transform: 'translateX(-50%)',
            }}
          >
            <button type="button" onClick={() => setMediaAlignment('left')} className="p-1.5 rounded hover:bg-gray-700 text-gray-300 hover:text-white" title="Gauche">
              <IconAlignLeft className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => setMediaAlignment('center')} className="p-1.5 rounded hover:bg-gray-700 text-gray-300 hover:text-white" title="Centre">
              <IconAlignCenter className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => setMediaAlignment('right')} className="p-1.5 rounded hover:bg-gray-700 text-gray-300 hover:text-white" title="Droite">
              <IconAlignRight className="w-4 h-4" />
            </button>
            
            <div className="w-px h-5 bg-gray-600 mx-1" />
            
            <button type="button" onClick={() => setMediaSize('small')} className="px-2 py-1 rounded hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-medium">S</button>
            <button type="button" onClick={() => setMediaSize('medium')} className="px-2 py-1 rounded hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-medium">M</button>
            <button type="button" onClick={() => setMediaSize('large')} className="px-2 py-1 rounded hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-medium">L</button>
            <button type="button" onClick={() => setMediaSize('full')} className="px-2 py-1 rounded hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-medium">100%</button>
            
            <div className="w-px h-5 bg-gray-600 mx-1" />
            
            <button type="button" onClick={deleteSelectedMedia} className="p-1.5 rounded hover:bg-red-600 text-gray-300 hover:text-white" title="Supprimer">
              <IconTrash className="w-4 h-4" />
            </button>
          </div>
        )}

        <div
          ref={editorRef}
          contentEditable
          dir="ltr"
          onInput={handleInput}
          onClick={handleEditorClick}
          className="focus:outline-none prose prose-sm max-w-none dark:prose-invert overflow-y-auto
            [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-2 [&_h1]:text-primary
            [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:text-primary
            [&_p]:mb-2 [&_p]:text-secondary
            [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-secondary
            [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:text-secondary
            [&_a]:text-accent [&_a]:underline
            [&_img]:rounded-lg [&_img]:cursor-pointer [&_img]:transition-all [&_img]:max-w-full
            empty:before:content-[attr(data-placeholder)] empty:before:text-muted empty:before:pointer-events-none"
          style={{ 
            minHeight,
            maxHeight,
            padding: '12px',
          }}
          data-placeholder={placeholder || t('write_description') || 'Écrivez votre description...'}
          suppressContentEditableWarning
        />

        {/* Selection indicator */}
        {selectedMedia && (
          <div
            className="absolute pointer-events-none border-2 border-accent rounded-lg"
            style={{
              top: selectedMedia.offsetTop,
              left: selectedMedia.offsetLeft,
              width: selectedMedia.offsetWidth,
              height: selectedMedia.offsetHeight,
            }}
          />
        )}
      </div>

      {/* Media Picker Modal */}
      <MediaPickerModal
        isOpen={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={handleMediaSelect}
        mediaType={mediaPickerType === 'image' ? 'image' : 'all'}
        title={mediaPickerType === 'image' 
          ? (t('toolbar_insert_image') || 'Sélectionner une image')
          : (t('select_document') || 'Sélectionner un document')
        }
      />
    </div>
  );
}

