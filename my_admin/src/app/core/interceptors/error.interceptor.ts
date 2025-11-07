import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';
import { AdminAuthService } from '../services/admin-auth.service';

/**
 * HTTP Interceptor to handle errors globally
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const notifier = inject(NotificationService);
  const authService = inject(AdminAuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'Đã xảy ra lỗi không xác định';

      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMessage = `Lỗi: ${error.error.message}`;
      } else {
        // Server-side error
        switch (error.status) {
          case 0:
            errorMessage = 'Không thể kết nối đến server';
            break;
          case 400:
            errorMessage = error.error?.message || error.error?.error?.message || 'Dữ liệu không hợp lệ';
            break;
          case 401:
            errorMessage = 'Phiên đăng nhập đã hết hạn';
            authService.logout();
            router.navigate(['/login']);
            break;
          case 403:
            errorMessage = 'Bạn không có quyền thực hiện thao tác này';
            break;
          case 404:
            errorMessage = 'Không tìm thấy dữ liệu';
            break;
          case 409:
            errorMessage = error.error?.message || 'Dữ liệu bị trùng lặp';
            break;
          case 429:
            errorMessage = 'Quá nhiều yêu cầu. Vui lòng thử lại sau';
            break;
          case 500:
            errorMessage = 'Lỗi máy chủ. Vui lòng thử lại sau';
            break;
          default:
            errorMessage = error.error?.message || error.error?.error?.message || `Lỗi ${error.status}`;
        }
      }

      // Show notification (except for 401 as we're redirecting)
      if (error.status !== 401) {
        notifier.showError(errorMessage);
      }

      // Log error to console for debugging
      console.error('HTTP Error:', {
        url: req.url,
        status: error.status,
        message: errorMessage,
        error: error.error
      });

      return throwError(() => error);
    })
  );
};

