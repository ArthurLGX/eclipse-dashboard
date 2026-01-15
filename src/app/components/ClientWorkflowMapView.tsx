'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconUser,
  IconFileText,
  IconFileInvoice,
  IconSignature,
  IconBriefcase,
  IconCreditCard,
  IconZoomIn,
  IconZoomOut,
  IconFocus2,
  IconMaximize,
  IconMinimize,
  IconCircle,
  IconCompass,
  IconChevronRight,
  IconX,
  IconAlertTriangle,
  IconCheck,
  IconClock,
  IconTimeline,
} from '@tabler/icons-react';
import type { Client, PipelineStatus, Facture, Project } from '@/types';
import { useLanguage } from '@/app/context/LanguageContext';
import { generateClientSlug } from '@/utils/slug';
import { useRouter } from 'next/navigation';

// ============================================================================
// TYPES
// ============================================================================

type NodeStatus = 'done' | 'current' | 'blocked' | 'pending';
type SatelliteType = 'quote' | 'invoice' | 'contract' | 'project';
type GlobalState = 'ok' | 'partial' | 'blocked';
type ViewMode = 'timeline' | 'radial';

interface ClientPosition {
  x: number;
  y: number;
}

interface SatelliteData {
  type: SatelliteType;
  label: string;
  icon: React.FC<{ className?: string }>;
  count: number;
  linked: boolean;
  status: NodeStatus;
  items: Array<{ id: string; label: string; status: string; amount?: number; slug?: string }>;
  hoverTip: string;
  guidedTip?: string;
}

// ============================================================================
// STYLES
// ============================================================================

const STATUS_STYLES: Record<NodeStatus, { dot: string; badge: string; border: string; background: string; ring: string }> = {
  done: {
    dot: 'bg-success',
    badge: 'bg-success-light text-success',
    border: 'border-success',
    background: 'bg-page',
    ring: 'shadow-[0_8px_20px_rgba(16,185,129,0.18)]',
  },
  current: {
    dot: 'bg-warning',
    badge: 'bg-warning-light text-warning',
    border: 'border-warning',
    background: 'bg-card',
    ring: 'shadow-[0_12px_28px_rgba(245,158,11,0.25)]',
  },
  blocked: {
    dot: 'bg-danger',
    badge: 'bg-danger-light text-danger',
    border: 'border-danger',
    background: 'bg-card',
    ring: 'shadow-[0_8px_20px_rgba(239,68,68,0.18)]',
  },
  pending: {
    dot: 'bg-muted',
    badge: 'bg-muted text-secondary',
    border: 'border-default',
    background: 'bg-card',
    ring: 'shadow-sm',
  },
};

const GLOBAL_STATE_STYLES: Record<GlobalState, { bg: string; text: string; label: string }> = {
  ok: { bg: 'bg-success', text: 'text-success', label: 'OK' },
  partial: { bg: 'bg-warning', text: 'text-warning', label: 'Incomplet' },
  blocked: { bg: 'bg-danger', text: 'text-danger', label: 'Bloquant' },
};

// ============================================================================
// COMPONENT
// ============================================================================

export default function ClientWorkflowMapView({
  clients,
  clientId = 'all',
  clientFactures = [],
  clientProjects = [],
  clientContracts = [],
}: {
  clients: Client[];
  clientId?: string;
  clientFactures?: Facture[];
  clientProjects?: Project[];
  clientContracts?: Array<{ id: number; documentId: string; title?: string; status?: string }>;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // State
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const dragStartRef = useRef({ x: 0, y: 0 });
  const dragMovedRef = useRef(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>(clientId === 'all' ? 'timeline' : 'radial');
  const [guidedMode, setGuidedMode] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [linkCursor, setLinkCursor] = useState({ x: 0, y: 0 });
  const [hoveredSatellite, setHoveredSatellite] = useState<SatelliteType | null>(null);
  const [expandedSatellite, setExpandedSatellite] = useState<SatelliteType | null>(null);
  const [createModal, setCreateModal] = useState<{ type: SatelliteType; label: string } | null>(null);
  const [activeNode, setActiveNode] = useState<{
    client: Client;
    stageId: string;
    stageLabel: string;
    status: NodeStatus;
  } | null>(null);
  
  // Client positions for radial multi-client view
  const [clientPositions, setClientPositions] = useState<Record<string, ClientPosition>>({});
  const [draggingClient, setDraggingClient] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || '';
  
  // Initialize client positions in a grid layout
  useEffect(() => {
    if (clientId === 'all' && viewMode === 'radial' && clients.length > 0) {
      const cols = Math.ceil(Math.sqrt(clients.length));
      const spacing = 550; // Larger spacing for full satellite designs
      const startX = 400;
      const startY = 400;
      
      const newPositions: Record<string, ClientPosition> = {};
      let hasNewClient = false;
      
      clients.forEach((client, index) => {
        const key = client.documentId || `client-${index}`;
        if (clientPositions[key]) {
          // Keep existing position
          newPositions[key] = clientPositions[key];
        } else {
          // Initialize new client position
          const col = index % cols;
          const row = Math.floor(index / cols);
          newPositions[key] = {
            x: startX + col * spacing,
            y: startY + row * spacing,
          };
          hasNewClient = true;
        }
      });
      
      // Only update if we have new clients to position
      if (hasNewClient || Object.keys(clientPositions).length === 0) {
        setClientPositions(newPositions);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients.length, clientId, viewMode]);

  // Timeline stages (for timeline view)
  const stages = useMemo(() => ([
    { id: 'contact', label: t('workflow_step_contact') || 'Contact créé', icon: IconUser },
    { id: 'quote', label: t('workflow_step_quote') || 'Devis généré', icon: IconFileText },
    { id: 'contract', label: t('workflow_step_contract') || 'Contrat signé', icon: IconSignature },
    { id: 'project', label: t('workflow_step_project') || 'Projet en cours', icon: IconBriefcase },
    { id: 'invoice', label: t('workflow_step_invoice') || 'Facture envoyée', icon: IconFileInvoice },
    { id: 'payment', label: t('workflow_step_payment') || 'Paiement reçu', icon: IconCreditCard },
  ]), [t]);

  const pipelineToStageIndex: Record<PipelineStatus, number> = {
    new: 0,
    contacted: 0,
    form_sent: 0,
    qualified: 0,
    quote_sent: 1,
    negotiation: 1,
    quote_accepted: 2,
    in_progress: 3,
    delivered: 4,
    maintenance: 3,
    won: 5,
    lost: 0,
  };

  const getStageStatuses = (pipelineStatus?: PipelineStatus | null): NodeStatus[] => {
    const stagesCount = stages.length;
    const statuses = Array.from({ length: stagesCount }, () => 'pending' as NodeStatus);
    const effectiveStatus = pipelineStatus || 'new';
    const currentIndex = pipelineToStageIndex[effectiveStatus] ?? 0;

    if (effectiveStatus === 'lost') {
      statuses[0] = 'blocked';
      return statuses;
    }

    for (let i = 0; i < currentIndex; i += 1) {
      statuses[i] = 'done';
    }
    statuses[currentIndex] = 'current';
    return statuses;
  };

  // Filter clients
  const filteredClients = useMemo(() => {
    if (clientId !== 'all') {
      return clients.filter(c => c.documentId === clientId || String(c.id) === clientId);
    }
    if (!searchQuery.trim()) return clients;
    const query = searchQuery.toLowerCase();
    return clients.filter(c =>
      c.name?.toLowerCase().includes(query) ||
      c.enterprise?.toLowerCase().includes(query) ||
      c.email?.toLowerCase().includes(query)
    );
  }, [clients, clientId, searchQuery]);

  const radialClient = filteredClients[0] || null;

  // Compute satellite data from real data
  const satellites = useMemo((): SatelliteData[] => {
    if (!radialClient) return [];

    const quotes = clientFactures.filter(f => f.document_type === 'quote');
    const invoices = clientFactures.filter(f => f.document_type !== 'quote');
    const projects = clientProjects;
    const contracts = clientContracts;

    const quotesAccepted = quotes.filter(q => q.quote_status === 'accepted').length;
    const invoicesPaid = invoices.filter(i => i.facture_status === 'paid').length;
    const projectsCompleted = projects.filter(p => p.project_status === 'completed').length;
    const contractsSigned = contracts.filter(c => c.status === 'signed').length;

    const getStatus = (count: number, total: number, hasBlocking: boolean): NodeStatus => {
      if (hasBlocking) return 'blocked';
      if (count === 0 && total === 0) return 'pending';
      if (count === total && total > 0) return 'done';
      if (count > 0 || total > 0) return 'current';
      return 'pending';
    };

    const hasOverdueInvoice = invoices.some(i => i.facture_status === 'overdue');
    const hasRejectedQuote = quotes.some(q => q.quote_status === 'rejected' || q.quote_status === 'expired');

    return [
      {
        type: 'quote' as SatelliteType,
        label: t('quotes') || 'Devis',
        icon: IconFileText,
        count: quotes.length,
        linked: quotes.length > 0,
        status: getStatus(quotesAccepted, quotes.length, hasRejectedQuote),
        items: quotes.map(q => ({
          id: q.documentId,
          label: q.reference || `Devis #${q.number || q.id}`,
          status: q.quote_status || 'draft',
          amount: q.total_ttc ?? q.total_ht,
        })),
        hoverTip: quotes.length === 0
          ? (t('workflow_tip_no_quote') || 'Aucun devis → CA non estimé')
          : quotesAccepted === quotes.length
            ? (t('workflow_tip_quotes_ok') || 'Tous les devis acceptés')
            : (t('workflow_tip_quotes_pending') || 'Devis en attente'),
        guidedTip: quotes.length === 0 ? (t('workflow_guide_create_quote') || 'Créez un devis pour estimer le CA') : undefined,
      },
      {
        type: 'invoice' as SatelliteType,
        label: t('invoices') || 'Factures',
        icon: IconFileInvoice,
        count: invoices.length,
        linked: invoices.length > 0,
        status: getStatus(invoicesPaid, invoices.length, hasOverdueInvoice),
        items: invoices.map(i => ({
          id: i.documentId,
          label: i.reference || `Facture #${i.number || i.id}`,
          status: i.facture_status || 'draft',
          amount: i.total_ttc ?? i.total_ht,
        })),
        hoverTip: invoices.length === 0
          ? (t('workflow_tip_no_invoice') || 'Aucune facture → revenu non suivi')
          : hasOverdueInvoice
            ? (t('workflow_tip_invoice_overdue') || 'Facture en retard !')
            : invoicesPaid === invoices.length
              ? (t('workflow_tip_invoices_paid') || 'Toutes les factures payées')
              : (t('workflow_tip_invoices_pending') || 'Factures en attente'),
        guidedTip: invoices.length === 0 && quotesAccepted > 0
          ? (t('workflow_guide_create_invoice') || 'Devis accepté → créez une facture')
          : undefined,
      },
      {
        type: 'contract' as SatelliteType,
        label: t('contracts') || 'Contrats',
        icon: IconSignature,
        count: contracts.length,
        linked: contracts.length > 0,
        status: getStatus(contractsSigned, contracts.length, false),
        items: contracts.map(c => ({
          id: c.documentId,
          label: c.title || `Contrat #${c.id}`,
          status: c.status || 'draft',
        })),
        hoverTip: contracts.length === 0
          ? (t('workflow_tip_no_contract') || 'Pas de contrat → risque juridique')
          : contractsSigned === contracts.length
            ? (t('workflow_tip_contracts_signed') || 'Tous les contrats signés')
            : (t('workflow_tip_contracts_pending') || 'Contrats en attente de signature'),
        guidedTip: contracts.length === 0 && quotesAccepted > 0
          ? (t('workflow_guide_create_contract') || 'Devis accepté → sécurisez avec un contrat')
          : undefined,
      },
      {
        type: 'project' as SatelliteType,
        label: t('projects') || 'Projets',
        icon: IconBriefcase,
        count: projects.length,
        linked: projects.length > 0,
        status: getStatus(projectsCompleted, projects.length, false),
        items: projects.map(p => {
          // Générer le slug du projet
          const slugifiedTitle = (p.title || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
          const projectSlug = `${slugifiedTitle}--${p.documentId}`;
          
          return {
            id: p.documentId,
            label: p.title || `Projet #${p.id}`,
            status: p.project_status || 'planning',
            slug: projectSlug,
          };
        }),
        hoverTip: projects.length === 0
          ? (t('workflow_tip_no_project') || 'Aucun projet → travail non planifié')
          : projectsCompleted === projects.length
            ? (t('workflow_tip_projects_done') || 'Tous les projets terminés')
            : (t('workflow_tip_projects_active') || 'Projets en cours'),
        guidedTip: projects.length === 0 && contracts.length > 0
          ? (t('workflow_guide_create_project') || 'Contrat signé → démarrez le projet')
          : undefined,
      },
    ];
  }, [radialClient, clientFactures, clientProjects, clientContracts, t]);

  // Compute global state
  const globalState = useMemo((): GlobalState => {
    if (!radialClient) return 'partial';
    const hasBlocked = satellites.some(s => s.status === 'blocked');
    if (hasBlocked) return 'blocked';
    const allDone = satellites.every(s => s.status === 'done' || !s.linked);
    if (allDone && satellites.some(s => s.linked)) return 'ok';
    return 'partial';
  }, [radialClient, satellites]);

  // Compute completeness (0-1)
  const completeness = useMemo(() => {
    if (satellites.length === 0) return 0;
    const linkedCount = satellites.filter(s => s.linked).length;
    const doneCount = satellites.filter(s => s.status === 'done').length;
    return (linkedCount + doneCount) / (satellites.length * 2);
  }, [satellites]);

  // Layout
  const timelineLayout = useMemo(() => {
    const labelWidth = 180;
    const nodeWidth = 220;
    const nodeHeight = 72;
    const stageGap = 260;
    const rowGap = 200;
    const startX = labelWidth + 60;
    const startY = 130;
    const contentWidth = startX + stages.length * stageGap + 140;
    const contentHeight = startY + Math.max(1, filteredClients.length) * rowGap + 180;
    return { labelWidth, nodeWidth, nodeHeight, stageGap, rowGap, startX, startY, contentWidth, contentHeight };
  }, [filteredClients.length, stages.length]);

  const radialLayout = useMemo(() => {
    if (clientId === 'all') {
      // Multi-client radial view - much larger canvas for full satellite designs
      const cols = Math.ceil(Math.sqrt(filteredClients.length || 1));
      const rows = Math.ceil((filteredClients.length || 1) / cols);
      return {
        contentWidth: Math.max(2000, cols * 600 + 800),
        contentHeight: Math.max(1500, rows * 600 + 600),
      };
    }
    return {
      contentWidth: 900,
      contentHeight: 700,
    };
  }, [clientId, filteredClients.length]);

  const center = { x: radialLayout.contentWidth / 2, y: radialLayout.contentHeight / 2 };
  const radialRadius = 220;
  const expandedRadius = 320;

  // Fit to view with different default scales
  const fitToView = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const { clientWidth, clientHeight } = container;
    const currentLayout = viewMode === 'radial' ? radialLayout : timelineLayout;
    
    // Different default scales: 0.8 for single client, 0.3 for multi-clients
    const defaultScale = clientId === 'all' ? 0.5 : 0.8;
    const scaleFit = Math.min(clientWidth / currentLayout.contentWidth, clientHeight / currentLayout.contentHeight, defaultScale);
    const finalScale = Math.max(0.4, Math.min(defaultScale, scaleFit));
    
    setScale(finalScale);
    setOffset({
      x: Math.max(0, (clientWidth - currentLayout.contentWidth * finalScale) / 2),
      y: Math.max(0, (clientHeight - currentLayout.contentHeight * finalScale) / 2),
    });
  }, [viewMode, radialLayout, timelineLayout, clientId]);

  useEffect(() => {
    fitToView();
  }, [fitToView]);

  // No longer needed since grid mode was removed

  // Wheel handler - block scroll on body, zoom on map
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const container = containerRef.current;
    if (!wrapper || !container) return;
    
    const handleWheelEvent = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      // Apply zoom
      const delta = event.deltaY > 0 ? -0.08 : 0.08;
      setScale(prev => Math.min(2, Math.max(0.1, Math.round((prev + delta) * 100) / 100)));
    };
    
    // Add to both wrapper and container with passive: false
    wrapper.addEventListener('wheel', handleWheelEvent, { passive: false });
    container.addEventListener('wheel', handleWheelEvent, { passive: false });
    
    return () => {
      wrapper.removeEventListener('wheel', handleWheelEvent);
      container.removeEventListener('wheel', handleWheelEvent);
    };
  }, []);

  // Fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      const fullscreenElement = document.fullscreenElement;
      setIsFullscreen(Boolean(fullscreenElement));
      if (fullscreenElement) {
        requestAnimationFrame(() => fitToView());
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [fitToView]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setScale(prev => Math.min(2, Math.max(0.1, Math.round((prev + delta) * 100) / 100)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isLinking) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    dragMovedRef.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Handle client node dragging
    if (draggingClient && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const newX = (e.clientX - rect.left - offset.x) / scale;
      const newY = (e.clientY - rect.top - offset.y) / scale;
      
      setClientPositions(prev => ({
        ...prev,
        [draggingClient]: { x: newX, y: newY },
      }));
      
      const deltaX = Math.abs(e.clientX - dragStartRef.current.x);
      const deltaY = Math.abs(e.clientY - dragStartRef.current.y);
      if (deltaX > 4 || deltaY > 4) {
        dragMovedRef.current = true;
      }
      return;
    }
    
    if (isLinking && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setLinkCursor({
        x: (e.clientX - rect.left - offset.x) / scale,
        y: (e.clientY - rect.top - offset.y) / scale,
      });
      return;
    }
    if (!isPanning) return;
    setOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    const deltaX = Math.abs(e.clientX - dragStartRef.current.x);
    const deltaY = Math.abs(e.clientY - dragStartRef.current.y);
    if (deltaX > 4 || deltaY > 4) {
      dragMovedRef.current = true;
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingClient(null);
    if (isLinking) {
      setIsLinking(false);
    }
    // Keep dragMovedRef true for a bit longer to prevent click events
    if (dragMovedRef.current) {
      setTimeout(() => {
        dragMovedRef.current = false;
      }, 100);
    }
  };

  const focusNode = (x: number, y: number) => {
    const container = containerRef.current;
    if (!container) return;
    const { clientWidth, clientHeight } = container;
    setOffset({
      x: clientWidth / 2 - x * scale,
      y: clientHeight / 2 - y * scale,
    });
  };

  const gridOpacity = Math.max(0.08, 0.25 - (scale - 0.6) * 0.3);
  const gridSize = Math.max(20, 36 * scale);

  // Creation routes
  const creationRoutes: Record<SatelliteType, string> = {
    quote: '/dashboard/factures?type=quote',
    invoice: '/dashboard/factures?type=invoice',
    contract: '/dashboard/contracts',
    project: '/dashboard/projects',
  };

  const creationLabels: Record<SatelliteType, string> = {
    quote: t('workflow_create_quote') || 'un devis',
    invoice: t('workflow_create_invoice') || 'une facture',
    contract: t('workflow_create_contract') || 'un contrat',
    project: t('workflow_create_project') || 'un projet',
  };

  const getPipelineLabel = (status?: PipelineStatus | null) => {
    if (!status) return t('pipeline_new') || 'Nouveau';
    const key = `pipeline_${status}`;
    return t(key) || status;
  };

  const formatDate = (value?: string | null) => {
    if (!value) return null;
    return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatCurrency = (value?: number | null) => {
    if (value === null || value === undefined) return null;
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
  };

  // Render satellite node (for radial view) - Unified circular design
  const renderSatelliteNode = (satellite: SatelliteData, index: number, total: number) => {
    const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
    const isExpanded = expandedSatellite === satellite.type;
    const radius = isExpanded ? expandedRadius : radialRadius;
    const x = center.x + radius * Math.cos(angle);
    const y = center.y + radius * Math.sin(angle);

    const Icon = satellite.icon;
    const isHighlighted = isLinking && !satellite.linked;
    const isDimmed = isLinking && satellite.linked;
    const isHovered = hoveredSatellite === satellite.type;
    const showGuidedTip = guidedMode && satellite.guidedTip && !satellite.linked;

    // Unified color scheme
    const statusColors = {
      done: { bg: 'bg-success-light', border: 'border-success', icon: 'text-success', ring: 'shadow-[0_0_0_3px_rgba(16,185,129,0.15)]' },
      current: { bg: 'bg-warning-light', border: 'border-warning', icon: 'text-warning', ring: 'shadow-[0_0_0_3px_rgba(245,158,11,0.15)]' },
      blocked: { bg: 'bg-danger-light', border: 'border-danger', icon: 'text-danger', ring: 'shadow-[0_0_0_3px_rgba(239,68,68,0.15)]' },
      pending: { bg: 'bg-muted/5', border: 'border-default', icon: 'text-muted', ring: '' },
    };
    const colors = statusColors[satellite.status];

    return (
      <React.Fragment key={satellite.type}>
        {/* Satellite node - Circular design */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ 
            opacity: isDimmed ? 0.4 : 1, 
            scale: isHighlighted ? 1.1 : 1,
            x: x,
            y: y,
          }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          className="absolute"
          style={{
            left: 0,
            top: 0,
            marginLeft: '-50px',
            marginTop: '-50px',
            zIndex: isHovered || isExpanded ? 20 : 10,
          }}
          onMouseEnter={() => setHoveredSatellite(satellite.type)}
          onMouseLeave={() => setHoveredSatellite(null)}
          onMouseUp={() => {
            if (!isLinking || satellite.linked) return;
            setIsLinking(false);
            setCreateModal({ type: satellite.type, label: satellite.label });
          }}
          onClick={() => {
            if (isLinking || dragMovedRef.current || isPanning) return;
            if (satellite.count > 0) {
              setExpandedSatellite(expandedSatellite === satellite.type ? null : satellite.type);
            } else {
              setCreateModal({ type: satellite.type, label: satellite.label });
            }
          }}
        >
          <motion.div
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            className={`relative w-[100px] h-[100px] rounded-full ${colors.bg} border ${colors.border} ${colors.ring} cursor-pointer flex flex-col items-center justify-center transition-all ${
              isHighlighted ? 'border-4 border-accent' : ''
            }`}
          >
            {/* Badge count */}
            {satellite.count > 0 && (
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  satellite.status === 'done' ? 'bg-success text-white' :
                  satellite.status === 'blocked' ? 'bg-danger text-white' :
                  satellite.status === 'current' ? 'bg-warning text-white' :
                  'bg-muted text-secondary'
                }`}
              >
                {satellite.count}
              </motion.div>
            )}

            {/* Icon */}
            <div className={`w-10 h-10 rounded-full bg-card border border-default shadow-sm flex items-center justify-center mb-1`}>
              <Icon className={`w-5 h-5 ${colors.icon}`} />
            </div>

            {/* Label */}
            <span className="text-[11px] font-medium text-primary text-center px-1">{satellite.label}</span>

            {/* Anchor point indicator */}
            {!satellite.linked && (
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
            )}
          </motion.div>

          {/* Hover tooltip */}
          <AnimatePresence>
            {isHovered && !isLinking && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 bg-card border border-default rounded-lg shadow-lg text-xs text-secondary whitespace-nowrap z-30"
              >
                {satellite.hoverTip}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Guided tip */}
          {showGuidedTip && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-accent-light border border-accent rounded-full text-[10px] !text-accent whitespace-nowrap flex items-center gap-1"
            >
              <IconChevronRight className="w-3 h-3" />
              {satellite.guidedTip}
            </motion.div>
          )}
        </motion.div>

        {/* Expanded items */}
        <AnimatePresence>
          {isExpanded && satellite.items.length > 0 && (
            <>
              {satellite.items.slice(0, 5).map((item, itemIndex) => {
                const itemCount = Math.min(satellite.items.length, 5);
                const spreadAngle = 0.3;
                const itemAngle = angle + ((itemIndex - (itemCount - 1) / 2) * spreadAngle);
                const itemRadius = radialRadius + 130 + (itemIndex % 2) * 30;
                const itemX = center.x + itemRadius * Math.cos(itemAngle);
                const itemY = center.y + itemRadius * Math.sin(itemAngle);

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1, x: itemX, y: itemY }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25, delay: itemIndex * 0.05 }}
                    className="absolute"
                    style={{
                      left: 0,
                      top: 0,
                      marginLeft: '-60px',
                      marginTop: '-30px',
                      zIndex: 50,
                    }}
                  >
                    <motion.div 
                      whileHover={{ scale: 1.05 }}
                      className="px-3 py-2 bg-card border border-default rounded-xl shadow-lg text-xs hover:shadow-xl cursor-pointer transition-colors min-w-[100px]"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (dragMovedRef.current || isPanning) return;
                        const route = satellite.type === 'quote' || satellite.type === 'invoice'
                          ? `/dashboard/factures/${item.id}`
                          : satellite.type === 'project'
                            ? `/dashboard/projects/${item.slug || item.id}`
                            : `/dashboard/contracts`;
                        router.push(route);
                      }}
                    >
                      <div className="font-medium text-primary whitespace-nowrap truncate max-w-[80px]">{item.label}</div>
                      <div className="text-muted capitalize text-[10px]">{item.status}</div>
                      {item.amount && (
                        <div className="text-success font-semibold mt-0.5 text-[10px]">
                          {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(item.amount)}
                        </div>
                      )}
                    </motion.div>
                  </motion.div>
                );
              })}
            </>
          )}
        </AnimatePresence>
      </React.Fragment>
    );
  };

  return (
    <div
      ref={wrapperRef}
      tabIndex={0}
      className={`relative w-full overflow-hidden border border-default bg-page outline-none ${
        isFullscreen ? 'h-screen w-screen rounded-none border-0' : 'min-h-[75vh] rounded-xl'
      }`}
      style={{ touchAction: 'none' }}
      onMouseEnter={() => wrapperRef.current?.focus()}
    >
      {/* Controls */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2  p-1.5 ">
        {clientId !== 'all' && (
          <>
          <div className="flex flex-row items-center !mr-4">
            <button
              type="button"
              onClick={() => { setViewMode('timeline'); setTimeout(fitToView, 50); }}
              className={`p-2 rounded transition-colors ${viewMode === 'timeline' ? 'bg-hover text-primary' : 'text-muted hover:bg-hover hover:text-primary'}`}
              title={t('workflow_mode_timeline') || 'Vue timeline'}
            >
              <IconTimeline className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => { setViewMode('radial'); setTimeout(fitToView, 50); }}
              className={`p-2 rounded transition-colors ${viewMode === 'radial' ? 'bg-hover text-primary' : 'text-muted hover:bg-hover hover:text-primary'}`}
              title={t('workflow_mode_radial') || 'Vue radiale'}
            >
              <IconCircle className="w-4 h-4" />
            </button>
            </div>
            <div className="w-px h-6 bg-default" />
          </>
        )}
        {clientId === 'all' && (
          <>
            <button
              type="button"
              onClick={() => { setViewMode('timeline'); setTimeout(fitToView, 50); }}
              className={`p-2 rounded transition-colors ${viewMode === 'timeline' ? 'bg-hover text-primary' : 'text-muted hover:bg-hover hover:text-primary'}`}
              title={t('workflow_mode_timeline') || 'Vue timeline'}
            >
              <IconTimeline className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => { setViewMode('radial'); setTimeout(fitToView, 50); }}
              className={`p-2 rounded transition-colors ${viewMode === 'radial' ? 'bg-hover text-primary' : 'text-muted hover:bg-hover hover:text-primary'}`}
              title={t('workflow_mode_radial') || 'Vue satellite'}
            >
              <IconCircle className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-default" />
          </>
        )}
        {viewMode === 'radial' && (
          <>
            <button
              type="button"
              onClick={() => setGuidedMode(!guidedMode)}
              className={`p-2 rounded transition-colors ${guidedMode ? 'bg-accent-light !text-accent' : 'text-muted hover:bg-hover hover:text-primary'}`}
              title={guidedMode ? (t('workflow_mode_free') || 'Vue libre') : (t('workflow_mode_guided') || 'Vue guidée')}
            >
              <IconCompass className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-default" />
          </>
        )}
        <button
          type="button"
          onClick={() => setScale(prev => Math.min(2, Math.round((prev + 0.1) * 10) / 10))}
          className="p-2 rounded text-muted hover:bg-hover hover:text-primary"
          title={t('zoom_in') || 'Zoom +'}
        >
          <IconZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setScale(prev => Math.max(0.1, Math.round((prev - 0.1) * 10) / 10))}
          className="p-2 rounded text-muted hover:bg-hover hover:text-primary"
          title={t('zoom_out') || 'Zoom -'}
        >
          <IconZoomOut className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={fitToView}
          className="p-2 rounded text-muted hover:bg-hover hover:text-primary"
          title={t('reset_view') || 'Recentrer'}
        >
          <IconFocus2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={async () => {
            if (document.fullscreenElement) {
              await document.exitFullscreen();
              return;
            }
            if (wrapperRef.current?.requestFullscreen) {
              await wrapperRef.current.requestFullscreen();
            }
          }}
          className="p-2 rounded text-muted hover:bg-hover hover:text-primary"
          title={isFullscreen ? (t('exit_fullscreen') || 'Quitter') : (t('fullscreen') || 'Plein écran')}
        >
          {isFullscreen ? <IconMinimize className="w-4 h-4" /> : <IconMaximize className="w-4 h-4" />}
        </button>
      </div>

      {/* Mode indicator */}
      {guidedMode && viewMode === 'radial' && (
        <div className="absolute top-4 left-4 z-20 px-3 py-1.5 bg-accent-light border border-accent rounded-full text-xs !text-accent flex items-center gap-2">
          <IconCompass className="w-3.5 h-3.5" />
          {t('workflow_guided_mode') || 'Mode guidé activé'}
        </div>
      )}

      <div
        ref={containerRef}
        className="w-full h-full relative"
        onWheel={handleWheel}
        onWheelCapture={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          cursor: isPanning ? 'grabbing' : 'grab',
          backgroundImage: `radial-gradient(circle, rgba(120,120,120,${gridOpacity}) 1px, transparent 1px)`,
          backgroundSize: `${gridSize}px ${gridSize}px`,
          overscrollBehavior: 'contain',
        }}
      >
        <motion.div
          ref={canvasRef}
          className="absolute left-0 top-0"
          animate={{
            x: offset.x,
            y: offset.y,
            scale: scale,
          }}
          transition={{
            type: isPanning || draggingClient ? 'tween' : 'spring',
            duration: isPanning || draggingClient ? 0 : 0.3,
            stiffness: 200,
            damping: 25,
          }}
          style={{
            transformOrigin: '0 0',
            width: viewMode === 'radial' ? radialLayout.contentWidth : timelineLayout.contentWidth,
            height: viewMode === 'radial' ? radialLayout.contentHeight : timelineLayout.contentHeight,
          }}
        >
          {/* =============== RADIAL VIEW (Single Client) =============== */}
          {viewMode === 'radial' && clientId !== 'all' && radialClient ? (
            <>
              {/* SVG Layer for connections */}
              <svg
                className="absolute inset-0 pointer-events-none"
                width={radialLayout.contentWidth}
                height={radialLayout.contentHeight}
              >
                {/* Linking cursor line */}
                {isLinking && (
                  <path
                    d={`M ${center.x} ${center.y} L ${linkCursor.x} ${linkCursor.y}`}
                    stroke="rgba(99,102,241,0.7)"
                    strokeWidth="2"
                    strokeDasharray="8,4"
                    fill="none"
                  />
                )}

                {/* Satellite connections */}
                {satellites.map((s, i) => {
                  if (!s.linked) return null;
                  const angle = (Math.PI * 2 * i) / satellites.length - Math.PI / 2;
                  const isExpanded = expandedSatellite === s.type;
                  const radius = isExpanded ? expandedRadius : radialRadius;
                  const x = center.x + radius * Math.cos(angle);
                  const y = center.y + radius * Math.sin(angle);
                  const stroke =
                    s.status === 'done' ? 'rgba(16,185,129,0.5)' :
                    s.status === 'blocked' ? 'rgba(239,68,68,0.5)' :
                    'rgba(245,158,11,0.5)';

                  return (
                    <g key={`line-${s.type}`}>
                      <path
                        d={`M ${center.x} ${center.y} Q ${(center.x + x) / 2} ${(center.y + y) / 2 - 20}, ${x} ${y}`}
                        stroke={stroke}
                        strokeWidth="2"
                        fill="none"
                      />
                      <circle cx={x} cy={y} r="4" fill={stroke} />
                    </g>
                  );
                })}

                {/* Expanded item connections */}
                {satellites.map((s, i) => {
                  if (expandedSatellite !== s.type || s.items.length === 0) return null;
                  const angle = (Math.PI * 2 * i) / satellites.length - Math.PI / 2;
                  const satelliteX = center.x + radialRadius * Math.cos(angle);
                  const satelliteY = center.y + radialRadius * Math.sin(angle);
                  
                  return s.items.slice(0, 5).map((item, itemIndex) => {
                    const itemCount = Math.min(s.items.length, 5);
                    const spreadAngle = 0.25;
                    const itemAngle = angle + ((itemIndex - (itemCount - 1) / 2) * spreadAngle);
                    const itemRadius = radialRadius + 120 + (itemIndex % 2) * 40;
                    const itemX = center.x + itemRadius * Math.cos(itemAngle);
                    const itemY = center.y + itemRadius * Math.sin(itemAngle);
                    
                    return (
                      <line
                        key={`item-line-${s.type}-${item.id}`}
                        x1={satelliteX}
                        y1={satelliteY}
                        x2={itemX}
                        y2={itemY}
                        stroke="rgba(120,120,120,0.3)"
                        strokeWidth="1"
                        strokeDasharray="4,4"
                      />
                    );
                  });
                })}
              </svg>

              {/* Central client node */}
              <div
                className="absolute flex flex-col items-center justify-center"
                style={{ left: center.x, top: center.y, transform: 'translate(-50%, -50%)' }}
              >
                {/* Completeness ring */}
                <svg 
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" 
                  width="180" 
                  height="180"
                >
                  <circle
                    cx="90"
                    cy="90"
                    r="82"
                    fill="none"
                    stroke="rgba(120,120,120,0.15)"
                    strokeWidth="6"
                  />
                  <circle
                    cx="90"
                    cy="90"
                    r="82"
                    fill="none"
                    strokeWidth="6"
                    strokeDasharray={`${completeness * 515} 515`}
                    strokeLinecap="round"
                    transform="rotate(-90 90 90)"
                    style={{
                      stroke: globalState === 'ok' ? '#10b981' : globalState === 'blocked' ? '#ef4444' : '#f59e0b',
                    }}
                  />
                </svg>

                <div className="relative w-36 h-36 rounded-full bg-card border-2 border-default shadow-xl flex flex-col items-center justify-center z-10">
                  {/* Logo */}
                  {radialClient.image?.url ? (
                    <img
                      src={`${apiUrl}${radialClient.image.url}`}
                      alt={radialClient.name}
                      className="w-14 h-14 rounded-full border border-default object-cover"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-hover text-primary font-bold text-xl flex items-center justify-center">
                      {radialClient.name?.slice(0, 2).toUpperCase() || 'CL'}
                    </div>
                  )}

                  {/* Name */}
                  <span className="mt-1.5 text-sm font-semibold text-primary text-center px-2 truncate max-w-full">
                    {radialClient.name}
                  </span>

                  {/* Global state badge */}
                  <div className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1 ${
                    globalState === 'ok' ? 'bg-success-light text-success' :
                    globalState === 'blocked' ? 'bg-danger-light text-danger' :
                    'bg-warning-light text-warning'
                  }`}>
                    {globalState === 'ok' ? <IconCheck className="w-3 h-3" /> :
                     globalState === 'blocked' ? <IconAlertTriangle className="w-3 h-3" /> :
                     <IconClock className="w-3 h-3" />}
                    {t(`workflow_state_${globalState}`) || GLOBAL_STATE_STYLES[globalState].label}
                  </div>

                  {/* Anchor points */}
                  {[0, 1, 2, 3].map(i => {
                    const anchorAngle = (Math.PI * 2 * i) / 4 - Math.PI / 2;
                    const ax = 68 * Math.cos(anchorAngle);
                    const ay = 68 * Math.sin(anchorAngle);
                    return (
                      <button
                        key={`anchor-${i}`}
                        type="button"
                        className="absolute w-4 h-4 rounded-full bg-accent shadow-md hover:scale-125 transition-transform cursor-crosshair"
                        style={{
                          left: `calc(50% + ${ax}px - 8px)`,
                          top: `calc(50% + ${ay}px - 8px)`,
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setIsLinking(true);
                          setLinkCursor({ x: center.x, y: center.y });
                        }}
                        title={t('workflow_drag_to_create') || 'Glissez vers un élément pour créer'}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Satellite nodes */}
              {satellites.map((satellite, index) => renderSatelliteNode(satellite, index, satellites.length))}
            </>
          ) : viewMode === 'timeline' ? (
            /* =============== TIMELINE VIEW =============== */
            <>
              {/* Stage headers */}
              {stages.map((stage, index) => {
                const Icon = stage.icon;
                const x = timelineLayout.startX + index * timelineLayout.stageGap;
                return (
                  <div
                    key={stage.id}
                    className="absolute flex items-center gap-2 text-xs text-muted uppercase tracking-wider"
                    style={{ left: x, top: 40 }}
                  >
                    <Icon className="w-4 h-4" />
                    {stage.label}
                  </div>
                );
              })}

              {/* Clients rows */}
              {filteredClients.map((client, rowIndex) => {
                const y = timelineLayout.startY + rowIndex * timelineLayout.rowGap;
                const rowKey = client.documentId || `client-${rowIndex}`;
                const stageStatuses = getStageStatuses(client.pipeline_status || null);
                return (
                  <div key={rowKey} className="absolute" style={{ left: 0, top: y }}>
                    <div
                      className="absolute w-[160px] pl-6"
                      style={{ top: 0, transform: 'translateY(-50%)' }}
                    >
                      <div className="text-xs text-muted mb-2">{client.enterprise || client.email}</div>
                      <div className="text-sm font-semibold text-primary">{client.name}</div>
                    </div>

                    {/* Nodes */}
                    {stages.map((stage, stageIndex) => {
                      const x = timelineLayout.startX + stageIndex * timelineLayout.stageGap;
                      const status = stageStatuses[stageIndex] || 'pending';
                      const isLastStage = stageIndex === stages.length - 1;
                      const displayStatus: NodeStatus = isLastStage && status === 'current' ? 'done' : status;
                      const statusClasses = STATUS_STYLES[displayStatus];
                      const Icon = stage.icon;

                      const nodeTop = -timelineLayout.nodeHeight / 2;
                      const isCurrent = status === 'current';
                      return (
                        <div
                          key={`${rowKey}-${stage.id}`}
                          onDoubleClick={() => focusNode(x + timelineLayout.nodeWidth / 2, y)}
                          onClick={() => {
                            if (dragMovedRef.current || isPanning) {
                              dragMovedRef.current = false;
                              return;
                            }
                            setActiveNode({ client, stageId: stage.id, stageLabel: stage.label, status: displayStatus });
                          }}
                          className={`absolute w-[220px] min-h-[72px] rounded-2xl border border-default ${statusClasses.background} ${statusClasses.ring} hover:shadow-md transition-all ${
                            isCurrent
                              ? isLastStage
                                ? 'border-success shadow-[0_0_0_6px_rgba(16,185,129,0.15)]'
                                : 'border-warning shadow-[0_0_0_6px_rgba(245,158,11,0.15)]'
                              : ''
                          }`}
                          style={{ left: x, top: nodeTop }}
                        >
                          {isCurrent && (
                            <div className="absolute -top-3 -right-3">
                              {client.image?.url ? (
                                <img
                                  src={`${apiUrl}${client.image.url}`}
                                  alt={client.name}
                                  className="w-6 h-6 rounded-full border border-accent bg-accent-light p-0.5 object-cover shadow-sm animate-pulse"
                                />
                              ) : (
                                <div className="w-6 h-6 rounded-full border border-warning bg-hover text-[10px] font-semibold text-secondary flex items-center justify-center shadow-sm">
                                  {client.name?.slice(0, 2).toUpperCase() || 'CL'}
                                </div>
                              )}
                            </div>
                          )}
                          <div className="p-3 flex items-center gap-2">
                            <span className="w-7 h-7 rounded-full border border-default flex items-center justify-center bg-white">
                              <span className={`w-3.5 h-3.5 rounded-full ${statusClasses.dot}`} />
                            </span>
                            <Icon className="w-4 h-4 text-muted" />
                            <span className="text-sm font-medium text-primary">{stage.label}</span>
                          </div>
                          <div className="px-3 pb-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] ${statusClasses.badge}`}>
                              {displayStatus === 'done'
                                ? (t('workflow_done') || 'Terminé')
                                : displayStatus === 'current'
                                  ? (t('workflow_current') || 'En cours')
                                  : displayStatus === 'blocked'
                                    ? (t('workflow_blocked') || 'Bloqué')
                                    : (t('workflow_pending') || 'À faire')}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {/* Connections */}
              <svg
                className="absolute inset-0 pointer-events-none"
                width={timelineLayout.contentWidth}
                height={timelineLayout.contentHeight}
              >
                {filteredClients.map((client, rowIndex) => {
                  const y = timelineLayout.startY + rowIndex * timelineLayout.rowGap;
                  const rowKey = client.documentId || `client-${rowIndex}`;
                  const stageStatuses = getStageStatuses(client.pipeline_status || null);
                  return stages.slice(0, -1).map((_, stageIndex) => {
                    const x1 = timelineLayout.startX + stageIndex * timelineLayout.stageGap + timelineLayout.nodeWidth;
                    const x2 = timelineLayout.startX + (stageIndex + 1) * timelineLayout.stageGap;
                    const status = stageStatuses[stageIndex] || 'pending';
                    const stroke =
                      status === 'done'
                        ? 'rgba(16,185,129,0.6)'
                        : status === 'current'
                          ? 'rgba(245,158,11,0.6)'
                          : status === 'blocked'
                            ? 'rgba(239,68,68,0.6)'
                            : 'rgba(120,120,120,0.35)';
                    const midX = x1 + (x2 - x1) / 2;
                    const curve = 20;
                    return (
                      <g key={`${rowKey}-line-${stageIndex}`}>
                        <path
                          d={`M ${x1} ${y} C ${midX} ${y - curve}, ${midX} ${y + curve}, ${x2} ${y}`}
                          stroke={stroke}
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          fill="none"
                        />
                        <circle cx={x1} cy={y} r="2.5" fill={stroke} />
                        <circle cx={x2} cy={y} r="2.5" fill={stroke} />
                      </g>
                    );
                  });
                })}
              </svg>
            </>
          ) : viewMode === 'radial' && clientId === 'all' ? (
            /* =============== MULTI-CLIENT RADIAL VIEW (Full design like single client) =============== */
            <>
              <AnimatePresence>
                {filteredClients.map((client, index) => {
                  const clientKey = client.documentId || `client-${index}`;
                  const pos = clientPositions[clientKey] || { x: 400 + (index % 3) * 600, y: 400 + Math.floor(index / 3) * 600 };
                  const isDragging = draggingClient === clientKey;
                  const isSelected = selectedClient?.documentId === client.documentId;
                  const stageStatuses = getStageStatuses(client.pipeline_status || null);
                  const currentStageIndex = stageStatuses.findIndex(s => s === 'current');
                  const globalClientState: GlobalState = stageStatuses.some(s => s === 'blocked') 
                    ? 'blocked' 
                    : currentStageIndex === stages.length - 1 
                      ? 'ok' 
                      : 'partial';

                  // Calculate completeness for this client
                  const doneCount = stageStatuses.filter(s => s === 'done').length;
                  const clientCompleteness = doneCount / stages.length;

                  // Satellites for this client with status based on pipeline
                  // Determine status based on pipeline stages
                  const getClientSatelliteStatus = (satType: string): NodeStatus => {
                    const pipelineIndex = pipelineToStageIndex[client.pipeline_status || 'new'] ?? 0;
                    if (satType === 'quote') {
                      return pipelineIndex >= 1 ? (pipelineIndex > 1 ? 'done' : 'current') : 'pending';
                    }
                    if (satType === 'contract') {
                      return pipelineIndex >= 2 ? (pipelineIndex > 2 ? 'done' : 'current') : 'pending';
                    }
                    if (satType === 'project') {
                      return pipelineIndex >= 3 ? (pipelineIndex > 3 ? 'done' : 'current') : 'pending';
                    }
                    if (satType === 'invoice') {
                      return pipelineIndex >= 4 ? (pipelineIndex > 4 ? 'done' : 'current') : 'pending';
                    }
                    return 'pending';
                  };
                  
                  const clientSatellites = [
                    { type: 'quote', label: t('quotes') || 'Devis', icon: IconFileText, angle: -Math.PI / 2, count: getClientSatelliteStatus('quote') !== 'pending' ? 1 : 0, status: getClientSatelliteStatus('quote') },
                    { type: 'invoice', label: t('invoices') || 'Factures', icon: IconFileInvoice, angle: 0, count: getClientSatelliteStatus('invoice') !== 'pending' ? 1 : 0, status: getClientSatelliteStatus('invoice') },
                    { type: 'contract', label: t('contracts') || 'Contrats', icon: IconSignature, angle: Math.PI / 2, count: getClientSatelliteStatus('contract') !== 'pending' ? 1 : 0, status: getClientSatelliteStatus('contract') },
                    { type: 'project', label: t('projects') || 'Projets', icon: IconBriefcase, angle: Math.PI, count: getClientSatelliteStatus('project') !== 'pending' ? 1 : 0, status: getClientSatelliteStatus('project') },
                  ];

                  const multiRadialRadius = 160; // Radius for satellites in multi-client mode

                  return (
                    <motion.div
                      key={clientKey}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ 
                        opacity: 1, 
                        scale: isDragging ? 1.05 : 1,
                        x: pos.x,
                        y: pos.y,
                        zIndex: isDragging ? 100 : isSelected ? 50 : 10,
                      }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      transition={{ 
                        type: 'spring', 
                        stiffness: isDragging ? 400 : 200, 
                        damping: isDragging ? 25 : 30,
                      }}
                      className="absolute"
                      style={{
                        left: 0,
                        top: 0,
                        cursor: isDragging ? 'grabbing' : 'grab',
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setDraggingClient(clientKey);
                        dragStartRef.current = { x: e.clientX, y: e.clientY };
                        dragMovedRef.current = false;
                      }}
                    >
                      {/* SVG Connections */}
                      <svg
                        className="absolute pointer-events-none"
                        style={{ left: -multiRadialRadius - 50, top: -multiRadialRadius - 50 }}
                        width={(multiRadialRadius + 50) * 2}
                        height={(multiRadialRadius + 50) * 2}
                      >
                        {clientSatellites.map((sat) => {
                          const x = (multiRadialRadius + 50) + multiRadialRadius * Math.cos(sat.angle);
                          const y = (multiRadialRadius + 50) + multiRadialRadius * Math.sin(sat.angle);
                          const cx = multiRadialRadius + 50;
                          const cy = multiRadialRadius + 50;
                          return (
                            <g key={`line-${sat.type}`}>
                              <path
                                d={`M ${cx} ${cy} Q ${(cx + x) / 2} ${(cy + y) / 2 - 15}, ${x} ${y}`}
                                stroke="rgba(99,102,241,0.3)"
                                strokeWidth="2"
                                fill="none"
                              />
                              <circle cx={cx} cy={cy} r="3" fill="rgba(99,102,241,0.6)" />
                              <circle cx={x} cy={y} r="3" fill="rgba(99,102,241,0.6)" />
                            </g>
                          );
                        })}
                      </svg>

                      {/* Satellites around this client - Same design as single client view */}
                      {clientSatellites.map((sat, satIndex) => {
                        const satX = multiRadialRadius * Math.cos(sat.angle);
                        const satY = multiRadialRadius * Math.sin(sat.angle);
                        const SatIcon = sat.icon;
                        
                        // Use unified color scheme like single client view
                        const statusColors = {
                          done: { bg: 'bg-success-light', border: 'border-success', icon: 'text-success', ring: 'shadow-[0_0_0_3px_rgba(16,185,129,0.15)]' },
                          current: { bg: 'bg-warning-light', border: 'border-warning', icon: 'text-warning', ring: 'shadow-[0_0_0_3px_rgba(245,158,11,0.15)]' },
                          blocked: { bg: 'bg-danger-light', border: 'border-danger', icon: 'text-danger', ring: 'shadow-[0_0_0_3px_rgba(239,68,68,0.15)]' },
                          pending: { bg: 'bg-muted/5', border: 'border-default', icon: 'text-muted', ring: '' },
                        };
                        const colors = statusColors[sat.status || 'pending'];
                        
                        return (
                          <motion.div
                            key={sat.type}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1 + satIndex * 0.08, type: 'spring', stiffness: 250 }}
                            className="absolute"
                            style={{
                              left: satX - 50,
                              top: satY - 50,
                            }}
                          >
                            <motion.div
                              whileHover={{ scale: 1.08 }}
                              whileTap={{ scale: 0.95 }}
                              className={`relative w-[100px] h-[100px] rounded-full ${colors.bg} border ${colors.border} ${colors.ring} cursor-pointer flex flex-col items-center justify-center transition-all`}
                            >
                              {/* Badge count */}
                              {sat.count > 0 && (
                                <motion.div 
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className={`absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                    sat.status === 'done' ? 'bg-success text-white' :
                                    sat.status === 'blocked' ? 'bg-danger text-white' :
                                    sat.status === 'current' ? 'bg-warning text-white' :
                                    'bg-muted text-secondary'
                                  }`}
                                >
                                  {sat.count}
                                </motion.div>
                              )}

                              {/* Icon */}
                              <div className="w-10 h-10 rounded-full bg-card border border-default shadow-sm flex items-center justify-center mb-1">
                                <SatIcon className={`w-5 h-5 ${colors.icon}`} />
                              </div>

                              {/* Label */}
                              <span className="text-[11px] font-medium text-primary text-center px-1">{sat.label}</span>

                              {/* Anchor point indicator if no items */}
                              {sat.count === 0 && (
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
                              )}
                            </motion.div>
                          </motion.div>
                        );
                      })}

                      {/* Central client node with completeness ring */}
                      <div className="absolute flex flex-col items-center justify-center" style={{ left: -90, top: -90, width: 180, height: 180 }}>
                        {/* Completeness ring */}
                        <svg 
                          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" 
                          width="180" 
                          height="180"
                        >
                          <circle
                            cx="90"
                            cy="90"
                            r="82"
                            fill="none"
                            stroke="rgba(120,120,120,0.15)"
                            strokeWidth="6"
                          />
                          <circle
                            cx="90"
                            cy="90"
                            r="82"
                            fill="none"
                            strokeWidth="6"
                            strokeDasharray={`${clientCompleteness * 515} 515`}
                            strokeLinecap="round"
                            transform="rotate(-90 90 90)"
                            style={{
                              stroke: globalClientState === 'ok' ? '#10b981' : globalClientState === 'blocked' ? '#ef4444' : '#f59e0b',
                            }}
                          />
                        </svg>

                        <motion.div
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.98 }}
                          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 rounded-full bg-card border-2 border-default shadow-xl flex flex-col items-center justify-center z-10 ${
                            isSelected ? 'border-4 border-accent' : ''
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!dragMovedRef.current) {
                              setSelectedClient(isSelected ? null : client);
                            }
                          }}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            const slug = generateClientSlug(client.name, client.documentId);
                            router.push(`/dashboard/clients/${slug}`);
                          }}
                        >
                          {/* Logo */}
                          {client.image?.url ? (
                            <img
                              src={`${apiUrl}${client.image.url}`}
                              alt={client.name}
                              className="w-14 h-14 rounded-full border border-default object-cover"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-full bg-hover text-primary font-bold text-xl flex items-center justify-center">
                              {client.name?.slice(0, 2).toUpperCase() || 'CL'}
                            </div>
                          )}

                          {/* Name */}
                          <span className="mt-1.5 text-sm font-semibold text-primary text-center px-2 truncate max-w-full">
                            {client.name}
                          </span>

                          {/* Global state badge */}
                          <motion.div 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.3, type: 'spring', stiffness: 400 }}
                            className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1 ${
                              globalClientState === 'ok' ? 'bg-success-light text-success' :
                              globalClientState === 'blocked' ? 'bg-danger-light text-danger' :
                              'bg-warning-light text-warning'
                            }`}
                          >
                            {globalClientState === 'ok' ? <IconCheck className="w-3 h-3" /> :
                             globalClientState === 'blocked' ? <IconAlertTriangle className="w-3 h-3" /> :
                             <IconClock className="w-3 h-3" />}
                            {globalClientState === 'ok' ? 'OK' : globalClientState === 'blocked' ? 'Bloqué' : 'Incomplet'}
                          </motion.div>

                          {/* Anchor points */}
                          {[0, 1, 2, 3].map(i => {
                            const anchorAngle = (Math.PI * 2 * i) / 4 - Math.PI / 2;
                            const ax = 68 * Math.cos(anchorAngle);
                            const ay = 68 * Math.sin(anchorAngle);
                            return (
                              <div
                                key={`anchor-${i}`}
                                className="absolute w-3 h-3 rounded-full bg-accent shadow-sm"
                                style={{
                                  left: `calc(50% + ${ax}px - 6px)`,
                                  top: `calc(50% + ${ay}px - 6px)`,
                                }}
                              />
                            );
                          })}
                        </motion.div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </>
          ) : null}
        </motion.div>
      </div>

      {/* Search bar (all clients modes) */}
      {clientId === 'all' && (
        <div className="absolute bottom-6 left-1/2 z-20 w-full max-w-md -translate-x-1/2 px-4">
          <div className="bg-card backdrop-blur border border-default rounded-full shadow-lg px-4 py-2.5">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('search_placeholder') || 'Rechercher un client...'}
              className="w-full bg-transparent text-sm text-primary placeholder:text-muted outline-none"
            />
          </div>
        </div>
      )}

      {/* Create modal (radial view) */}
      {createModal && radialClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-default rounded-xl shadow-2xl w-full max-w-md mx-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-default">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent-light flex items-center justify-center">
                  {createModal.type === 'quote' && <IconFileText className="w-5 h-5 !text-accent" />}
                  {createModal.type === 'invoice' && <IconFileInvoice className="w-5 h-5 !text-accent" />}
                  {createModal.type === 'contract' && <IconSignature className="w-5 h-5 !text-accent" />}
                  {createModal.type === 'project' && <IconBriefcase className="w-5 h-5 !text-accent" />}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-primary">{createModal.label}</h3>
                  <p className="text-xs text-muted">{t('workflow_create_for_client') || 'Création pour'} {radialClient.name}</p>
                </div>
              </div>
              <button
                onClick={() => setCreateModal(null)}
                className="p-2 rounded-lg text-muted hover:text-primary hover:bg-hover"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <p className="text-sm text-secondary mb-6">
                {t('workflow_create_confirm') || 'Voulez-vous créer'}{' '}
                <span className="font-medium text-primary">{creationLabels[createModal.type]}</span>{' '}
                {t('workflow_create_for') || 'pour'}{' '}
                <span className="font-medium text-primary">{radialClient.name}</span> ?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCreateModal(null)}
                  className="px-4 py-2.5 rounded-lg border border-default text-sm font-medium text-secondary hover:text-primary hover:bg-hover transition-colors"
                >
                  {t('cancel') || 'Annuler'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const route = creationRoutes[createModal.type];
                    setCreateModal(null);
                    router.push(route);
                  }}
                  className="px-5 py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  {t('workflow_create_action') || 'Créer'} {creationLabels[createModal.type]}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Node details modal (timeline view) */}
      {activeNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-default rounded-xl shadow-2xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-5 border-b border-default">
              <div>
                <p className="text-xs text-muted">{t('workflow_node_details') || 'Détails du node'}</p>
                <h3 className="text-lg font-semibold text-primary">{activeNode.stageLabel}</h3>
              </div>
              <button
                onClick={() => setActiveNode(null)}
                className="p-2 rounded-lg text-muted hover:text-primary hover:bg-hover"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              {[
                { label: t('client') || 'Client', value: activeNode.client.name },
                { label: t('email') || 'Email', value: activeNode.client.email },
                { label: t('phone') || 'Téléphone', value: activeNode.client.phone },
                { label: t('company') || 'Entreprise', value: activeNode.client.enterprise },
                { label: t('status') || 'Statut', value: getPipelineLabel(activeNode.client.pipeline_status) },
                { label: t('next_action') || 'Prochaine action', value: activeNode.client.next_action },
                { label: t('next_action_date') || 'Date', value: formatDate(activeNode.client.next_action_date) },
                { label: t('budget') || 'Budget', value: formatCurrency(activeNode.client.budget) },
                { label: t('estimated_value') || 'Valeur estimée', value: formatCurrency(activeNode.client.estimated_value) },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-sm text-muted">{item.label}</span>
                  <span className={`text-sm font-medium ${item.value ? 'text-primary' : 'text-primary opacity-50 italic text-xs !font-light'}`}>
                    {item.value || (t('not_specified') || 'Non renseigné')}
                  </span>
                </div>
              ))}
              <div className="p-3 rounded-lg bg-hover text-sm text-secondary">
                {activeNode.client.notes || (t('workflow_node_placeholder') || 'Zone de détails du devis/contrat/projet/facture.')}
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    const slug = generateClientSlug(activeNode.client.name, activeNode.client.documentId);
                    router.push(`/dashboard/clients/${slug}`);
                  }}
                  className="px-4 py-2 rounded-lg bg-accent text-white text-sm hover:opacity-90"
                >
                  {t('open_details') || 'Ouvrir la fiche'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
