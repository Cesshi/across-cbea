'use client';

import { cn } from '@/lib';
import { AlertTriangle, CheckCircle2, HelpCircle, Info, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from './button';

type DialogVariant = 'danger' | 'warning' | 'primary' | 'success' | 'info';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: DialogVariant;
  isLoading?: boolean;
  loadingText?: string;
}

const VARIANT_CONFIG: Record<
  DialogVariant,
  {
    Icon: React.ElementType;
    iconBg: string;
    iconColor: string;
    animation: string;
    buttonVariant: 'primary' | 'danger';
    buttonClass: string;
  }
> = {
  danger: {
    Icon: Trash2,
    iconBg: 'bg-red-100 dark:bg-red-500/15',
    iconColor: 'text-error-500',
    animation: 'animate-bounce',
    buttonVariant: 'danger',
    buttonClass: '',
  },
  warning: {
    Icon: AlertTriangle,
    iconBg: 'bg-amber-100 dark:bg-amber-500/15',
    iconColor: 'text-amber-500',
    animation: '',
    buttonVariant: 'primary',
    buttonClass: '!bg-amber-500 hover:!bg-amber-600 dark:disabled:!bg-amber-800',
  },
  primary: {
    Icon: HelpCircle,
    iconBg: 'bg-brand-100 dark:bg-brand-500/15',
    iconColor: 'text-brand-500',
    animation: '',
    buttonVariant: 'primary',
    buttonClass: '',
  },
  success: {
    Icon: CheckCircle2,
    iconBg: 'bg-green-100 dark:bg-green-500/15',
    iconColor: 'text-green-500',
    animation: '',
    buttonVariant: 'primary',
    buttonClass: '!bg-green-600 hover:!bg-green-700 dark:disabled:!bg-green-800',
  },
  info: {
    Icon: Info,
    iconBg: 'bg-blue-100 dark:bg-blue-500/15',
    iconColor: 'text-blue-500',
    animation: '',
    buttonVariant: 'primary',
    buttonClass: '!bg-blue-600 hover:!bg-blue-700 dark:disabled:!bg-blue-800',
  },
};

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isLoading = false,
  loadingText,
}: ConfirmDialogProps) {
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      const t = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(t);
    } else {
      setIsVisible(false);
      const t = setTimeout(() => setMounted(false), 200);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isLoading, onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!mounted) return null;

  const { Icon, iconBg, iconColor, animation, buttonVariant, buttonClass } =
    VARIANT_CONFIG[variant];

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-4',
        !isVisible && 'pointer-events-none'
      )}
    >
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity duration-200',
          isVisible ? 'opacity-100' : 'opacity-0'
        )}
        onClick={() => !isLoading && onClose()}
      />

      {/* Dialog */}
      <div
        className={cn(
          'relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800',
          'transition-all duration-200',
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={cn(
            'mb-4 flex h-12 w-12 items-center justify-center rounded-full',
            iconBg,
            animation
          )}
        >
          <Icon size={22} className={iconColor} />
        </div>

        <h2 className="mb-1 text-xl font-semibold text-gray-800 dark:text-white/90">{title}</h2>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">{message}</p>

        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={buttonVariant}
            onClick={onConfirm}
            isLoading={isLoading}
            loadingText={loadingText ?? confirmLabel}
            className={buttonClass}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
