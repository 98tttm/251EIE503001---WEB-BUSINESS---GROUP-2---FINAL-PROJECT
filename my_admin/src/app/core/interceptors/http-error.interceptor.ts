import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { NotificationService } from '../services/notification.service';

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const notifier = inject(NotificationService);

  return next(req).pipe(
    catchError(error => {
      const message = error?.error?.message || error?.message || 'Yêu cầu thất bại';
      notifier.showError(message);
      return throwError(() => error);
    })
  );
};

