/**
 * Simple toast notification system
 * In the future, this could be replaced with a proper toast library like sonner
 */

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

// Simple toast queue - in a real app, this would be managed by a toast provider
let toastListeners: ((toast: Toast) => void)[] = [];

export function subscribeToToasts(listener: (toast: Toast) => void) {
  toastListeners.push(listener);
  return () => {
    toastListeners = toastListeners.filter(l => l !== listener);
  };
}

function emitToast(toast: Toast) {
  toastListeners.forEach(listener => listener(toast));
}

export function showToast(message: string, type: ToastType = 'info', duration = 3000) {
  const toast: Toast = {
    id: `toast-${Date.now()}-${Math.random()}`,
    message,
    type,
    duration,
  };
  emitToast(toast);
}

export function showSuccess(message: string) {
  showToast(message, 'success');
}

export function showError(message: string) {
  showToast(message, 'error');
}

export function showInfo(message: string) {
  showToast(message, 'info');
}
