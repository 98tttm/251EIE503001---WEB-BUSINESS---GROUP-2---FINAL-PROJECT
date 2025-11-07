import { CanActivateChildFn, CanActivateFn, Router, UrlTree } from '@angular/router';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';

import { AdminAuthService } from '../services/admin-auth.service';
import { NotificationService } from '../services/notification.service';

function resolveAdminAccess(): boolean | UrlTree | Observable<boolean | UrlTree> {
  const auth = inject(AdminAuthService);
  const router = inject(Router);
  const notifier = inject(NotificationService);

  const evaluate = (): boolean | UrlTree => {
    if (auth.isAuthenticated()) {
      if (auth.hasAllowedRole()) {
        return true;
      }

      notifier.showWarning('Tài khoản của bạn không có quyền truy cập trang quản trị');
      auth.logout({ redirect: false, silent: true });
      return router.createUrlTree(['/login']);
    }

    const redirectUrl = router.url && router.url !== '/login' ? router.url : undefined;
    return router.createUrlTree(['/login'], {
      queryParams: redirectUrl ? { redirect: redirectUrl } : undefined
    });
  };

  if (auth.isInitialized()) {
    return evaluate();
  }

  return toObservable(auth.isInitialized).pipe(
    filter(initialized => initialized === true),
    take(1),
    map(() => evaluate())
  );
}

export const adminAuthGuard: CanActivateFn = () => resolveAdminAccess();

export const adminAuthChildGuard: CanActivateChildFn = () => resolveAdminAccess();


