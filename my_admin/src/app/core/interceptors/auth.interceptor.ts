import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AdminAuthService } from '../services/admin-auth.service';

/**
 * HTTP Interceptor to add JWT token to all requests
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AdminAuthService);
  const token = authService.token();

  // Skip adding token for login endpoint
  if (req.url.includes('/api/auth/login')) {
    return next(req);
  }

  // Add token to request headers if available
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req);
};
