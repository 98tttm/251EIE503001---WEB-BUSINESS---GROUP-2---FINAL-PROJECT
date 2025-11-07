import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { NotificationService } from './notification.service';

export interface AdminLoginPayload {
  email: string;
  password: string;
}

export interface AdminLoginResponse {
  success: boolean;
  message: string;
  data?: {
    userId: string;
    email: string;
    phone?: string;
    name?: string;
    gender?: string;
    birthday?: string;
    address?: string;
    token: string;
  };
}

export interface AdminProfileResponse {
  success: boolean;
  message?: string;
  data?: AdminUser;
}

export interface AdminUser {
  userId: string;
  email: string;
  phone?: string;
  name?: string;
  gender?: string;
  birthday?: string;
  address?: string;
  status?: string;
  roles?: string[];
}

const ADMIN_ALLOWED_ROLES = new Set(['admin', 'manager', 'staff', 'editor', 'moderator']);

@Injectable({ providedIn: 'root' })
export class AdminAuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly notifier = inject(NotificationService);

  private readonly storageTokenKey = 'medicare_admin_token';
  private readonly storageUserKey = 'medicare_admin_user';

  private readonly _token = signal<string | null>(null);
  private readonly _user = signal<AdminUser | null>(null);
  private readonly _loading = signal(false);
  private readonly _initialized = signal(false);

  readonly token = computed(() => this._token());
  readonly currentUser = computed(() => this._user());
  readonly isAuthenticated = computed(() => Boolean(this._token()) && Boolean(this._user()));
  readonly isLoading = computed(() => this._loading());
  readonly roles = computed(() => this._user()?.roles ?? []);
  readonly isInitialized = computed(() => this._initialized());

  constructor() {
    const savedToken = this.readStorageString(this.storageTokenKey);
    const savedUser = this.readStorageJson<AdminUser>(this.storageUserKey);

    if (savedToken) {
      this._token.set(savedToken);
    }

    if (savedUser) {
      this._user.set(savedUser);
    }

    if (savedToken) {
      this.restoreSession();
    } else {
      this._initialized.set(true);
    }
  }

  async login(payload: AdminLoginPayload): Promise<boolean> {
    this._loading.set(true);

    try {
      const response = await firstValueFrom(
        this.http.post<AdminLoginResponse>('http://localhost:3000/api/auth/login', payload)
      );

      if (!response.success || !response.data?.token) {
        throw new Error(response.message || 'Đăng nhập thất bại');
      }

      this.persistToken(response.data.token);
      await this.fetchProfile();

      if (!this.hasAllowedRole()) {
        throw new Error('Tài khoản của bạn không có quyền truy cập quản trị');
      }

      this.notifier.showSuccess('Đăng nhập thành công');
      return true;
    } catch (error: any) {
      const message = error?.message || 'Đăng nhập thất bại';
      this.notifier.showError(message);
      this.logout({ redirect: false, silent: true });
      return false;
    } finally {
      this._loading.set(false);
      this._initialized.set(true);
    }
  }

  async fetchProfile(): Promise<AdminUser | null> {
    const token = this._token();
    if (!token) {
      return null;
    }

    try {
      const response = await firstValueFrom(
        this.http.get<AdminProfileResponse>('http://localhost:3000/api/auth/me')
      );

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Không thể tải thông tin người dùng');
      }

      const user = response.data;
      this._user.set(user);
      this.persistUser(user);
      return user;
    } catch (error: any) {
      console.error('[AdminAuth] fetchProfile error', error);
      this.logout({ redirect: false, silent: true });
      return null;
    }
  }

  logout(options: { redirect?: boolean; silent?: boolean } = {}): void {
    this._token.set(null);
    this._user.set(null);
    this._initialized.set(true);
    this.safeRemoveLocalStorage(this.storageTokenKey);
    this.safeRemoveLocalStorage(this.storageUserKey);

    if (!options.silent) {
      this.notifier.showInfo('Bạn đã đăng xuất khỏi hệ thống');
    }

    if (options.redirect !== false) {
      this.router.navigate(['/login']);
    }
  }

  hasAllowedRole(): boolean {
    const roles = this._user()?.roles ?? [];
    return roles.some(role => ADMIN_ALLOWED_ROLES.has(String(role).toLowerCase()));
  }

  private async restoreSession(): Promise<void> {
    try {
      await this.fetchProfile();

      if (!this.hasAllowedRole()) {
        throw new Error('Tài khoản của bạn không có quyền truy cập quản trị');
      }
    } catch (error: any) {
      if (error?.message) {
        this.notifier.showWarning(error.message);
      }
      this.logout({ redirect: false, silent: true });
    } finally {
      this._initialized.set(true);
    }
  }

  private persistToken(token: string) {
    this._token.set(token);
    this.safeWriteLocalStorage(this.storageTokenKey, token);
  }

  private persistUser(user: AdminUser) {
    this._user.set(user);
    this.safeWriteLocalStorage(this.storageUserKey, JSON.stringify(user));
  }

  private readStorageString(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn('[AdminAuth] Unable to read localStorage key', key, error);
      return null;
    }
  }

  private readStorageJson<T>(key: string): T | null {
    const raw = this.readStorageString(key);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as T;
    } catch (error) {
      console.warn('[AdminAuth] Unable to parse JSON localStorage key', key, error);
      return null;
    }
  }

  private safeWriteLocalStorage(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn('[AdminAuth] Unable to write localStorage key', key, error);
    }
  }

  private safeRemoveLocalStorage(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('[AdminAuth] Unable to remove localStorage key', key, error);
    }
  }
}


