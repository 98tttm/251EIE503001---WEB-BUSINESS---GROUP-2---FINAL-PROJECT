import { Component, DestroyRef, inject, signal, OnInit, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { NotificationApiService, Notification } from '../../../core/services/notification-api.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    @if (user() && user()?.userId) {
      <div class="notification-bell-wrapper">
        <button 
          type="button"
          class="notification-bell"
          (click)="toggleDropdown()"
          [attr.aria-label]="'Thông báo' + (unreadCount() > 0 ? ' (' + unreadCount() + ' mới)' : '')"
          [title]="unreadCount() > 0 ? unreadCount() + ' thông báo mới' : 'Không có thông báo mới'">
          <svg class="bell-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"/>
          </svg>
          @if (unreadCount() > 0) {
            <span class="badge">{{ unreadCount() > 99 ? '99+' : unreadCount() }}</span>
          }
        </button>

        @if (showDropdown()) {
          <div class="notification-dropdown" (click)="$event.stopPropagation()">
            <div class="dropdown-header">
              <h3>Thông báo</h3>
              @if (unreadCount() > 0) {
                <button 
                  type="button" 
                  class="mark-all-read"
                  (click)="markAllAsRead()"
                  [disabled]="markingAll()">
                  Đánh dấu tất cả đã đọc
                </button>
              }
            </div>

            <div class="notifications-list">
              @if (loading()) {
                <div class="loading">Đang tải...</div>
              } @else if (notifications().length === 0) {
                <div class="empty">Không có thông báo</div>
              } @else {
                @for (notif of notifications(); track notif._id) {
                  <div 
                    class="notification-item"
                    [class.unread]="!notif.read"
                    (click)="handleNotificationClick(notif)">
                    <div class="notification-icon">
                      <span class="icon-emoji">{{ getNotificationIcon(notif.type) }}</span>
                    </div>
                    <div class="notification-content">
                      <div class="notification-title">{{ notif.title }}</div>
                      <div class="notification-message">{{ notif.message }}</div>
                      <div class="notification-time">{{ formatTime(notif.createdAt) }}</div>
                    </div>
                    @if (!notif.read) {
                      <span class="unread-dot"></span>
                    }
                  </div>
                }
              }
            </div>

            @if (notifications().length > 0) {
              <div class="dropdown-footer">
                <a routerLink="/profile/notifications" (click)="closeDropdown()">Xem tất cả</a>
              </div>
            }
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .notification-bell-wrapper {
      position: relative;
      z-index: 99992;
      display: inline-block;
    }

    .notification-bell {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 0.75rem;
      border: 1px solid rgba(148, 163, 184, 0.3);
      background: white;
      color: #64748b;
      cursor: pointer;
      transition: all 0.2s ease;
      padding: 0;
      z-index: 1;
    }

    .notification-bell:hover {
      background: #f8fafc;
      border-color: #0ea5e9;
      color: #0ea5e9;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(14, 165, 233, 0.2);
    }

    .notification-bell .bell-icon {
      width: 22px;
      height: 22px;
      flex-shrink: 0;
    }

    .notification-bell .badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: #ef4444;
      color: white;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 10px;
      min-width: 18px;
      text-align: center;
      line-height: 1.2;
      box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3);
      z-index: 2;
    }

    .notification-dropdown {
      position: absolute;
      top: calc(100% + 10px);
      right: 0;
      width: 380px;
      max-width: calc(100vw - 40px);
      max-height: 500px;
      background: white;
      border-radius: 1rem;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
      z-index: 99993 !important;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      margin-top: 4px;
    }

    .dropdown-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid #e2e8f0;
    }

    .dropdown-header h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
      color: #0f172a;
    }

    .mark-all-read {
      background: none;
      border: none;
      color: #0ea5e9;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      padding: 0.25rem 0.5rem;
      border-radius: 0.5rem;
      transition: background 0.2s;
    }

    .mark-all-read:hover:not(:disabled) {
      background: rgba(14, 165, 233, 0.1);
    }

    .mark-all-read:disabled {
      opacity: 0.5;
      cursor: wait;
    }

    .notifications-list {
      flex: 1;
      overflow-y: auto;
      max-height: 400px;
    }

    .notification-item {
      display: flex;
      gap: 0.75rem;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid #f1f5f9;
      cursor: pointer;
      transition: background 0.2s;
      position: relative;
    }

    .notification-item:hover {
      background: #f8fafc;
    }

    .notification-item.unread {
      background: rgba(14, 165, 233, 0.05);
    }

    .notification-item.unread:hover {
      background: rgba(14, 165, 233, 0.1);
    }

    .notification-icon {
      flex-shrink: 0;
      width: 40px;
      height: 40px;
      border-radius: 0.75rem;
      background: linear-gradient(135deg, rgba(14, 165, 233, 0.15), rgba(34, 211, 238, 0.1));
      display: flex;
      align-items: center;
      justify-content: center;
      color: #0ea5e9;
    }

    .notification-icon .icon-emoji {
      font-size: 20px;
      line-height: 1;
    }

    .notification-content {
      flex: 1;
      min-width: 0;
    }

    .notification-title {
      font-size: 0.9rem;
      font-weight: 600;
      color: #0f172a;
      margin-bottom: 0.25rem;
    }

    .notification-message {
      font-size: 0.85rem;
      color: #64748b;
      line-height: 1.4;
      margin-bottom: 0.5rem;
    }

    .notification-time {
      font-size: 0.75rem;
      color: #94a3b8;
    }

    .unread-dot {
      position: absolute;
      top: 1rem;
      right: 1rem;
      width: 8px;
      height: 8px;
      background: #0ea5e9;
      border-radius: 50%;
    }

    .loading,
    .empty {
      padding: 2rem;
      text-align: center;
      color: #64748b;
      font-size: 0.9rem;
    }

    .dropdown-footer {
      padding: 0.75rem 1.25rem;
      border-top: 1px solid #e2e8f0;
      text-align: center;
    }

    .dropdown-footer a {
      color: #0ea5e9;
      text-decoration: none;
      font-weight: 600;
      font-size: 0.9rem;
    }

    .dropdown-footer a:hover {
      text-decoration: underline;
    }
  `]
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  private readonly api = inject(NotificationApiService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);

  readonly user = this.authService.currentUser;
  readonly showDropdown = signal(false);
  readonly notifications = signal<Notification[]>([]);
  readonly unreadCount = signal(0);
  readonly loading = signal(false);
  readonly markingAll = signal(false);

  private pollingInterval?: any;

  ngOnInit(): void {
    if (this.user()?.userId) {
      this.loadNotifications();
      this.startPolling();
    }
    
    // Close dropdown when clicking outside
    this.setupClickOutsideHandler();
  }

  private setupClickOutsideHandler(): void {
    const handleDocumentClick = (e: MouseEvent) => {
      if (!this.showDropdown()) {
        return;
      }
      
      const target = e.target as HTMLElement;
      if (!target.closest('.notification-bell-wrapper')) {
        this.closeDropdown();
      }
    };

    document.addEventListener('click', handleDocumentClick);
    
    // Cleanup on destroy
    this.destroyRef.onDestroy(() => {
      document.removeEventListener('click', handleDocumentClick);
    });
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  toggleDropdown(): void {
    this.showDropdown.update(v => !v);
    if (this.showDropdown() && this.user()?.userId) {
      this.loadNotifications();
    }
  }

  closeDropdown(): void {
    this.showDropdown.set(false);
  }

  loadNotifications(): void {
    const userId = this.user()?.userId;
    if (!userId) {
      console.log('[Notification] No userId found');
      return;
    }

    console.log('[Notification] Loading notifications for userId:', userId);
    this.loading.set(true);
    this.api.getUserNotifications(userId, { limit: 20 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          console.log('[Notification] Received:', response.data?.length, 'notifications,', response.unreadCount, 'unread');
          this.notifications.set(response.data || []);
          this.unreadCount.set(response.unreadCount || 0);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('[Notification] Error loading:', error);
          this.loading.set(false);
        }
      });
  }

  startPolling(): void {
    const userId = this.user()?.userId;
    if (!userId) {
      console.log('[Notification] Cannot start polling - no userId');
      return;
    }

    console.log('[Notification] Starting polling for userId:', userId);
    // Poll every 5 seconds for new notifications
    this.pollingInterval = setInterval(() => {
      if (!this.showDropdown()) {
        // Only check unread count when dropdown is closed
        this.api.getUserNotifications(userId, { limit: 1, unreadOnly: true })
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (response) => {
              const newCount = response.unreadCount || 0;
              if (newCount !== this.unreadCount()) {
                console.log('[Notification] New unread count:', newCount);
                this.unreadCount.set(newCount);
              }
            },
            error: (err) => {
              // Silent fail for polling
              console.debug('[Notification] Polling error:', err?.message || err);
            }
          });
      } else {
        // When dropdown is open, refresh full list
        this.loadNotifications();
      }
    }, 5000);
  }

  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
  }

  handleNotificationClick(notif: Notification): void {
    if (!notif.read) {
      this.markAsRead(notif._id);
    }
    
    if (notif.link) {
      this.router.navigateByUrl(notif.link);
      this.closeDropdown();
    }
  }

  markAsRead(notificationId: string): void {
    this.api.markAsRead(notificationId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          // Update local state
          this.notifications.update(list => 
            list.map(n => n._id === notificationId ? { ...n, read: true } : n)
          );
          this.unreadCount.update(count => Math.max(0, count - 1));
        },
        error: (error) => {
          console.error('Error marking notification as read:', error);
        }
      });
  }

  markAllAsRead(): void {
    const userId = this.user()?.userId;
    if (!userId) return;

    this.markingAll.set(true);
    this.api.markAllAsRead('user', userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notifications.update(list => list.map(n => ({ ...n, read: true })));
          this.unreadCount.set(0);
          this.markingAll.set(false);
        },
        error: (error) => {
          console.error('Error marking all as read:', error);
          this.markingAll.set(false);
        }
      });
  }

  getNotificationIcon(type: string): string {
    const iconMap: { [key: string]: string } = {
      'order_created': '🛒',
      'order_delivered': '✅',
      'order_cancelled': '❌',
      'order_shipping': '🚚',
      'order_confirmed': '✔️',
      'pharmacist_reply': '💬',
      'pharmacist_chat_message': '💬',
      'new_order': '📦'
    };
    return iconMap[type] || '🔔';
  }

  formatTime(date: string | Date): string {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
}

