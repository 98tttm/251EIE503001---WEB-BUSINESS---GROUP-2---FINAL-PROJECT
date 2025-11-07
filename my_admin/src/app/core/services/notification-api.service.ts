import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface Notification {
  _id: string;
  targetType: 'admin' | 'user';
  targetId?: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  link?: string;
  read: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface NotificationsResponse {
  success: boolean;
  data: Notification[];
  unreadCount: number;
}

import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class NotificationApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api`;

  getAdminNotifications(options: { limit?: number; unreadOnly?: boolean } = {}): Observable<NotificationsResponse> {
    let params = new HttpParams();
    if (options.limit) {
      params = params.set('limit', options.limit.toString());
    }
    if (options.unreadOnly) {
      params = params.set('unreadOnly', 'true');
    }

    return this.http.get<NotificationsResponse>(`${this.baseUrl}/admin/notifications`, { params });
  }

  getUserNotifications(userId: string, options: { limit?: number; unreadOnly?: boolean } = {}): Observable<NotificationsResponse> {
    let params = new HttpParams();
    if (options.limit) {
      params = params.set('limit', options.limit.toString());
    }
    if (options.unreadOnly) {
      params = params.set('unreadOnly', 'true');
    }

    return this.http.get<NotificationsResponse>(`${this.baseUrl}/notifications/user/${userId}`, { params });
  }

  markAsRead(notificationId: string): Observable<{ success: boolean }> {
    return this.http.put<{ success: boolean }>(`${this.baseUrl}/notifications/${notificationId}/read`, {});
  }

  markAllAsRead(targetType: 'admin' | 'user', targetId?: string): Observable<{ success: boolean }> {
    return this.http.put<{ success: boolean }>(`${this.baseUrl}/notifications/read-all`, {
      targetType,
      targetId
    });
  }

  deleteNotification(notificationId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/notifications/${notificationId}`);
  }
}

