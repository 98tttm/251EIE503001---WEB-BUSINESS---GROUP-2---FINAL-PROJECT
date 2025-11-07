import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

export interface AdminCollectionMeta {
  key: string;
  label: string;
  description?: string;
  allowCreate: boolean;
  allowUpdate: boolean;
  allowDelete: boolean;
}

export interface AdminCollectionListOptions {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  filters?: Record<string, string | number | boolean | (string | number | boolean)[]>;
}

export interface AdminListResponse<T = unknown> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface AdminDocumentResponse<T = unknown> {
  success: boolean;
  data: T;
}

export interface AdminSummaryPayload {
  totals: Record<string, number>;
  ordersByStatus: Array<{ _id: string; count: number }>;
  revenueLast30Days: Array<{ _id: { day: string }; total: number; orders: number }>;
  recentOrders: unknown[];
  recentUsers: unknown[];
  topCategories: unknown[];
}

interface AdminSummaryResponse {
  success: boolean;
  data: AdminSummaryPayload;
}

interface AdminCollectionsResponse {
  success: boolean;
  data: AdminCollectionMeta[];
}

import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/admin`;

  getCollections(): Observable<AdminCollectionMeta[]> {
    return this.http
      .get<AdminCollectionsResponse>(`${this.baseUrl}/collections`)
      .pipe(map(response => response.data ?? []));
  }

  getSummary(): Observable<AdminSummaryPayload> {
    // Add timestamp to bypass cache
    const timestamp = new Date().getTime();
    return this.http
      .get<AdminSummaryResponse>(`${this.baseUrl}/summary?_=${timestamp}`)
      .pipe(map(response => response.data));
  }

  getCollectionItems<T = unknown>(
    collectionKey: string,
    options: AdminCollectionListOptions = {}
  ): Observable<AdminListResponse<T>> {
    const params = this.buildParams(options);
    return this.http.get<AdminListResponse<T>>(`${this.baseUrl}/${collectionKey}`, { params });
  }

  getDocument<T = unknown>(collectionKey: string, id: string): Observable<AdminDocumentResponse<T>> {
    // Ensure ID is properly encoded for URLs with special characters
    const encodedId = encodeURIComponent(id.trim());
    return this.http.get<AdminDocumentResponse<T>>(`${this.baseUrl}/${collectionKey}/${encodedId}`);
  }

  createDocument<T = unknown>(collectionKey: string, payload: T): Observable<AdminDocumentResponse<T>> {
    return this.http.post<AdminDocumentResponse<T>>(`${this.baseUrl}/${collectionKey}`, payload);
  }

  updateDocument<T = unknown>(
    collectionKey: string,
    id: string,
    payload: Partial<T>
  ): Observable<AdminDocumentResponse<T>> {
    // Ensure ID is properly encoded and trimmed
    const encodedId = encodeURIComponent(id.trim());
    const url = `${this.baseUrl}/${collectionKey}/${encodedId}`;
    return this.http.put<AdminDocumentResponse<T>>(url, payload);
  }

  deleteDocument(collectionKey: string, id: string): Observable<{ success: boolean; deletedCount: number }> {
    // Ensure ID is properly encoded for URLs with special characters
    const encodedId = encodeURIComponent(id.trim());
    return this.http.delete<{ success: boolean; deletedCount: number }>(
      `${this.baseUrl}/${collectionKey}/${encodedId}`
    );
  }

  respondPharmacistChat(chatId: string, message: string, file?: File, type?: 'text' | 'emoji' | 'file'): Observable<{ success: boolean; data: unknown }> {
    const encodedId = encodeURIComponent(chatId.trim());
    const formData = new FormData();
    formData.append('message', message || '');
    if (type) {
      formData.append('type', type);
    }
    if (file) {
      formData.append('file', file);
    }
    return this.http.post<{ success: boolean; data: unknown }>(
      `${this.baseUrl}/pharmacist-chat/${encodedId}/respond`,
      formData
    );
  }

  private buildParams(options: AdminCollectionListOptions): HttpParams {
    let params = new HttpParams();

    if (options.page) {
      params = params.set('page', options.page.toString());
    }

    if (options.limit) {
      params = params.set('limit', options.limit.toString());
    }

    if (options.search) {
      params = params.set('search', options.search);
    }

    if (options.sortBy) {
      params = params.set('sortBy', options.sortBy);
    }

    if (options.sortDir) {
      params = params.set('sortDir', options.sortDir);
    }

    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (value === undefined || value === null) {
          return;
        }

        if (Array.isArray(value)) {
          value.forEach((item, index) => {
            params = params.append(`filters[${key}][${index}]`, String(item));
          });
        } else {
          params = params.set(`filters[${key}]`, String(value));
        }
      });
    }

    return params;
  }

  // Generic GET and POST for custom endpoints
  get<T = any>(url: string, options?: any): Observable<T> {
    return this.http.get<T>(`${environment.apiUrl}${url}`, options) as Observable<T>;
  }

  post<T = any>(url: string, payload: any, options?: any): Observable<T> {
    return this.http.post<T>(`${environment.apiUrl}${url}`, payload, options) as Observable<T>;
  }
}


