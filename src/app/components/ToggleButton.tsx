'use client';

import { motion } from 'motion/react';

interface ToggleButtonProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'accent';
  disabled?: boolean;
  label?: string;
  labelPosition?: 'left' | 'right';
  className?: string;
}

export default function ToggleButton({
  checked,
  onChange,
  size = 'md',
  variant = 'accent',
  disabled = false,
  label,
  labelPosition = 'left',
  className = '',
}: ToggleButtonProps) {
  // Tailles du toggle
  const sizes = {
    sm: {
      track: 'w-9 h-5',
      thumb: 'w-4 h-4',
      translate: 'translate-x-4',
      thumbOffset: 'top-0 left-0',
    },
    md: {
      track: 'w-11 h-6',
      thumb: 'w-5 h-5',
      translate: 'translate-x-5',   
      thumbOffset: 'top-0 left-0',
    },
    lg: {
      track: 'w-14 h-7',
      thumb: 'w-6 h-6',
      translate: 'translate-x-7',
      thumbOffset: 'top-0 left-0',
    },
  };

  // Couleurs selon la variante - utilisant les variables du thème
  const variants = {
    default: {
      active: 'bg-muted',
      inactive: 'bg-hover',
      border: 'border-default',
    },
    accent: {
      active: 'bg-accent',
      inactive: 'bg-hover',
      border: 'border-accent',
    },
    success: {
      active: 'bg-success',
      inactive: 'bg-hover',
      border: 'border-success',
    },
    warning: {
      active: 'bg-warning',
      inactive: 'bg-hover',
      border: 'border-warning',
    },
    danger: {
      active: 'bg-danger',
      inactive: 'bg-hover',
      border: 'border-danger',
    },
  };

  const currentSize = sizes[size];
  const currentVariant = variants[variant];

  const handleClick = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const toggleElement = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={handleClick}
      className={`
        relative inline-flex items-center shrink-0 cursor-pointer rounded-full
        transition-all duration-200 ease-in-out
        border-2
        ${currentSize.track}
        ${checked ? currentVariant.active : currentVariant.inactive}
        ${checked ? currentVariant.border : 'border-default'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}
        focus:outline-none focus:ring-1 focus:ring-offset-2 focus:ring-accent
        focus:ring-offset-card
      `}
    >
      <motion.span
        initial={false}
        animate={{
          x: checked ? (size === 'sm' ? 16 : size === 'md' ? 20 : 28) : 0,
        }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={`
          ${currentSize.thumb}
          ${currentSize.thumbOffset}
          absolute
          rounded-full
          bg-white
          shadow-lg
          ring-0
          border border-default
        `}
      />
    </button>
  );

  if (label) {
    return (
      <label
        className={`
          inline-flex items-center gap-2.5 
          ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
          ${className}
        `}
      >
        {labelPosition === 'left' && (
          <span className={`text-sm font-medium ${disabled ? 'text-muted' : 'text-primary'}`}>
            {label}
          </span>
        )}
        {toggleElement}
        {labelPosition === 'right' && (
          <span className={`text-sm font-medium ${disabled ? 'text-muted' : 'text-primary'}`}>
            {label}
          </span>
        )}
      </label>
    );
  }

  return <div className={className}>{toggleElement}</div>;
}

