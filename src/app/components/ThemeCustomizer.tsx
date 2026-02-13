'use client';

import React, { useEffect } from 'react';
import {
  IconPalette,
  IconLoader2,
  IconPhotoUp,
  IconX,
  IconInfoCircle,
  IconDeviceFloppy,
  IconFolderOpen,
} from '@tabler/icons-react';

// Types
interface GradientStop {
  id: string;
  color: string;
  position: number;
  opacity: number;
}

interface CustomColors {
  gradientStops: GradientStop[];
  buttonColor: string;
  buttonTextColor: string;
  textColor: string;
  headerTitleColor: string;
  gradientAngle: number;
  fontFamily: string;
}

interface FontOption {
  name: string;
  family: string;
}

interface ThemeCustomizerProps {
  customColors: CustomColors;
  setCustomColors: React.Dispatch<React.SetStateAction<CustomColors>>;
  headerBackgroundUrl: string;
  setHeaderBackgroundUrl: (url: string) => void;
  headerBackgroundInputRef?: React.RefObject<HTMLInputElement | null>;
  handleHeaderBackgroundUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploadingHeaderBackground?: boolean;
  onOpenMediaPicker?: () => void; // Nouvelle prop pour ouvrir le MediaPickerModal
  availableFonts: FontOption[];
  generateGradientCSS: (stops: GradientStop[], angle: number) => string;
  addGradientStop: () => void;
  removeGradientStop: (id: string) => void;
  updateGradientStop: (id: string, updates: Partial<GradientStop>) => void;
  emailTitle?: string;
  ctaText?: string;
  t: (key: string) => string;
  compact?: boolean; // Mode compact pour l'étape template
  // Template save/load callbacks
  bannerUrl?: string; // URL de la bannière pour la sauvegarde
  onSaveTemplate?: () => void;
  onLoadTemplate?: () => void;
  hasSavedTemplates?: boolean;
}

// Liste des clients email et leur compatibilité
const EMAIL_CLIENT_COMPATIBILITY = {
  fonts: {
    supported: [
      'Apple Mail',
      'iOS Mail',
      'Android (default)',
      'Outlook.com',
      'Yahoo Mail',
      'AOL Mail',
    ],
    notSupported: [
      'Gmail (Web & App)',
      'Outlook (Desktop)',
      'Outlook (Windows 10)',
      'Windows Mail',
      'Samsung Mail',
    ],
  },
  gradients: {
    supported: [
      'Apple Mail',
      'iOS Mail',
      'Gmail (Web)',
      'Outlook.com',
      'Yahoo Mail',
    ],
    notSupported: [
      'Outlook (Desktop)',
      'Outlook (Windows 10)',
      'Windows Mail',
      'Gmail (App)',
    ],
  },
  backgroundImages: {
    supported: [
      'Apple Mail',
      'iOS Mail',
      'Gmail',
      'Outlook.com',
      'Yahoo Mail',
    ],
    notSupported: [
      'Outlook (Desktop)',
      'Outlook (Windows 10)',
      'Windows Mail',
    ],
  },
};

// Composant info compatibilité
function CompatibilityInfo({ 
  feature, 
  t 
}: { 
  feature: 'fonts' | 'gradients' | 'backgroundImages';
  t: (key: string) => string;
}) {
  const [showTooltip, setShowTooltip] = React.useState(false);
  const compatibility = EMAIL_CLIENT_COMPATIBILITY[feature];

  return (
    <div className="relative inline-flex items-center ml-2">
      <button
        type="button"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
        className="text-muted hover:!text-accent transition-colors p-1 rounded-full hover:bg-accent-light"
      >
        <IconInfoCircle className="w-4 h-4" />
      </button>
      
      {showTooltip && (
        <div 
          className="absolute top-full left-0 mt-2 w-80 p-4 bg-card border border-default rounded-xl shadow-2xl !text-xs"
          style={{ zIndex: 9999 }}
        >
          {/* Arrow pointing up */}
          <div className="absolute top-0 left-4 -translate-y-full">
            <div 
              className="w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent"
              style={{ borderBottomColor: 'var(--border-default)' }}
            />
            <div 
              className="w-0 h-0 border-l-7 border-r-7 border-b-7 border-l-transparent border-r-transparent absolute -bottom-[7px] left-[1px]"
              style={{ borderBottomColor: 'var(--bg-card)' }}
            />
          </div>
          
          <div className="mb-3">
            <p className="font-semibold !text-green-500 mb-1.5 flex items-center gap-1.5">
              <span className="text-base">✓</span> {t('supported_clients') || 'Clients supportés'}
            </p>
            <p className="text-secondary leading-relaxed">
              {compatibility.supported.join(', ')}
            </p>
          </div>
          <div>
            <p className="font-semibold !text-red-500 mb-1.5 flex items-center gap-1.5">
              <span className="text-base">✗</span> {t('unsupported_clients') || 'Non supportés'}
            </p>
            <p className="text-secondary leading-relaxed">
              {compatibility.notSupported.join(', ')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ThemeCustomizer({
  customColors,
  setCustomColors,
  headerBackgroundUrl,
  setHeaderBackgroundUrl,
  headerBackgroundInputRef,
  handleHeaderBackgroundUpload,
  uploadingHeaderBackground = false,
  onOpenMediaPicker,
  availableFonts,
  generateGradientCSS,
  addGradientStop,
  removeGradientStop,
  updateGradientStop,
  emailTitle,
  ctaText,
  t,
  compact = false,
  bannerUrl,
  onSaveTemplate,
  onLoadTemplate,
  hasSavedTemplates = false,
}: ThemeCustomizerProps) {
  // Handler pour ouvrir le sélecteur d'image
  const handleOpenImagePicker = () => {
    if (onOpenMediaPicker) {
      onOpenMediaPicker();
    } else if (headerBackgroundInputRef?.current) {
      headerBackgroundInputRef.current.click();
    }
  };
  // Load all available Google Fonts on mount
  useEffect(() => {
    availableFonts.forEach(font => {
      const fontName = font.name.replace(/\s+/g, '+');
      const linkId = `google-font-${fontName}`;
      
      if (!document.getElementById(linkId)) {
        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        // Use the correct Google Fonts API v2 format
        link.href = `https://fonts.googleapis.com/css2?family=${fontName}:ital,wght@0,400..900;1,400..900&display=swap`;
        document.head.appendChild(link);
      }
    });
  }, [availableFonts]);

  // Marquer bannerUrl comme utilisé (sera passé via les props pour la sauvegarde)
  void bannerUrl;
  
  return (
    <div className="bg-muted rounded-xl p-6 space-y-6 border border-default">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold !text-primary flex items-center gap-2">
          <IconPalette className="w-5 h-5" />
          {t('customize_theme') || 'Personnaliser le thème'}
        </h3>
        
        {/* Template actions */}
        {!compact && (onSaveTemplate || onLoadTemplate) && (
          <div className="flex items-center gap-2">
            {/* Load template */}
            {onLoadTemplate && (
              <button
                onClick={onLoadTemplate}
                className={`flex items-center gap-1.5 px-3 py-1.5 !text-sm rounded-lg transition-colors ${
                  hasSavedTemplates 
                    ? 'text-accent hover:bg-accent-light' 
                    : 'text-muted cursor-not-allowed'
                }`}
                disabled={!hasSavedTemplates}
                title={hasSavedTemplates 
                  ? (t('load_template') || 'Charger un thème') 
                  : (t('no_saved_templates') || 'Aucun thème sauvegardé')
                }
              >
                <IconFolderOpen className="w-4 h-4" />
                <span className="hidden sm:inline">{t('load') || 'Charger'}</span>
              </button>
            )}
            
            {/* Save template */}
            {onSaveTemplate && (
              <button
                onClick={onSaveTemplate}
                className="flex items-center gap-1.5 px-3 py-1.5 !text-sm bg-accent-light !text-accent hover:bg-[var(--color-accent)] hover:!text-white rounded-lg transition-colors"
                title={t('save_template') || 'Sauvegarder le thème'}
              >
                <IconDeviceFloppy className="w-4 h-4" />
                <span className="hidden sm:inline">{t('save') || 'Sauvegarder'}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Font Family Selection */}
      <div className="space-y-3 relative">
        <div className="flex items-center">
          <label className="text-sm font-medium !text-secondary">
            {t('font_family') || 'Police de caractères'}
          </label>
          <CompatibilityInfo feature="fonts" t={t} />
        </div>
        <p className="!text-xs !text-muted">
          {t('font_family_desc') || 'Google Fonts (peut ne pas s\'afficher sur tous les clients email)'}
        </p>
        <div className={`grid ${compact ? 'grid-cols-3 gap-1.5' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2'}`}>
          {availableFonts.map((font) => {
            const fontFamily = font.family;
            return (
              <button
                key={font.name}
                type="button"
                onClick={() => setCustomColors(prev => ({ ...prev, fontFamily: font.name }))}
                className={`px-2 py-1.5 rounded-lg !text-xs transition-all border ${
                  customColors.fontFamily === font.name
                    ? 'bg-accent !text-white border-accent'
                    : 'bg-card border-default hover:border-accent !text-primary'
                }`}
                style={{ fontFamily }}
              >
                {font.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Gradient / Colors Section */}
      <div className="space-y-4 pt-4 border-t border-default">
        <div className="flex items-center">
          <h4 className="text-sm font-medium !text-secondary">
            {t('header_colors') || 'Couleurs du header'}
          </h4>
          <CompatibilityInfo feature="gradients" t={t} />
        </div>
        
        {/* Gradient preview bar */}
        <div 
          className="w-full h-12 rounded-lg border border-default shadow-inner"
          style={{
            background: generateGradientCSS(customColors.gradientStops, customColors.gradientAngle)
          }}
        />
        
        {/* Type selector + Angle */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-card rounded-lg border border-default w-fit">
            <span className="text-sm !text-primary">{t('linear') || 'Linéaire'}</span>
          </div>
          <div className="flex items-center gap-2 flex-1">
            <input
              type="range"
              min="0"
              max="360"
              value={customColors.gradientAngle}
              onChange={(e) => setCustomColors(prev => ({ ...prev, gradientAngle: parseInt(e.target.value) }))}
              className="flex-1 h-1 bg-card rounded-full appearance-none cursor-pointer accent-accent"
            />
            <div className="flex items-center bg-card rounded-lg border border-default overflow-hidden w-fit">
              <input
                type="number"
                min="0"
                max="360"
                value={customColors.gradientAngle}
                onChange={(e) => setCustomColors(prev => ({ ...prev, gradientAngle: parseInt(e.target.value) || 0 }))}
                className="w-fit min-w-[4ch] !text-center font-mono !text-sm py-1.5 bg-transparent !text-primary border-none outline-none"
              />
              <span className="text-sm !text-muted px-2">°</span>
            </div>
          </div>
        </div>

        {/* Stops */}
        <div className="space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-default w-1/2">
            <span className="text-sm font-medium !text-primary">{t('stops') || 'Stops'}</span>
            <button
              type="button"
              onClick={addGradientStop}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-card transition-colors !text-primary"
            >
              <span className="text-xl leading-none">+</span>
            </button>
          </div>
          <div className="space-y-1">
            {[...customColors.gradientStops]
              .sort((a, b) => a.position - b.position)
              .map((stop) => (
              <div 
                key={stop.id} 
                className="flex items-center gap-3 py-2 px-1 rounded-lg hover:bg-card/50 transition-colors"
              >
                <div className="flex items-center gap-0.5 w-fit">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={stop.position}
                    onChange={(e) => updateGradientStop(stop.id, { position: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) })}
                    className="w-fit min-w-[3ch]  !text-right font-mono !text-sm py-1 bg-transparent !text-primary border-none outline-none"
                  />
                  <span className="text-sm !text-muted">%</span>
                </div>
                <div className="relative">
                  <input
                    type="color"
                    value={stop.color}
                    onChange={(e) => updateGradientStop(stop.id, { color: e.target.value })}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div 
                    className="w-6 h-6 rounded border border-default shadow-sm cursor-pointer"
                    style={{ backgroundColor: stop.color }}
                  />
                </div>
                <input
                  type="text"
                  value={stop.color.toUpperCase().slice(1)}
                  onChange={(e) => {
                    const hex = e.target.value.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6);
                    if (hex.length === 6) {
                      updateGradientStop(stop.id, { color: `#${hex}` });
                    }
                  }}
                  className="w-fit min-w-[6ch] font-mono !text-sm py-1 bg-transparent !text-primary border-none outline-none uppercase"
                  maxLength={6}
                />
                <div className="flex items-center gap-0.5">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={stop.opacity}
                    onChange={(e) => updateGradientStop(stop.id, { opacity: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) })}
                    className="w-fit min-w-[3ch]  !text-right font-mono !text-sm py-1 bg-transparent !text-primary border-none outline-none"
                  />
                  <span className="text-sm !text-muted">%</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeGradientStop(stop.id)}
                  disabled={customColors.gradientStops.length <= 1}
                  className={`w-6 h-6 flex items-center justify-center transition-colors ${
                    customColors.gradientStops.length <= 1
                      ? 'text-muted/30 cursor-not-allowed'
                      : 'text-muted hover:!text-primary'
                  }`}
                >
                  <span className="text-xl leading-none">−</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Header Background Image */}
      <div className="pt-4 border-t border-default">
        <div className="flex items-center mb-2">
          <label className="text-sm font-medium !text-secondary">
            {t('header_background_image') || 'Image de fond du header'}
          </label>
          <CompatibilityInfo feature="backgroundImages" t={t} />
        </div>
        <p className="!text-xs !text-muted mb-3">
          {t('header_background_image_desc') || 'Optionnel : ajouter une image en plus de la couleur du thème'}
        </p>
        
        {/* Hidden file input for legacy support */}
        {headerBackgroundInputRef && handleHeaderBackgroundUpload && (
          <input
            ref={headerBackgroundInputRef}
            type="file"
            accept="image/*"
            onChange={handleHeaderBackgroundUpload}
            className="hidden"
          />
        )}
        
        {headerBackgroundUrl ? (
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={headerBackgroundUrl} 
              alt="Header background" 
              className="w-full max-w-md h-24 object-cover rounded-lg border border-default"
            />
            <div className="absolute top-2 right-2 flex gap-1">
              <button
                onClick={handleOpenImagePicker}
                disabled={uploadingHeaderBackground}
                className="p-1.5 bg-card/90 !text-secondary hover:!text-primary rounded-full transition-colors"
                title={t('change_image') || 'Changer l\'image'}
              >
                {uploadingHeaderBackground ? (
                  <IconLoader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <IconPhotoUp className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => setHeaderBackgroundUrl('')}
                className="p-1.5 bg-danger/90 !text-white rounded-full hover:bg-[var(--color-danger)] transition-colors"
                title={t('remove_image') || 'Supprimer'}
              >
                <IconX className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={handleOpenImagePicker}
            disabled={uploadingHeaderBackground}
            className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-default rounded-lg hover:border-accent transition-colors !text-secondary hover:!text-primary"
          >
            {uploadingHeaderBackground ? (
              <IconLoader2 className="w-5 h-5 animate-spin" />
            ) : (
              <IconPhotoUp className="w-5 h-5" />
            )}
            <span>{t('choose_header_image') || 'Choisir une image'}</span>
          </button>
        )}
      </div>

      {/* Title Color, Button Color & Button Text Color */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-default">
        {/* Header Title Color */}
        <div>
          <label className="block !text-sm font-medium !text-secondary mb-2">
            {t('header_title_color') || 'Couleur du titre'}
          </label>
          <p className="!text-xs !text-muted mb-2">
            {t('header_title_color_desc') || 'Ajuster pour le contraste sur le fond'}
          </p>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={customColors.headerTitleColor}
              onChange={(e) => setCustomColors(prev => ({ ...prev, headerTitleColor: e.target.value }))}
              className="w-10 h-10 rounded-lg cursor-pointer border-2 border-default"
            />
            <input
              type="text"
              value={customColors.headerTitleColor}
              onChange={(e) => setCustomColors(prev => ({ ...prev, headerTitleColor: e.target.value }))}
              className="input flex-1 font-mono !text-sm"
              placeholder="#000000"
            />
          </div>
        </div>

        {/* Button Color */}
        <div>
          <label className="block !text-sm font-medium !text-secondary mb-2">
            {t('button_color') || 'Couleur des boutons'}
          </label>
          <p className="!text-xs !text-muted mb-2">
            {t('button_color_desc') || 'Fond des boutons CTA'}
          </p>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={customColors.buttonColor}
              onChange={(e) => setCustomColors(prev => ({ ...prev, buttonColor: e.target.value }))}
              className="w-10 h-10 rounded-lg cursor-pointer border-2 border-default"
            />
            <input
              type="text"
              value={customColors.buttonColor}
              onChange={(e) => setCustomColors(prev => ({ ...prev, buttonColor: e.target.value }))}
              className="input flex-1 font-mono !text-sm"
              placeholder="#000000"
            />
          </div>
        </div>

        {/* Button Text Color */}
        <div>
          <label className="block !text-sm font-medium !text-secondary mb-2">
            {t('button_text_color') || 'Texte du bouton'}
          </label>
          <p className="!text-xs !text-muted mb-2">
            {t('button_text_color_desc') || 'Contraste sur le fond du bouton'}
          </p>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={customColors.buttonTextColor}
              onChange={(e) => setCustomColors(prev => ({ ...prev, buttonTextColor: e.target.value }))}
              className="w-10 h-10 rounded-lg cursor-pointer border-2 border-default"
            />
            <input
              type="text"
              value={customColors.buttonTextColor}
              onChange={(e) => setCustomColors(prev => ({ ...prev, buttonTextColor: e.target.value }))}
              className="input flex-1 font-mono !text-sm"
              placeholder="#FFFFFF"
            />
          </div>
        </div>
      </div>

      {/* Live Preview */}
      <div className="pt-4 border-t border-default">
        <p className="text-sm !text-secondary mb-3">{t('color_preview') || 'Aperçu'}</p>
        <div 
          className="rounded-xl overflow-hidden border border-default"
        >
          <div 
            className="h-20 flex items-center justify-center"
            style={{ 
              backgroundImage: headerBackgroundUrl 
                ? `url(${headerBackgroundUrl})` 
                : generateGradientCSS(customColors.gradientStops, customColors.gradientAngle),
              backgroundColor: customColors.gradientStops[0]?.color || '#FFFFFF',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          >
            <span 
              className="font-bold !text-lg px-4 !text-center"
              style={{ 
                color: customColors.headerTitleColor,
                fontFamily: `'${customColors.fontFamily}', Arial, sans-serif`,
              }}
            >
              {emailTitle || t('your_title_here') || 'Votre titre ici'}
            </span>
          </div>
          <div className="bg-card p-4 flex flex-col items-center justify-center gap-2">
            <p 
              className="text-sm !text-primary m-0"
              style={{ fontFamily: `'${customColors.fontFamily}', Arial, sans-serif` }}
            >
              {t('sample_text_preview') || 'Exemple de texte avec la police sélectionnée.'}
            </p>
            <button
              className="px-6 py-2 rounded-lg !text-sm font-medium"
              style={{ 
                backgroundColor: customColors.buttonColor,
                color: customColors.buttonTextColor,
                fontFamily: `'${customColors.fontFamily}', Arial, sans-serif`,
              }}
            >
              {ctaText || t('sample_button') || 'Bouton exemple'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Export types for use in parent components
export type { GradientStop, CustomColors, FontOption };

