import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, catchError, of } from 'rxjs';

import { AuthService } from './auth.service';

/** Allows the route only when authenticated; otherwise redirects to /login. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.me().pipe(
    map(() => true),
    catchError(() => of(router.parseUrl('/login'))),
  );
};

/** Inverse of authGuard: keeps authenticated users off /login, bouncing them to /. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.me().pipe(
    map(() => router.parseUrl('/')),
    catchError(() => of(true)),
  );
};
