import { Injectable, computed, signal } from '@angular/core';

export type NotificationType = 'success' | 'info' | 'warning' | 'error';

export interface AdminNotification {
  id: string;
  type: NotificationType;
  message: string;
  title?: string;
  timestamp: number;
  autoClose?: boolean;
  timeout?: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly queue = signal<AdminNotification[]>([]);

  readonly notifications = computed(() => this.queue());

  show(type: NotificationType, message: string, title?: string, options?: Partial<AdminNotification>) {
    const notification: AdminNotification = {
      id: options?.id ?? crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
      type,
      message,
      title,
      timestamp: Date.now(),
      autoClose: options?.autoClose ?? type !== 'error',
      timeout: options?.timeout ?? 4500
    };

    this.queue.update(list => [notification, ...list].slice(0, 6));
    if (notification.autoClose) {
      window.setTimeout(() => this.dismiss(notification.id), notification.timeout);
    }

    if (type === 'error') {
      console.error('[Admin Notification]', title ?? '', message);
    }
  }

  showSuccess(message: string, title = 'Thành công') {
    this.show('success', message, title);
  }

  showInfo(message: string, title = 'Thông báo') {
    this.show('info', message, title);
  }

  showWarning(message: string, title = 'Cảnh báo') {
    this.show('warning', message, title);
  }

  showError(message: string, title = 'Lỗi') {
    this.show('error', message, title, { autoClose: false });
  }

  dismiss(id: string) {
    this.queue.update(list => list.filter(item => item.id !== id));
  }

  clear() {
    this.queue.set([]);
  }
}

