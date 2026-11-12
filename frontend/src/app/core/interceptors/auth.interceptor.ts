import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { IdentityService } from '../services/identity.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  const identity = inject(IdentityService);
  const currentUser = identity.currentUser();

  if (!currentUser) {
    return next(req);
  }

  const cloned = req.clone({
    setHeaders: {
      'X-User-Id': String(currentUser.id),
    },
  });

  return next(cloned);
};

