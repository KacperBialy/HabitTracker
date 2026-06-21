import { Routes } from '@angular/router';

import { LoginComponent } from './features/login/login.component';
import { guestGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
];
