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
  IconGripVertical,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import MediaPickerModal from './MediaPickerModal';

/**
 * Nettoie le HTML généré par le RichTextEditor pour l'envoi d'emails
 * Supprime les classes et attributs spécifiques à l'éditeur
 */
export function cleanRichTextForEmail(html: string): string {
  if (!html) return '';
  
  // Parse HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // Remove editor-specific classes and attributes
  const allElements = doc.body.querySelectorAll('*');
  allElements.forEach((el) => {
    // Remove editor classes
    el.classList.remove('editor-block', 'editor-image-block');
    
    // Remove contenteditable
    el.removeAttribute('contenteditable');
    
    // Remove data attributes
    Array.from(el.attributes).forEach(attr => {
      if (attr.name.startsWith('data-')) {
        el.removeAttribute(attr.name);
      }
    });
    
    // Remove empty class attribute
    if (el.getAttribute('class') === '') {
      el.removeAttribute('class');
    }
  });
  
  // Unwrap image containers - extract img from div.editor-image-block
  const imageContainers = doc.body.querySelectorAll('div');
  imageContainers.forEach((container) => {
    const img = container.querySelector('img');
    if (img && container.childElementCount === 1) {
      container.replaceWith(img);
    }
  });
  
  return doc.body.innerHTML;
}

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
  
  // Resize state
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  
  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const [draggedElement, setDraggedElement] = useState<HTMLElement | null>(null);
  const [dropIndicatorPosition, setDropIndicatorPosition] = useState<{ top: number; visible: boolean }>({ top: 0, visible: false });
  const dragGhostRef = useRef<HTMLDivElement | null>(null);

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
        setupDraggableElements();
      } else if (!isInternalChange.current && value !== lastExternalValue.current) {
        editorRef.current.innerHTML = value || '';
        lastExternalValue.current = value || '';
        setSelectedMedia(null);
        setupDraggableElements();
      }
      isInternalChange.current = false;
    }
  }, [value]);

  // Setup draggable elements - wrap images in their own blocks
  const setupDraggableElements = useCallback(() => {
    if (!editorRef.current) return;
    
    // First, handle images - wrap them in their own div if they're inside a paragraph
    const images = editorRef.current.querySelectorAll('img');
    images.forEach((img) => {
      const parent = img.parentElement;
      if (parent && parent.tagName === 'P' && parent.childNodes.length > 1) {
        // Image is inside a paragraph with other content - extract it
        const wrapper = document.createElement('div');
        wrapper.className = 'editor-block editor-image-block';
        wrapper.setAttribute('data-type', 'image');
        parent.parentNode?.insertBefore(wrapper, parent.nextSibling);
        wrapper.appendChild(img);
      } else if (!img.classList.contains('editor-block') && !img.parentElement?.classList.contains('editor-image-block')) {
        img.classList.add('editor-block');
        img.setAttribute('data-type', 'image');
      }
    });
    
    // Then mark other block elements
    const blockElements = editorRef.current.querySelectorAll('p, h1, h2, h3, ul, ol, blockquote');
    blockElements.forEach((el) => {
      if (el.classList.contains('editor-block')) return;
      if (el.closest('.editor-image-block')) return;
      
      const htmlEl = el as HTMLElement;
      // Only mark as block if it has content
      if (htmlEl.textContent?.trim() || htmlEl.querySelector('img')) {
        htmlEl.classList.add('editor-block');
        htmlEl.setAttribute('data-type', 'text');
      }
    });
  }, []);

  // Execute formatting command
  const execCommand = useCallback((command: string, val?: string) => {
    document.execCommand(command, false, val);
    editorRef.current?.focus();
    notifyChange();
    setTimeout(setupDraggableElements, 10);
  }, [notifyChange, setupDraggableElements]);

  // Handle input
  const handleInput = () => {
    notifyChange();
    setTimeout(setupDraggableElements, 10);
  };

  // Insert link
  const insertLink = () => {
    if (linkUrl) {
      execCommand('createLink', linkUrl);
      setLinkUrl('');
      setShowLinkInput(false);
    }
  };

  // Update toolbar position
  const updateToolbarPosition = useCallback((element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const editorRect = editorRef.current?.getBoundingClientRect();
    if (editorRect) {
      setMediaToolbarPosition({
        top: rect.top - editorRect.top - 50,
        left: rect.left - editorRect.left + rect.width / 2,
      });
    }
  }, []);

  // Handle media click for selection
  const handleEditorClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    
    if (target.tagName === 'IMG') {
      e.preventDefault();
      e.stopPropagation();
      setSelectedMedia(target);
      updateToolbarPosition(target);
      // Also set the image block as hovered for drag handle
      const imageBlock = target.closest('.editor-image-block') as HTMLElement || target;
      setHoveredBlock(imageBlock);
    } else {
      setSelectedMedia(null);
    }
  }, [updateToolbarPosition]);

  // Handle mouse down on editor for block selection
  const handleEditorMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    
    // Check if clicking on drag handle
    if (target.classList.contains('drag-handle') || target.closest('.drag-handle')) {
      e.preventDefault();
      const block = target.closest('.editor-block') as HTMLElement;
      if (block) {
        startDrag(e.nativeEvent, block);
      }
    }
  }, []);

  // Start drag
  const startDrag = useCallback((e: MouseEvent, element: HTMLElement) => {
    setIsDragging(true);
    setDraggedElement(element);
    
    // Create ghost element
    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    ghost.innerHTML = element.outerHTML;
    ghost.style.cssText = `
      position: fixed;
      pointer-events: none;
      opacity: 0.8;
      z-index: 9999;
      background: var(--bg-card);
      border: 2px solid var(--color-accent);
      border-radius: 8px;
      padding: 8px;
      max-width: 300px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
      transform: rotate(2deg);
    `;
    document.body.appendChild(ghost);
    dragGhostRef.current = ghost;
    
    // Position ghost
    ghost.style.left = `${e.clientX + 10}px`;
    ghost.style.top = `${e.clientY + 10}px`;
    
    // Add visual feedback to original
    element.style.opacity = '0.3';
  }, []);

  // Handle drag move
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (dragGhostRef.current) {
        dragGhostRef.current.style.left = `${e.clientX + 10}px`;
        dragGhostRef.current.style.top = `${e.clientY + 10}px`;
      }

      // Find drop position
      if (editorRef.current) {
        const editorRect = editorRef.current.getBoundingClientRect();
        const blocks = editorRef.current.querySelectorAll('.editor-block');
        let closestBlock: Element | null = null;
        let closestDistance = Infinity;
        let insertBefore = true;

        blocks.forEach((block) => {
          if (block === draggedElement) return;
          const rect = block.getBoundingClientRect();
          const blockMiddle = rect.top + rect.height / 2;
          const distance = Math.abs(e.clientY - blockMiddle);
          
          if (distance < closestDistance) {
            closestDistance = distance;
            closestBlock = block;
            insertBefore = e.clientY < blockMiddle;
          }
        });

        if (closestBlock) {
          const rect = (closestBlock as HTMLElement).getBoundingClientRect();
          const top = insertBefore 
            ? rect.top - editorRect.top 
            : rect.bottom - editorRect.top;
          setDropIndicatorPosition({ top, visible: true });
        }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (draggedElement && editorRef.current) {
        // Find where to drop - use same logic as indicator
        const blocks = Array.from(editorRef.current.querySelectorAll('.editor-block'));
        let closestBlock: Element | null = null;
        let closestDistance = Infinity;
        let insertBefore = true;

        for (const block of blocks) {
          if (block === draggedElement) continue;
          if (block.contains(draggedElement)) continue; // Skip parent blocks
          if (draggedElement.contains(block)) continue; // Skip child blocks
          
          const rect = block.getBoundingClientRect();
          const blockMiddle = rect.top + rect.height / 2;
          const distance = Math.abs(e.clientY - blockMiddle);
          
          if (distance < closestDistance) {
            closestDistance = distance;
            closestBlock = block;
            insertBefore = e.clientY < blockMiddle;
          }
        }

        // Move element
        if (closestBlock && closestBlock !== draggedElement && closestBlock.parentNode) {
          // Remove from current position
          const parent = draggedElement.parentNode;
          if (parent) {
            parent.removeChild(draggedElement);
          }
          
          // Insert at new position
          if (insertBefore) {
            closestBlock.parentNode.insertBefore(draggedElement, closestBlock);
          } else {
            closestBlock.parentNode.insertBefore(draggedElement, closestBlock.nextSibling);
          }
          
          notifyChange();
          setTimeout(setupDraggableElements, 10);
        }

        // Reset styles
        draggedElement.style.opacity = '';
      }

      // Cleanup
      if (dragGhostRef.current) {
        dragGhostRef.current.remove();
        dragGhostRef.current = null;
      }
      setIsDragging(false);
      setDraggedElement(null);
      setDropIndicatorPosition({ top: 0, visible: false });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, draggedElement, notifyChange]);

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

  // Resize handlers
  const startResize = useCallback((e: React.MouseEvent, direction: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedMedia) return;

    setIsResizing(true);
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: selectedMedia.offsetWidth,
      height: selectedMedia.offsetHeight,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!selectedMedia) return;
      
      const deltaX = moveEvent.clientX - resizeStartRef.current.x;
      let newWidth = resizeStartRef.current.width;

      if (direction.includes('e')) newWidth += deltaX;
      if (direction.includes('w')) newWidth -= deltaX;

      // Minimum and maximum size
      newWidth = Math.max(50, Math.min(newWidth, editorRef.current?.offsetWidth || 800));

      selectedMedia.style.width = `${newWidth}px`;
      selectedMedia.style.height = 'auto';
      
      // Update toolbar position
      updateToolbarPosition(selectedMedia);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      notifyChange();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [selectedMedia, notifyChange, updateToolbarPosition]);

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
    setTimeout(() => updateToolbarPosition(selectedMedia), 10);
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
    setTimeout(() => updateToolbarPosition(selectedMedia), 10);
  };

  // Insert media from picker
  const handleMediaSelect = (url: string) => {
    if (mediaPickerType === 'image') {
      // Insert image in its own block to make it independently draggable
      const imgHtml = `<div class="editor-block editor-image-block" data-type="image" contenteditable="false"><img src="${url}" alt="Image" style="max-width: 100%; height: auto; border-radius: 8px; cursor: pointer; display: block;" /></div><p class="editor-block" data-type="text"><br></p>`;
      execCommand('insertHTML', imgHtml);
    } else {
      // PDF as link in its own paragraph
      const fileName = url.split('/').pop() || 'Document.pdf';
      const linkHtml = `<p class="editor-block" data-type="text"><a href="${url}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 4px; color: #7c3aed; text-decoration: underline;">📄 ${fileName}</a></p>`;
      execCommand('insertHTML', linkHtml);
    }
    setShowMediaPicker(false);
  };

  // Show drag handles on hover
  const [hoveredBlock, setHoveredBlock] = useState<HTMLElement | null>(null);
  const [isHoveringGrip, setIsHoveringGrip] = useState(false);
  const gripHoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const handleEditorMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging || isResizing) return;
    
    const target = e.target as HTMLElement;
    
    // Prioritize images - if hovering an image, select the image block
    if (target.tagName === 'IMG') {
      const imgBlock = target.classList.contains('editor-block') 
        ? target 
        : target.closest('.editor-image-block') as HTMLElement;
      if (imgBlock && imgBlock !== hoveredBlock) {
        setHoveredBlock(imgBlock);
        return;
      }
    }
    
    // Otherwise find the closest block
    const block = target.closest('.editor-block:not(.editor-image-block img)') as HTMLElement;
    
    if (block && block !== hoveredBlock) {
      // Don't select a block that contains another block being hovered
      if (!block.querySelector('.editor-block:hover')) {
        setHoveredBlock(block);
      }
    } else if (!block && hoveredBlock && !isHoveringGrip) {
      // Délai avant de cacher pour permettre d'atteindre l'icône de grip
      if (gripHoverTimeoutRef.current) clearTimeout(gripHoverTimeoutRef.current);
      gripHoverTimeoutRef.current = setTimeout(() => {
        if (!isHoveringGrip) {
          setHoveredBlock(null);
        }
      }, 150);
    }
  }, [hoveredBlock, isDragging, isResizing, isHoveringGrip]);

  const handleEditorMouseLeave = useCallback(() => {
    if (!isDragging && !isHoveringGrip) {
      // Délai pour permettre d'atteindre l'icône de grip
      if (gripHoverTimeoutRef.current) clearTimeout(gripHoverTimeoutRef.current);
      gripHoverTimeoutRef.current = setTimeout(() => {
        if (!isHoveringGrip) {
          setHoveredBlock(null);
        }
      }, 150);
    }
  }, [isDragging, isHoveringGrip]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (gripHoverTimeoutRef.current) clearTimeout(gripHoverTimeoutRef.current);
    };
  }, []);

  return (
    <div className={`border border-default rounded-xl overflow-hidden bg-card ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-default bg-hover">
        {/* Text format */}
        <div className="flex items-center gap-0.5 border-r border-default !pr-2 mr-1">
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
        <div className="flex items-center gap-0.5 border-r border-default !pr-2 mr-1">
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
        <div className="flex items-center gap-0.5 border-r border-default !pr-2 mr-1">
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
        <div className="flex items-center gap-0.5 border-r border-default !pr-2 mr-1">
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
        <div className="relative flex items-center gap-0.5 border-r border-default !pr-2 mr-1">
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
        {selectedMedia && !isResizing && (
          <div 
            className="absolute z-20 flex items-center gap-1 p-1.5 bg-gray-900 rounded-lg shadow-xl"
            style={{ 
              top: Math.max(0, mediaToolbarPosition.top),
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

        {/* Drop indicator */}
        {dropIndicatorPosition.visible && (
          <div 
            className="absolute left-0 right-0 h-0.5 bg-accent z-10 pointer-events-none"
            style={{ top: dropIndicatorPosition.top }}
          >
            <div className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-accent" />
            <div className="absolute -right-1 -top-1 w-2 h-2 rounded-full bg-accent" />
          </div>
        )}

        {/* Drag handle for hovered block */}
        {hoveredBlock && !isDragging && !isResizing && editorRef.current && (
          <div
            className="absolute z-30 flex items-center justify-center w-8 h-8 left-0 cursor-grab bg-card/80 hover:bg-hover border border-default rounded shadow-sm transition-colors drag-handle"
            style={{
              top: hoveredBlock.offsetTop + hoveredBlock.offsetHeight / 2 - 16,
            }}
            onMouseEnter={() => {
              if (gripHoverTimeoutRef.current) clearTimeout(gripHoverTimeoutRef.current);
              setIsHoveringGrip(true);
            }}
            onMouseLeave={() => {
              setIsHoveringGrip(false);
              // Petit délai avant de cacher
              gripHoverTimeoutRef.current = setTimeout(() => {
                setHoveredBlock(null);
              }, 100);
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSelectedMedia(null); // Deselect media when starting drag
              startDrag(e.nativeEvent, hoveredBlock);
            }}
          >
            <IconGripVertical className="w-4 h-4 text-secondary" />
          </div>
        )}

        <div
          ref={editorRef}
          contentEditable
          dir="ltr"
          onInput={handleInput}
          onClick={handleEditorClick}
          onMouseDown={handleEditorMouseDown}
          onMouseMove={handleEditorMouseMove}
          onMouseLeave={handleEditorMouseLeave}
          className="focus:outline-none prose prose-sm max-w-none dark:prose-invert overflow-y-auto !pl-8
            [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-2 [&_h1]:text-primary
            [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:text-primary
            [&_p]:mb-2 [&_p]:text-secondary
            [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-secondary
            [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:text-secondary
            [&_a]:text-accent [&_a]:underline
            [&_img]:rounded-lg [&_img]:cursor-pointer [&_img]:transition-all [&_img]:max-w-full
            [&_.editor-block]:relative [&_.editor-block]:transition-all
            [&_.editor-image-block]:my-2 [&_.editor-image-block]:rounded-lg
            [&_.editor-image-block:hover]:ring-2 [&_.editor-image-block:hover]:ring-accent/30
            empty:before:content-[attr(data-placeholder)] empty:before:text-muted empty:before:pointer-events-none"
          style={{ 
            minHeight,
            maxHeight,
            padding: '12px',
            paddingLeft: '32px',
          }}
          data-placeholder={placeholder || t('write_description') || 'Écrivez votre description...'}
          suppressContentEditableWarning
        />

        {/* Resize handles for selected image */}
        {selectedMedia && selectedMedia.tagName === 'IMG' && (
          <>
            {/* Corner resize handles */}
            <div
              className="absolute w-3 h-3 bg-accent border-2 border-white rounded-sm cursor-nw-resize z-30 shadow hover:scale-125 transition-transform"
              style={{
                top: selectedMedia.offsetTop - 4,
                left: selectedMedia.offsetLeft - 4,
              }}
              onMouseDown={(e) => startResize(e, 'nw')}
            />
            <div
              className="absolute w-3 h-3 bg-accent border-2 border-white rounded-sm cursor-ne-resize z-30 shadow hover:scale-125 transition-transform"
              style={{
                top: selectedMedia.offsetTop - 4,
                left: selectedMedia.offsetLeft + selectedMedia.offsetWidth - 8,
              }}
              onMouseDown={(e) => startResize(e, 'ne')}
            />
            <div
              className="absolute w-3 h-3 bg-accent border-2 border-white rounded-sm cursor-sw-resize z-30 shadow hover:scale-125 transition-transform"
              style={{
                top: selectedMedia.offsetTop + selectedMedia.offsetHeight - 8,
                left: selectedMedia.offsetLeft - 4,
              }}
              onMouseDown={(e) => startResize(e, 'sw')}
            />
            <div
              className="absolute w-3 h-3 bg-accent border-2 border-white rounded-sm cursor-se-resize z-30 shadow hover:scale-125 transition-transform"
              style={{
                top: selectedMedia.offsetTop + selectedMedia.offsetHeight - 8,
                left: selectedMedia.offsetLeft + selectedMedia.offsetWidth - 8,
              }}
              onMouseDown={(e) => startResize(e, 'se')}
            />
            
            {/* Edge resize handles */}
            <div
              className="absolute w-8 h-3 bg-accent/50 rounded-sm cursor-n-resize z-30 hover:bg-[var(--color-accent)] hover:text-white transition-colors"
              style={{
                top: selectedMedia.offsetTop - 4,
                left: selectedMedia.offsetLeft + selectedMedia.offsetWidth / 2 - 16,
              }}
              onMouseDown={(e) => startResize(e, 'n')}
            />
            <div
              className="absolute w-3 h-8 bg-accent/50 rounded-sm cursor-e-resize z-30 hover:bg-[var(--color-accent)] hover:text-white transition-colors"
              style={{
                top: selectedMedia.offsetTop + selectedMedia.offsetHeight / 2 - 16,
                left: selectedMedia.offsetLeft + selectedMedia.offsetWidth - 8,
              }}
              onMouseDown={(e) => startResize(e, 'e')}
            />
            <div
              className="absolute w-8 h-3 bg-accent/50 rounded-sm cursor-s-resize z-30 hover:bg-[var(--color-accent)] hover:text-white transition-colors"
              style={{
                top: selectedMedia.offsetTop + selectedMedia.offsetHeight - 8,
                left: selectedMedia.offsetLeft + selectedMedia.offsetWidth / 2 - 16,
              }}
              onMouseDown={(e) => startResize(e, 's')}
            />
            <div
              className="absolute w-3 h-8 bg-accent/50 rounded-sm cursor-w-resize z-30 hover:bg-[var(--color-accent)] hover:text-white transition-colors"
              style={{
                top: selectedMedia.offsetTop + selectedMedia.offsetHeight / 2 - 16,
                left: selectedMedia.offsetLeft - 4,
              }}
              onMouseDown={(e) => startResize(e, 'w')}
            />
          </>
        )}

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
