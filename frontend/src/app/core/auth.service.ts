import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CurrentUser {
  id: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  /** Resolves to the current user, or errors (401) when not authenticated. */
  me(): Observable<CurrentUser> {
    return this.http.get<CurrentUser>('/api/me');
  }

  /** Full-page navigation to the OIDC challenge — a browser redirect, not an XHR. */
  login(): void {
    window.location.href = '/api/auth/login';
  }
}
