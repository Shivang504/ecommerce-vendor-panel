'use client';

import React, { useCallback } from 'react';
import hotToast from 'react-hot-toast';

type ToastVariant = 'default' | 'success' | 'info' | 'warning' | 'destructive';

export interface ToastMessage {
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: ToastVariant;
  duration?: number;
  id?: string;
}

const buildToastContent = (title?: React.ReactNode, description?: React.ReactNode): React.ReactNode => {
  if (!title && !description) return '';
  
  if (title && description) {
    return (
      <div className='flex flex-col gap-1'>
        <p className='text-sm font-semibold'>{title}</p>
        <p className='text-sm opacity-90'>{description}</p>
      </div>
    );
  }
  
  return title || description || '';
};

const showToastInternal = (payload: ToastMessage | string = {}) => {
  // Handle string messages (direct API: toast.success('message'))
  if (typeof payload === 'string') {
    return hotToast(payload);
  }

  // Handle object messages (current API: toast({ title, description, variant }))
  const { title, description, variant = 'default', duration = 3000, id } = payload;

  const content = buildToastContent(title, description);

  const toastOptions = {
    duration,
    id,
  };

  switch (variant) {
    case 'success':
      return hotToast.success(content, toastOptions);
    case 'destructive':
    case 'error':
      return hotToast.error(content, toastOptions);
    case 'warning':
    case 'info':
    case 'default':
    default:
      return hotToast(content, toastOptions);
  }
};

const dismissToastInternal = (toastId?: string) => {
  if (toastId) {
    hotToast.dismiss(toastId);
  } else {
    hotToast.dismiss();
  }
};

function useToastMessage() {
  const showToast = useCallback((payload?: ToastMessage) => showToastInternal(payload), []);

  const showSuccess = useCallback((payload: Omit<ToastMessage, 'variant'>) => showToast({ ...payload, variant: 'success' }), [showToast]);
  const showError = useCallback((payload: Omit<ToastMessage, 'variant'>) => showToast({ ...payload, variant: 'destructive' }), [showToast]);
  const showInfo = useCallback((payload: Omit<ToastMessage, 'variant'>) => showToast({ ...payload, variant: 'info' }), [showToast]);
  const showWarning = useCallback((payload: Omit<ToastMessage, 'variant'>) => showToast({ ...payload, variant: 'warning' }), [showToast]);

  const dismiss = useCallback((toastId?: string) => dismissToastInternal(toastId), []);

  return {
    toast: showToast,
    showToast,
    showSuccess,
    showError,
    showInfo,
    showWarning,
    dismiss,
  };
}

// Create toast object with methods for direct API support (toast.success(), toast.error(), etc.)
const toastFunction = (payload?: ToastMessage | string) => showToastInternal(payload);

// Add methods to support direct API: toast.success('message'), toast.error('message'), etc.
const toast = Object.assign(toastFunction, {
  success: (message: string, options?: { duration?: number; id?: string }) => {
    return hotToast.success(message, options);
  },
  error: (message: string, options?: { duration?: number; id?: string }) => {
    return hotToast.error(message, options);
  },
  info: (message: string, options?: { duration?: number; id?: string }) => {
    return hotToast(message, options);
  },
  warning: (message: string, options?: { duration?: number; id?: string }) => {
    return hotToast(message, { ...options, icon: '⚠️' });
  },
  dismiss: dismissToastInternal,
});

export { useToastMessage, useToastMessage as useToast, toast };
