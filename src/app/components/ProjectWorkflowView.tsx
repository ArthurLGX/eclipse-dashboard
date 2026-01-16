'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconCheck,
  IconClock,
  IconAlertTriangle,
  IconCircleDashed,
  IconFileText,
  IconFileInvoice,
  IconSignature,
  IconRocket,
  IconPackage,
  IconSettings,
  IconPlus,
  IconZoomIn,
  IconZoomOut,
  IconFocus2,
  IconMaximize,
  IconMinimize,
  IconMail,
  IconNote,
  IconFile,
  IconClock2,
  IconChevronRight,
  IconArrowRight,
  IconHelpCircle,
} from '@tabler/icons-react';
import type { Client, Project, Facture } from '@/types';
import { useLanguage } from '@/app/context/LanguageContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import OnboardingTour, { useOnboardingStatus, type OnboardingStep } from './OnboardingTour';

// ============================================================================
// TYPES
// ============================================================================

type WorkflowStage = 'qualification' | 'quote' | 'contract' | 'execution' | 'invoicing' | 'delivery' | 'maintenance';
type NodeStatus = 'done' | 'current' | 'pending' | 'blocked' | 'ghost';

interface WorkflowNode {
  id: string;
  stage: WorkflowStage;
  type: 'main' | 'secondary';
  label: string;
  status: NodeStatus;
  icon: React.FC<{ className?: string; size?: number }>;
  count?: number;
  items?: Array<{ id: string; label: string; status: string; href?: string }>;
  action?: () => void;
}

interface ProjectWorkflowViewProps {
  client: Client;
  project: Project;
  quotes?: Facture[];
  invoices?: Facture[];
  contracts?: Array<{ id: number; documentId: string; title?: string; status?: string }>;
  onBack?: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STAGE_CONFIG: Record<WorkflowStage, { label: string; icon: React.FC<{ className?: string; size?: number }> }> = {
  qualification: { label: 'Qualification', icon: IconCheck },
  quote: { label: 'Devis', icon: IconFileText },
  contract: { label: 'Contrat', icon: IconSignature },
  execution: { label: 'Exécution', icon: IconRocket },
  invoicing: { label: 'Facturation', icon: IconFileInvoice },
  delivery: { label: 'Livraison', icon: IconPackage },
  maintenance: { label: 'Suivi', icon: IconSettings },
};

const STATUS_STYLES: Record<NodeStatus, { bg: string; border: string; text: string; icon: React.FC<{ className?: string; size?: number }> }> = {
  done: { 
    bg: 'bg-success-light', 
    border: 'border-success', 
    text: 'text-success',
    icon: IconCheck,
  },
  current: { 
    bg: 'bg-warning-light', 
    border: 'border-warning', 
    text: 'text-warning',
    icon: IconClock,
  },
  pending: { 
    bg: 'bg-muted', 
    border: 'border-default', 
    text: 'text-muted',
    icon: IconCircleDashed,
  },
  blocked: { 
    bg: 'bg-danger-light', 
    border: 'border-danger', 
    text: 'text-danger',
    icon: IconAlertTriangle,
  },
  ghost: { 
    bg: 'bg-transparent', 
    border: 'border-dashed border-muted', 
    text: 'text-muted',
    icon: IconPlus,
  },
};

const STAGES_ORDER: WorkflowStage[] = ['qualification', 'quote', 'contract', 'execution', 'invoicing', 'delivery', 'maintenance'];

// ============================================================================
// COMPONENT
// ============================================================================

export default function ProjectWorkflowView({
  client,
  project,
  quotes = [],
  invoices = [],
  contracts = [],
  onBack,
}: ProjectWorkflowViewProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // State
  const [scale, setScale] = useState(0.9);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [expandedStage, setExpandedStage] = useState<WorkflowStage | null>(null);
  
  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { isCompleted: onboardingCompleted, reset: resetOnboarding } = useOnboardingStatus('project-workflow-tour');
  
  // Onboarding steps - focused on project execution
  const onboardingSteps: OnboardingStep[] = useMemo(() => [
    {
      id: 'intro',
      position: 'center',
      title: t('onboarding_project_workflow_intro_title') || 'Le workflow de ce projet',
      description: t('onboarding_project_workflow_intro_desc') || 'Cette vue montre tout ce qui a été fait et reste à faire pour CE projet spécifiquement.',
      microCopy: t('onboarding_project_workflow_intro_micro') || 'Contrairement au pipeline (vue globale), ici vous êtes dans le concret.',
      highlightStyle: 'glow',
    },
    {
      id: 'breadcrumb',
      target: '[data-onboarding="breadcrumb"]',
      position: 'bottom',
      title: t('onboarding_project_workflow_breadcrumb_title') || 'Vous savez toujours où vous êtes',
      description: t('onboarding_project_workflow_breadcrumb_desc') || 'Le fil d\'Ariane indique le client et le projet actuels. Cliquez pour revenir en arrière.',
      highlightStyle: 'pulse',
    },
    {
      id: 'main-line',
      target: '[data-onboarding="main-line"]',
      position: 'bottom',
      title: t('onboarding_project_workflow_mainline_title') || 'La ligne principale',
      description: t('onboarding_project_workflow_mainline_desc') || 'Les 7 étapes représentent le cycle de vie complet d\'un projet : de la qualification au suivi.',
      microCopy: t('onboarding_project_workflow_mainline_micro') || 'Qualification → Devis → Contrat → Exécution → Facturation → Livraison → Suivi',
    },
    {
      id: 'done-node',
      target: '[data-onboarding="node-done"]',
      position: 'bottom',
      title: t('onboarding_project_workflow_done_title') || 'Étapes terminées',
      description: t('onboarding_project_workflow_done_desc') || 'Le vert indique que cette étape est complète. Vous avez déjà validé cette partie.',
      highlightStyle: 'glow',
    },
    {
      id: 'current-node',
      target: '[data-onboarding="node-current"]',
      position: 'top',
      title: t('onboarding_project_workflow_current_title') || 'Étape en cours',
      description: t('onboarding_project_workflow_current_desc') || 'L\'orange montre où vous en êtes actuellement dans ce projet.',
      highlightStyle: 'pulse',
    },
    {
      id: 'ghost-node',
      target: '[data-onboarding="node-ghost"]',
      position: 'top',
      title: t('onboarding_project_workflow_ghost_title') || 'Éléments à créer',
      description: t('onboarding_project_workflow_ghost_desc') || 'Les nodes gris en pointillés indiquent ce qui peut être créé. Cliquez pour ajouter un devis, contrat ou facture.',
      microCopy: t('onboarding_project_workflow_ghost_micro') || 'L\'absence n\'est pas un bug, c\'est une information utile.',
      ctaText: t('onboarding_project_workflow_ghost_cta') || 'Créer un élément',
      highlightStyle: 'glow',
    },
    {
      id: 'count-badge',
      target: '[data-onboarding="count-badge"]',
      position: 'bottom',
      title: t('onboarding_project_workflow_count_title') || 'Nombre d\'éléments',
      description: t('onboarding_project_workflow_count_desc') || 'Le badge indique combien de documents existent pour cette étape. Cliquez pour les voir.',
    },
    {
      id: 'final',
      position: 'center',
      title: t('onboarding_project_workflow_final_title') || 'Vous êtes prêt !',
      description: t('onboarding_project_workflow_final_desc') || 'Ce workflow vous montre l\'exécution concrète de votre projet. Le pipeline reste pour la vision globale.',
      microCopy: t('onboarding_project_workflow_final_micro') || '👉 Pipeline = "Où en est la relation ?" | Workflow = "Qu\'est-ce qui a été fait ?"',
      ctaText: t('onboarding_project_workflow_final_cta') || 'Compris ✓',
    },
  ], [t]);
  
  // Trigger onboarding on first visit
  useEffect(() => {
    if (!onboardingCompleted) {
      const timer = setTimeout(() => setShowOnboarding(true), 500);
      return () => clearTimeout(timer);
    }
  }, [onboardingCompleted]);

  // Compute project status to determine current stage
  const currentStageIndex = useMemo(() => {
    const status = project.project_status;
    switch (status) {
      case 'completed': return 6; // maintenance
      case 'in_progress': return 3; // execution
      case 'planning': return 2; // contract
      case 'archived': return 6;
      default: return 0; // qualification
    }
  }, [project.project_status]);

  // Build workflow nodes from real data
  const workflowNodes = useMemo((): WorkflowNode[] => {
    const nodes: WorkflowNode[] = [];
    
    // Helper to determine stage status
    const getStageStatus = (stageIndex: number): NodeStatus => {
      if (stageIndex < currentStageIndex) return 'done';
      if (stageIndex === currentStageIndex) return 'current';
      return 'pending';
    };

    // Main stages
    STAGES_ORDER.forEach((stage, index) => {
      const config = STAGE_CONFIG[stage];
      let status = getStageStatus(index);
      let count = 0;
      let items: WorkflowNode['items'] = [];

      // Special handling for each stage based on real data
      switch (stage) {
        case 'qualification':
          // Qualification is done if project exists
          status = 'done';
          break;
          
        case 'quote':
          count = quotes.length;
          if (quotes.length === 0) {
            status = index <= currentStageIndex ? 'ghost' : 'pending';
          } else {
            const accepted = quotes.filter(q => q.quote_status === 'accepted').length;
            const rejected = quotes.some(q => q.quote_status === 'rejected');
            if (rejected) status = 'blocked';
            else if (accepted === quotes.length && quotes.length > 0) status = 'done';
            else if (accepted > 0) status = 'current';
            items = quotes.map(q => ({
              id: q.documentId,
              label: q.reference || `Devis #${q.number || q.id}`,
              status: q.quote_status || 'draft',
              href: `/dashboard/factures/${q.documentId}`,
            }));
          }
          break;
          
        case 'contract':
          count = contracts.length;
          if (contracts.length === 0) {
            status = quotes.some(q => q.quote_status === 'accepted') ? 'ghost' : 'pending';
          } else {
            const signed = contracts.filter(c => c.status === 'signed').length;
            if (signed === contracts.length && contracts.length > 0) status = 'done';
            else if (signed > 0) status = 'current';
            items = contracts.map(c => ({
              id: c.documentId,
              label: c.title || `Contrat #${c.id}`,
              status: c.status || 'draft',
              href: `/dashboard/contracts/${c.documentId}`,
            }));
          }
          break;
          
        case 'execution':
          status = project.project_status === 'in_progress' ? 'current' 
                 : project.project_status === 'completed' ? 'done'
                 : 'pending';
          break;
          
        case 'invoicing':
          count = invoices.length;
          if (invoices.length === 0) {
            status = project.project_status === 'in_progress' || project.project_status === 'completed' ? 'ghost' : 'pending';
          } else {
            const paid = invoices.filter(i => i.facture_status === 'paid').length;
            const overdue = invoices.some(i => i.facture_status === 'overdue');
            if (overdue) status = 'blocked';
            else if (paid === invoices.length && invoices.length > 0) status = 'done';
            else if (paid > 0 || invoices.length > 0) status = 'current';
            items = invoices.map(i => ({
              id: i.documentId,
              label: i.reference || `Facture #${i.number || i.id}`,
              status: i.facture_status || 'draft',
              href: `/dashboard/factures/${i.documentId}`,
            }));
          }
          break;
          
        case 'delivery':
          status = project.project_status === 'completed' ? 'done' 
                 : project.project_status === 'in_progress' ? 'current' 
                 : 'pending';
          break;
          
        case 'maintenance':
          status = project.project_status === 'completed' ? 'current' : 'pending';
          break;
      }

      nodes.push({
        id: `main-${stage}`,
        stage,
        type: 'main',
        label: t(`workflow_stage_${stage}`) || config.label,
        status,
        icon: config.icon,
        count: count > 0 ? count : undefined,
        items: items.length > 0 ? items : undefined,
      });
    });

    return nodes;
  }, [project, quotes, invoices, contracts, currentStageIndex, t]);

  // Zoom controls
  const handleZoomIn = () => setScale(s => Math.min(s + 0.1, 2));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.1, 0.3));
  const handleReset = () => {
    setScale(0.9);
    setOffset({ x: 0, y: 0 });
  };

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    setOffset({
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y,
    });
  }, [isPanning, panStart]);

  const handleMouseUp = () => setIsPanning(false);

  // Wheel zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setScale(s => Math.min(Math.max(s + delta, 0.3), 2));
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Node click handler
  const handleNodeClick = (node: WorkflowNode) => {
    if (node.status === 'ghost') {
      // Open create modal based on stage
      switch (node.stage) {
        case 'quote':
          router.push(`/dashboard/factures/new?type=quote&client=${client.documentId}&project=${project.documentId}`);
          break;
        case 'contract':
          router.push(`/dashboard/contracts/new?client=${client.documentId}&project=${project.documentId}`);
          break;
        case 'invoicing':
          router.push(`/dashboard/factures/new?type=invoice&client=${client.documentId}&project=${project.documentId}`);
          break;
      }
    } else if (node.items && node.items.length > 0) {
      setExpandedStage(expandedStage === node.stage ? null : node.stage);
    }
  };

  return (
    <div className="flex flex-col" style={{ minHeight: '600px', height: '70vh' }}>
      {/* Breadcrumb contextuel */}
      <div className="flex-shrink-0 px-4 py-3 bg-card border-b border-default">
        <div className="flex items-center justify-between">
          <div data-onboarding="breadcrumb" className="flex items-center gap-2 text-sm">
            {onBack && (
              <button
                onClick={onBack}
                className="p-1.5 rounded-lg hover:bg-hover text-muted hover:text-primary transition-colors"
              >
                <IconArrowRight className="rotate-180" size={18} />
              </button>
            )}
            <Link 
              href={`/dashboard/clients/${client.documentId}`}
              className="text-muted hover:text-accent transition-colors"
            >
              {client.name}
            </Link>
            <IconChevronRight size={14} className="text-muted" />
            <span className="font-medium text-primary">{project.title}</span>
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
              project.project_status === 'completed' ? 'bg-success-light text-success' :
              project.project_status === 'in_progress' ? 'bg-warning-light text-warning' :
              project.project_status === 'archived' ? 'bg-muted text-secondary' :
              'bg-info-light text-info'
            }`}>
              {
                project.project_status === 'planning' ? (t('project_status_planning') || 'Planification') :
                project.project_status === 'in_progress' ? (t('project_status_in_progress') || 'En cours') :
                project.project_status === 'completed' ? (t('project_status_completed') || 'Terminé') :
                project.project_status === 'archived' ? (t('project_status_archived') || 'Archivé') :
                project.project_status === 'on_hold' ? (t('project_status_on_hold') || 'En pause') :
                project.project_status
              }
            </span>
          </div>
          
          {/* Controls */}
          <div className="flex items-center gap-1">
            {/* Replay onboarding */}
            {onboardingCompleted && (
              <button
                onClick={() => {
                  resetOnboarding();
                  setShowOnboarding(true);
                }}
                className="p-1.5 rounded-lg hover:bg-hover text-muted hover:text-accent transition-colors flex items-center gap-1"
                title={t('replay_tutorial') || 'Revoir le tutoriel'}
              >
                <IconHelpCircle size={18} />
              </button>
            )}
            <div className="w-px h-4 bg-default mx-1" />
            <button onClick={handleZoomOut} className="p-1.5 rounded-lg hover:bg-hover text-muted" title="Zoom -">
              <IconZoomOut size={18} />
            </button>
            <span className="text-xs text-muted w-12 text-center">{Math.round(scale * 100)}%</span>
            <button onClick={handleZoomIn} className="p-1.5 rounded-lg hover:bg-hover text-muted" title="Zoom +">
              <IconZoomIn size={18} />
            </button>
            <button onClick={handleReset} className="p-1.5 rounded-lg hover:bg-hover text-muted" title="Reset">
              <IconFocus2 size={18} />
            </button>
            <button onClick={toggleFullscreen} className="p-1.5 rounded-lg hover:bg-hover text-muted" title="Fullscreen">
              {isFullscreen ? <IconMinimize size={18} /> : <IconMaximize size={18} />}
            </button>
          </div>
        </div>
        
        {/* Hint text */}
        <p className="text-xs text-muted mt-1">
          {t('workflow_project_hint') || 'Cette vue montre l\'exécution concrète de ce projet. Les nodes gris indiquent ce qui peut être créé.'}
        </p>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden bg-page cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        tabIndex={0}
      >
        {/* Grid background */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `
              linear-gradient(to right, var(--color-border) 1px, transparent 1px),
              linear-gradient(to bottom, var(--color-border) 1px, transparent 1px)
            `,
            backgroundSize: `${40 * scale}px ${40 * scale}px`,
            backgroundPosition: `${offset.x}px ${offset.y}px`,
          }}
        />

        {/* Workflow canvas */}
        <div
          ref={canvasRef}
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: 'center center',
          }}
        >
          {/* Main workflow line */}
          <div data-onboarding="main-line" className="relative flex items-center gap-4">
            {workflowNodes.map((node, index) => {
              const styles = STATUS_STYLES[node.status];
              const StatusIcon = styles.icon;
              const NodeIcon = node.icon;
              const isExpanded = expandedStage === node.stage;
              const isHovered = hoveredNode === node.id;
              const isGhost = node.status === 'ghost';
              
              // Determine onboarding target based on status
              const getOnboardingAttr = () => {
                if (isGhost) return 'node-ghost';
                if (node.status === 'done') return 'node-done';
                if (node.status === 'current') return 'node-current';
                if (node.status === 'blocked') return 'node-blocked';
                return undefined;
              };

              return (
                <React.Fragment key={node.id}>
                  {/* Connection line */}
                  {index > 0 && (
                    <div className={`w-12 h-0.5 ${
                      workflowNodes[index - 1].status === 'done' ? 'bg-success' : 'bg-muted'
                    } ${workflowNodes[index - 1].status !== 'done' ? 'border-dashed border-t-2 border-muted bg-transparent' : ''}`} />
                  )}

                  {/* Node */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative"
                    onMouseEnter={() => setHoveredNode(node.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                    data-onboarding={getOnboardingAttr()}
                  >
                    {/* Main node card */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleNodeClick(node)}
                      className={`
                        relative flex flex-col items-center p-4 rounded-xl border-2 min-w-[120px]
                        transition-all duration-200 cursor-pointer
                        ${styles.bg} ${styles.border}
                        ${isGhost ? 'border-dashed hover:border-accent hover:bg-accent-light' : ''}
                        ${isHovered ? 'shadow-lg' : 'shadow-sm'}
                      `}
                    >
                      {/* Status indicator */}
                      <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full ${styles.bg} border-2 ${styles.border} flex items-center justify-center`}>
                        <StatusIcon size={12} className={styles.text} />
                      </div>

                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-full ${isGhost ? 'bg-muted' : styles.bg} flex items-center justify-center mb-2`}>
                        <NodeIcon size={20} className={isGhost ? 'text-muted' : styles.text} />
                      </div>

                      {/* Label */}
                      <span className={`text-sm font-medium ${isGhost ? 'text-muted' : 'text-primary'}`}>
                        {node.label}
                      </span>

                      {/* Count badge */}
                      {node.count !== undefined && node.count > 0 && (
                        <span data-onboarding="count-badge" className={`mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${styles.bg} ${styles.text}`}>
                          {node.count}
                        </span>
                      )}

                      {/* Ghost hint */}
                      {isGhost && (
                        <span className="mt-1 text-xs text-muted flex items-center gap-1">
                          <IconPlus size={12} /> Créer
                        </span>
                      )}
                    </motion.button>

                    {/* Expanded items dropdown */}
                    <AnimatePresence>
                      {isExpanded && node.items && node.items.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 bg-card border border-default rounded-lg shadow-xl p-2 min-w-[180px]"
                        >
                          {node.items.map((item) => (
                            <Link
                              key={item.id}
                              href={item.href || '#'}
                              className="flex items-center justify-between p-2 rounded-lg hover:bg-hover text-sm"
                            >
                              <span className="text-primary truncate">{item.label}</span>
                              <span className={`px-1.5 py-0.5 rounded text-xs ${
                                item.status === 'paid' || item.status === 'accepted' || item.status === 'signed' 
                                  ? 'bg-success-light text-success'
                                  : item.status === 'overdue' || item.status === 'rejected'
                                    ? 'bg-danger-light text-danger'
                                    : 'bg-warning-light text-warning'
                              }`}>
                                {item.status}
                              </span>
                            </Link>
                          ))}
                          
                          {/* Add new button */}
                          <button
                            onClick={() => handleNodeClick({ ...node, status: 'ghost' })}
                            className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-accent-light text-accent text-sm mt-1 border-t border-default pt-2"
                          >
                            <IconPlus size={14} />
                            Ajouter
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Secondary nodes (attachable elements) */}
                    {(node.stage === 'execution' || node.stage === 'quote' || node.stage === 'invoicing') && (
                      <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 flex gap-2">
                        {[
                          { icon: IconMail, label: 'Emails', color: 'text-info' },
                          { icon: IconNote, label: 'Notes', color: 'text-warning' },
                          { icon: IconFile, label: 'Docs', color: 'text-accent' },
                          { icon: IconClock2, label: 'Time', color: 'text-success' },
                        ].map((secondary) => (
                          <button
                            key={secondary.label}
                            className="p-1.5 rounded-lg bg-card border border-default hover:border-accent hover:bg-hover transition-colors"
                            title={secondary.label}
                          >
                            <secondary.icon size={14} className={secondary.color} />
                          </button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-card border border-default rounded-lg p-3 text-xs space-y-1.5">
          <div className="font-medium text-primary mb-2">{t('legend') || 'Légende'}</div>
          <div className="flex items-center gap-2">
            <IconCheck size={14} className="text-success" />
            <span className="text-secondary">{t('status_done') || 'Fait'}</span>
          </div>
          <div className="flex items-center gap-2">
            <IconClock size={14} className="text-warning" />
            <span className="text-secondary">{t('status_in_progress') || 'En cours'}</span>
          </div>
          <div className="flex items-center gap-2">
            <IconAlertTriangle size={14} className="text-danger" />
            <span className="text-secondary">{t('status_blocked') || 'Bloqué'}</span>
          </div>
          <div className="flex items-center gap-2">
            <IconCircleDashed size={14} className="text-muted" />
            <span className="text-secondary">{t('status_to_create') || 'À créer'}</span>
          </div>
        </div>
      </div>
      
      {/* Onboarding Tour */}
      {showOnboarding && (
        <OnboardingTour
          tourId="project-workflow-tour"
          steps={onboardingSteps}
          onComplete={() => setShowOnboarding(false)}
          onSkip={() => setShowOnboarding(false)}
          forceShow={showOnboarding}
        />
      )}
    </div>
  );
}

// ============================================================================
// PROJECT SELECTOR (for multi-projects)
// ============================================================================

interface ProjectSelectorProps {
  client: Client;
  projects: Project[];
  onSelectProject: (project: Project) => void;
}

export function ProjectSelector({ client, projects, onSelectProject }: ProjectSelectorProps) {
  const { t } = useLanguage();

  // Helper to strip HTML tags from description
  const stripHtml = (html: string) => {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  };

  // Helper for project status label
  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      planning: t('project_status_planning') || 'Planification',
      in_progress: t('project_status_in_progress') || 'En cours',
      completed: t('project_status_completed') || 'Terminé',
      archived: t('project_status_archived') || 'Archivé',
      on_hold: t('project_status_on_hold') || 'En pause',
    };
    return labels[status] || status;
  };

  return (
    <div className="flex flex-col items-center justify-center p-8" style={{ minHeight: '500px' }}>
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-primary mb-2">
            {t('select_project_title') || 'Sélectionnez un projet'}
          </h2>
          <p className="text-secondary">
            {t('select_project_desc') || `${client.name} a ${projects.length} projets. Choisissez celui dont vous voulez voir le workflow.`}
          </p>
        </div>

        {/* Project cards */}
        <div className="grid gap-4">
          {projects.map((project) => {
            const cleanDescription = stripHtml(project.description || '');
            
            return (
              <motion.button
                key={project.documentId}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelectProject(project)}
                className="w-full p-4 bg-card border border-default rounded-xl hover:border-accent hover:shadow-lg transition-all text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0 pr-4">
                    <h3 className="font-semibold text-primary">{project.title}</h3>
                    {cleanDescription && (
                      <p className="text-sm text-secondary mt-1 truncate">
                        {cleanDescription.slice(0, 100)}
                        {cleanDescription.length > 100 ? '...' : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                      project.project_status === 'completed' ? 'bg-success-light text-success' :
                      project.project_status === 'in_progress' ? 'bg-warning-light text-warning' :
                      project.project_status === 'archived' ? 'bg-muted text-secondary' :
                      'bg-info-light text-info'
                    }`}>
                      {getStatusLabel(project.project_status)}
                    </span>
                    <IconChevronRight size={20} className="text-muted" />
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Info message */}
        <p className="text-center text-xs text-muted mt-6">
          {t('workflow_project_info') || '👉 Un workflow représente l\'exécution concrète d\'un projet, pas la relation client globale.'}
        </p>
      </div>
    </div>
  );
}

