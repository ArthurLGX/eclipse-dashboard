'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  IconCheck,
  IconX,
  IconAlertTriangle,
  IconArrowRight,
  IconEye,
  IconEyeOff,
  IconLayoutGrid,
} from '@tabler/icons-react';
import { useLanguage } from '@/app/context/LanguageContext';
import type { DetectedSection, IdealSection } from '@/app/api/audit/route';

interface WireframeComparisonProps {
  detectedSections: DetectedSection[];
  idealSections: IdealSection[];
  screenshotViewport?: string;
  url: string;
}

// Colors for different section types
const SECTION_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  navigation: { bg: 'bg-info-light', border: 'border-info', text: 'text-info' },
  hero: { bg: 'bg-accent-light', border: 'border-accent', text: 'text-accent' },
  proof: { bg: 'bg-success-light', border: 'border-success', text: 'text-success' },
  problem: { bg: 'bg-warning-light', border: 'border-warning', text: 'text-warning' },
  solution: { bg: 'bg-primary-light', border: 'border-primary', text: 'text-color-primary' },
  features: { bg: 'bg-info-light', border: 'border-info', text: 'text-info' },
  cta: { bg: 'bg-success-light', border: 'border-success', text: 'text-success' },
  pricing: { bg: 'bg-warning-light', border: 'border-warning', text: 'text-warning' },
  faq: { bg: 'bg-info-light', border: 'border-info', text: 'text-info' },
  footer: { bg: 'bg-muted', border: 'border-default', text: 'text-muted' },
  unknown: { bg: 'bg-hover', border: 'border-default', text: 'text-secondary' },
};

export default function WireframeComparison({
  detectedSections,
  idealSections,
  screenshotViewport,
  url,
}: WireframeComparisonProps) {
  const { t } = useLanguage();
  const [showOverlay, setShowOverlay] = useState(true);
  const [activeTab, setActiveTab] = useState<'comparison' | 'overlay'>('comparison');

  // Calculate detected vs ideal sections
  const detectedMap = new Map(detectedSections.map(s => [s.type, s]));
  const missingCritical = idealSections.filter(
    s => s.importance === 'critical' && !detectedMap.get(s.type)?.detected
  );
  const missingImportant = idealSections.filter(
    s => s.importance === 'important' && !detectedMap.get(s.type)?.detected
  );

  // Score for structure
  const totalCritical = idealSections.filter(s => s.importance === 'critical').length;
  const foundCritical = totalCritical - missingCritical.length;
  const structureScore = Math.round((foundCritical / totalCritical) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 bg-muted flex items-center justify-between border-b border-default">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-accent-light rounded-lg">
            <IconLayoutGrid className="w-4 h-4 !text-accent" />
          </div>
          <div>
            <h4 className="font-semibold !text-primary !text-sm">
              {t('wireframe_comparison') || 'Comparaison Wireframe'}
            </h4>
            <p className="!text-xs !text-muted">
              {t('structure_analysis') || 'Analyse de structure'}
            </p>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-card rounded-lg p-1 border border-default">
          <button
            onClick={() => setActiveTab('comparison')}
            className={`px-3 py-1.5 !text-xs font-medium rounded-md transition-colors ${
              activeTab === 'comparison'
                ? 'bg-accent !text-white'
                : 'text-muted hover:!text-primary'
            }`}
          >
            {t('before_after') || 'Avant / Après'}
          </button>
          <button
            onClick={() => setActiveTab('overlay')}
            className={`px-3 py-1.5 !text-xs font-medium rounded-md transition-colors ${
              activeTab === 'overlay'
                ? 'bg-accent !text-white'
                : 'text-muted hover:!text-primary'
            }`}
          >
            {t('overlay') || 'Overlay'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'comparison' ? (
          /* Comparison View - Before/After */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Structure (Before) */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-1 bg-danger-light !text-danger !text-xs font-medium rounded-full">
                  {t('current_structure') || 'Structure actuelle'}
                </span>
                <span className="!text-xs !text-muted">
                  {detectedSections.filter(s => s.detected).length} / {idealSections.length} sections
                </span>
              </div>
              
              <div className="relative bg-muted rounded-lg p-4 min-h-[400px] border border-default">
                {/* Wireframe blocks - Current */}
                <div className="space-y-2">
                  {detectedSections
                    .filter(s => s.detected)
                    .sort((a, b) => (a.position?.top || 0) - (b.position?.top || 0))
                    .map((section, index) => {
                      const colors = SECTION_COLORS[section.type] || SECTION_COLORS.unknown;
                      const height = Math.max(section.position?.height || 10, 8);
                      
                      return (
                        <motion.div
                          key={section.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={`${colors.bg} border ${colors.border} rounded-lg p-3 flex items-center justify-between`}
                          style={{ minHeight: `${Math.min(height * 0.5, 60)}px` }}
                        >
                          <div className="flex items-center gap-2">
                            <IconCheck className={`w-4 h-4 ${colors.text}`} />
                            <span className={`text-sm font-medium ${colors.text}`}>
                              {section.name}
                            </span>
                          </div>
                          {section.position && (
                            <span className="!text-xs !text-muted">
                              {section.position.top}%
                            </span>
                          )}
                        </motion.div>
                      );
                    })}
                  
                  {/* Missing sections indicator */}
                  {missingCritical.length > 0 && (
                    <div className="border-2 border-dashed border-danger rounded-lg p-3 mt-4">
                      <div className="flex items-center gap-2 !text-danger mb-2">
                        <IconX className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          {t('missing_critical') || 'Sections critiques manquantes'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {missingCritical.map(s => (
                          <span key={s.id} className="px-2 py-0.5 bg-danger-light !text-danger !text-xs rounded">
                            {s.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Ideal Structure (After) */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-1 bg-success-light !text-success-text -text !text-xs font-medium rounded-full">
                  {t('ideal_structure') || 'Structure idéale'}
                </span>
                <span className="!text-xs !text-muted">
                  {idealSections.length} sections recommandées
                </span>
              </div>
              
              <div className="relative bg-muted rounded-lg p-4 min-h-[400px] border border-success">
                {/* Wireframe blocks - Ideal */}
                <div className="space-y-2">
                  {idealSections
                    .sort((a, b) => a.idealPosition - b.idealPosition)
                    .map((section, index) => {
                      const colors = SECTION_COLORS[section.type] || SECTION_COLORS.unknown;
                      const isDetected = detectedMap.get(section.type)?.detected;
                      
                      return (
                        <motion.div
                          key={section.id}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={`${colors.bg} border ${colors.border} rounded-lg p-3`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              {isDetected ? (
                                <IconCheck className="w-4 h-4 !text-success-text -text" />
                              ) : (
                                <IconAlertTriangle className="w-4 h-4 !text-warning" />
                              )}
                              <span className={`text-sm font-medium ${colors.text}`}>
                                {section.name}
                              </span>
                            </div>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              section.importance === 'critical' ? 'bg-danger-light !text-danger' :
                              section.importance === 'important' ? 'bg-warning-light !text-warning' :
                              'bg-info-light !text-info'
                            }`}>
                              {section.importance === 'critical' ? 'Critique' :
                               section.importance === 'important' ? 'Important' : 'Optionnel'}
                            </span>
                          </div>
                          <p className="!text-xs !text-muted">{section.description}</p>
                        </motion.div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Overlay View */
          <div className="relative">
            {screenshotViewport ? (
              <div className="relative rounded-lg overflow-hidden">
                {/* Screenshot */}
                <img
                  src={`data:image/png;base64,${screenshotViewport}`}
                  alt={`Screenshot of ${url}`}
                  className="w-full h-auto"
                />
                
                {/* Toggle overlay button */}
                <button
                  onClick={() => setShowOverlay(!showOverlay)}
                  className="absolute top-3 right-3 px-3 py-1.5 bg-black/70 !text-white !text-sm rounded-lg flex items-center gap-2 hover:bg-black/80 transition-colors"
                >
                  {showOverlay ? (
                    <>
                      <IconEyeOff className="w-4 h-4" />
                      {t('hide_zones') || 'Masquer les zones'}
                    </>
                  ) : (
                    <>
                      <IconEye className="w-4 h-4" />
                      {t('show_zones') || 'Afficher les zones'}
                    </>
                  )}
                </button>
                
                {/* Overlay annotations */}
                {showOverlay && (
                  <div className="absolute inset-0 pointer-events-none">
                    {detectedSections
                      .filter(s => s.detected && s.position)
                      .map((section) => {
                        const colors = SECTION_COLORS[section.type] || SECTION_COLORS.unknown;
                        
                        return (
                          <motion.div
                            key={section.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className={`absolute left-0 right-0 border-2 ${colors.border} bg-black/20`}
                            style={{
                              top: `${section.position!.top}%`,
                              height: `${Math.min(section.position!.height, 30)}%`,
                            }}
                          >
                            <div className={`absolute -top-6 left-2 px-2 py-1 ${colors.bg} ${colors.text} !text-xs font-medium rounded`}>
                              {section.name}
                            </div>
                          </motion.div>
                        );
                      })}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-muted rounded-lg p-12 !text-center">
                <IconEyeOff className="w-12 h-12 mx-auto mb-3 !text-muted opacity-50" />
                <p className="text-muted">
                  {t('no_screenshot_for_overlay') || 'Capture d\'écran requise pour l\'overlay'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Summary Stats */}
        <div className="mt-6 pt-4 border-t border-default">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold !text-primary">{structureScore}%</p>
              <p className="!text-xs !text-muted">{t('structure_score') || 'Score structure'}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold !text-success-text -text">{detectedSections.filter(s => s.detected).length}</p>
              <p className="!text-xs !text-muted">{t('detected_sections') || 'Sections détectées'}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold !text-danger">{missingCritical.length}</p>
              <p className="!text-xs !text-muted">{t('missing_critical') || 'Critiques manquantes'}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold !text-warning">{missingImportant.length}</p>
              <p className="!text-xs !text-muted">{t('missing_important') || 'Importantes manquantes'}</p>
            </div>
          </div>
        </div>

        {/* Recommendations Arrow */}
        {missingCritical.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 bg-warning-light border border-warning rounded-lg"
          >
            <div className="flex items-start gap-3">
              <IconArrowRight className="w-5 h-5 !text-warning-text flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium !text-warning-text mb-1">
                  {t('priority_improvements') || 'Améliorations prioritaires'}
                </p>
                <p className="text-sm !text-secondary">
                  {t('add_missing_sections') || 'Ajoutez les sections critiques manquantes pour améliorer la conversion :'}{' '}
                  <strong>{missingCritical.map(s => s.name).join(', ')}</strong>
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

