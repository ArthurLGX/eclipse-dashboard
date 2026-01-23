'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconSparkles,
  IconLoader2,
  IconTrendingUp,
  IconTrendingDown,
  IconMinus,
  IconBulb,
  IconChevronDown,
  IconChevronUp,
} from '@tabler/icons-react';
import Image from 'next/image';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';

interface AIPriceEstimationProps {
  projectId?: string;
  clientId?: string;
  description?: string;
  currentTotal: number;
  isQuote?: boolean;
  onSuggestionApply?: (suggestedPrice: number) => void;
}

interface EstimationResult {
  suggested_price: number;
  confidence: 'high' | 'medium' | 'low';
  comparison: 'above' | 'below' | 'similar';
  similar_projects_count: number;
  avg_hourly_rate: number;
  reasoning: string;
  recommendations: string[];
}

export default function AIPriceEstimation({
  projectId,
  clientId,
  description,
  currentTotal,
  isQuote = true,
  onSuggestionApply,
}: AIPriceEstimationProps) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [estimation, setEstimation] = useState<EstimationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  // Only show for quotes
  if (!isQuote) return null;

  const fetchEstimation = async () => {
    if (!user?.id || hasFetched) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ai/price-estimation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          projectId,
          clientId,
          description,
          currentTotal,
          language: language || 'fr',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get estimation');
      }

      const result = await response.json();
      setEstimation(result);
      setHasFetched(true);
    } catch (err) {
      console.error('Error fetching price estimation:', err);
      setError(t('estimation_error') || 'Impossible d\'obtenir une estimation');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    if (!isExpanded && !hasFetched && !loading) {
      fetchEstimation();
    }
    setIsExpanded(!isExpanded);
  };

  const getComparisonIcon = () => {
    if (!estimation) return null;
    switch (estimation.comparison) {
      case 'above':
        return <IconTrendingUp className="w-4 h-4 !text-success-text -text" />;
      case 'below':
        return <IconTrendingDown className="w-4 h-4 text-danger" />;
      default:
        return <IconMinus className="w-4 h-4 text-info" />;
    }
  };

  const getConfidenceColor = () => {
    if (!estimation) return 'text-muted';
    switch (estimation.confidence) {
      case 'high':
        return 'text-success';
      case 'medium':
        return 'text-warning';
      case 'low':
        return 'text-danger';
      default:
        return 'text-muted';
    }
  };

  const getDifferenceText = () => {
    if (!estimation || currentTotal === 0) return null;
    const diff = estimation.suggested_price - currentTotal;
    const percentage = Math.abs((diff / currentTotal) * 100).toFixed(0);
    
    if (Math.abs(diff) < 50) {
      return t('price_similar') || 'Prix similaire aux projets précédents';
    }
    
    if (diff > 0) {
      return `${t('price_could_increase') || 'Vous pourriez facturer'} +${percentage}% (${diff.toLocaleString()}€ ${t('more') || 'de plus'})`;
    }
    
    return `${t('price_above_average') || 'Prix supérieur de'} ${percentage}% ${t('to_similar_projects') || 'aux projets similaires'}`;
  };

  return (
    <div className="mt-4">
      {/* Toggle Button */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-accent-light to-info-light rounded-xl border border-accent hover:opacity-90 transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-white/50 rounded-lg">
            <Image 
              src="/images/logo/eclipse-logo.png" 
              alt="Eclipse" 
              width={20} 
              height={20}
              className="w-5 h-5"
            />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-primary">
              {t('ai_price_estimation') || 'Estimation IA du prix'}
            </p>
            <p className="text-xs text-secondary">
              {t('ai_price_estimation_desc') || 'Basée sur vos projets similaires'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {loading && <IconLoader2 className="w-4 h-4 !text-accent animate-spin" />}
          {estimation && !loading && (
            <span className="text-sm font-bold !text-accent">
              {estimation.suggested_price.toLocaleString()}€
            </span>
          )}
          {isExpanded ? (
            <IconChevronUp className="w-5 h-5 text-muted" />
          ) : (
            <IconChevronDown className="w-5 h-5 text-muted" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 p-4 bg-card rounded-xl border border-muted">
              {loading && (
                <div className="flex items-center justify-center py-6">
                  <div className="text-center">
                    <IconLoader2 className="w-8 h-8 !text-accent animate-spin mx-auto mb-2" />
                    <p className="text-sm text-muted">
                      {t('analyzing_prices') || 'Analyse des prix en cours...'}
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div className="text-center py-4">
                  <p className="text-sm text-danger">{error}</p>
                  <button
                    onClick={() => { setHasFetched(false); fetchEstimation(); }}
                    className="mt-2 text-sm !text-accent hover:underline"
                  >
                    {t('retry') || 'Réessayer'}
                  </button>
                </div>
              )}

              {estimation && !loading && (
                <div className="space-y-4">
                  {/* Main suggestion */}
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <IconSparkles className="w-5 h-5 !text-accent" />
                      <div>
                        <p className="text-sm text-muted">
                          {t('suggested_price') || 'Prix suggéré'}
                        </p>
                        <p className="text-xl font-bold text-primary">
                          {estimation.suggested_price.toLocaleString()}€
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        {getComparisonIcon()}
                        <span className={`text-sm ${getConfidenceColor()}`}>
                          {t(`confidence_${estimation.confidence}`) || estimation.confidence}
                        </span>
                      </div>
                      <p className="text-xs text-muted mt-1">
                        {t('based_on') || 'Basé sur'} {estimation.similar_projects_count} {t('similar_projects') || 'projets similaires'}
                      </p>
                    </div>
                  </div>

                  {/* Comparison */}
                  {getDifferenceText() && currentTotal > 0 && (
                    <div className={`p-3 rounded-lg ${
                      estimation.comparison === 'below' 
                        ? 'bg-success-light' 
                        : estimation.comparison === 'above'
                        ? 'bg-warning-light'
                        : 'bg-info-light'
                    }`}>
                      <p className={`text-sm ${
                        estimation.comparison === 'below' 
                          ? 'text-success' 
                          : estimation.comparison === 'above'
                          ? 'text-warning'
                          : 'text-info'
                      }`}>
                        {getDifferenceText()}
                      </p>
                    </div>
                  )}

                  {/* Average hourly rate */}
                  {estimation.avg_hourly_rate > 0 && (
                    <div className="text-sm text-muted">
                      <span>{t('avg_hourly_rate') || 'Taux horaire moyen'}:</span>
                      <span className="font-medium text-secondary ml-2">
                        {estimation.avg_hourly_rate}€/h
                      </span>
                    </div>
                  )}

                  {/* Reasoning */}
                  <div className="text-sm text-secondary">
                    <p>{estimation.reasoning}</p>
                  </div>

                  {/* Recommendations */}
                  {estimation.recommendations && estimation.recommendations.length > 0 && (
                    <div className="p-3 bg-accent-light rounded-lg">
                      <p className="text-sm font-medium !text-accent flex items-center gap-2 mb-2">
                        <IconBulb className="w-4 h-4" />
                        {t('recommendations') || 'Recommandations'}
                      </p>
                      <ul className="text-xs text-secondary space-y-1">
                        {estimation.recommendations.map((rec, i) => (
                          <li key={i}>• {rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Apply button */}
                  {onSuggestionApply && estimation.suggested_price !== currentTotal && (
                    <button
                      onClick={() => onSuggestionApply(estimation.suggested_price)}
                      className="w-full py-2 bg-accent text-white rounded-lg text-sm font-medium hover:opacity-90 transition-colors"
                    >
                      {t('apply_suggested_price') || 'Appliquer ce prix'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

