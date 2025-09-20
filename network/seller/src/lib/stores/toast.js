import { writable } from 'svelte/store';

export const toasts = writable([]);

export const addToast = (message, type = 'info', duration = 5000) => {
  const id = Date.now();
  const toast = { id, message, type, duration };
  
  toasts.update(current => [...current, toast]);
  
  if (duration > 0) {
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }
};

export const removeToast = (id) => {
  toasts.update(current => current.filter(toast => toast.id !== id));
};