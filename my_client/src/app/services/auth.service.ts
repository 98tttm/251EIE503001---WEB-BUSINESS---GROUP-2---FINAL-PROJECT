import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface User {
  userId: string;
  email: string;
  phone: string;
  name?: string;
  gender?: 'Nam' | 'Nữ' | 'Khác';
  birthday?: string;
  address?: string;
  avatar?: string;
  token: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: User;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/api/auth`;
  
  // State management
  currentUser = signal<User | null>(null);
  isLoggedIn = signal(false);

  constructor(private http: HttpClient) {
    // Khôi phục session từ localStorage
    this.loadUserFromStorage();
  }

  // Đăng ký
  register(email: string, password: string, phone: string, name?: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, {
      email,
      password,
      phone,
      name
    }).pipe(
      tap(response => {
        if (response.success && response.data) {
          this.setUser(response.data);
        }
      })
    );
  }

  // Đăng nhập
  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, {
      email,
      password
    }).pipe(
      tap(response => {
        if (response.success && response.data) {
          this.setUser(response.data);
        }
      })
    );
  }

  // Lấy thông tin user hiện tại
  getMe(): Observable<AuthResponse> {
    return this.http.get<AuthResponse>(`${this.apiUrl}/me`, {
      headers: {
        'Authorization': `Bearer ${this.getToken()}`
      }
    });
  }

  // Đăng xuất
  logout(): void {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    this.currentUser.set(null);
    this.isLoggedIn.set(false);
  }

  // Lưu thông tin user
  private setUser(user: User): void {
    this.currentUser.set(user);
    this.isLoggedIn.set(true);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', user.token);
  }

  // Load user từ localStorage
  private loadUserFromStorage(): void {
    const userJson = localStorage.getItem('user');
    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        this.currentUser.set(user);
        this.isLoggedIn.set(true);
      } catch (error) {
        console.error('Error loading user from storage:', error);
        this.logout();
      }
    }
  }

  // Get token
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.isLoggedIn();
  }

  // Quên mật khẩu - Gửi OTP
  forgotPassword(email: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/forgot-password`, { email });
  }

  // Chỉ verify OTP (không reset password)
  verifyOTPOnly(email: string, otp: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/verify-otp-only`, {
      email,
      otp
    });
  }

  // Xác thực OTP và đặt lại mật khẩu
  verifyOTP(email: string, otp: string, newPassword: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/verify-otp`, {
      email,
      otp,
      newPassword
    });
  }

  // Cập nhật thông tin profile
  updateProfile(name: string, gender: string, birthday: string, address?: string): Observable<AuthResponse> {
    const token = this.getToken();
    return this.http.put<AuthResponse>(`${this.apiUrl}/profile`, {
      name,
      gender,
      birthday,
      address
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }).pipe(
      tap(response => {
        if (response.success && response.data) {
          // Update current user with new data
          const currentUser = this.currentUser();
          if (currentUser) {
            const updatedUser = {
              ...currentUser,
              name: response.data.name || name,
              gender: response.data.gender as any || gender,
              birthday: response.data.birthday || birthday,
              address: response.data.address || address
            };
            this.currentUser.set(updatedUser);
            // Cập nhật lại localStorage để giữ dữ liệu mới
            localStorage.setItem('user', JSON.stringify(updatedUser));
          }
        }
      })
    );
  }
}

