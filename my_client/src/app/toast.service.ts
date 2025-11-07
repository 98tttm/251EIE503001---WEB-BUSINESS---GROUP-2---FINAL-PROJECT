import { signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info' | 'warning';
export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  timeout?: any;
}

export class ToastService {
  static toasts = signal<Toast[]>([]);

  static push(message: string, type: ToastType = 'info', duration = 3000) {
    const id = Math.random().toString(36).substr(2, 9) + Date.now();
    const toast: Toast = { id, message, type };
    console.log('🍞 ToastService.push - Adding toast:', { id, message, type, currentToasts: ToastService.toasts().length });
    ToastService.toasts.update(list => [...list, toast]);
    console.log('🍞 ToastService.push - After update, toasts:', ToastService.toasts().length);
    toast.timeout = setTimeout(() => ToastService.remove(id), duration);
    return id;
  }

  static success(message: string, duration = 3000) {
    console.log('✅ ToastService.success called:', message);
    return ToastService.push(message, 'success', duration);
  }
  static error(message: string, duration = 3500) {
    console.log('❌ ToastService.error called:', message);
    return ToastService.push(message, 'error', duration);
  }
  static info(message: string, duration = 3000) {
    return ToastService.push(message, 'info', duration);
  }
  static warning(message: string, duration = 3500) {
    return ToastService.push(message, 'warning', duration);
  }
  static remove(id: string) {
    ToastService.toasts.update(list => list.filter(t => t.id !== id));
  }
  static clear() {
    ToastService.toasts.set([]);
  }
}
