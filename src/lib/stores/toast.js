import { writable } from 'svelte/store';

export const toasts = writable([]);

export const addToast = (toast) => {
  const id = Date.now();
  const newToast = { id, ...toast };
  
  toasts.update((all) => [...all, newToast]);
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    removeToast(id);
  }, 5000);
  
  return id;
};

export const removeToast = (id) => {
  toasts.update((all) => all.filter((toast) => toast.id !== id));
};