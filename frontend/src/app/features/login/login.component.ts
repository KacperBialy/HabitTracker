import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { AuthService } from '../../core/auth.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-login',
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);

  login(): void {
    this.auth.login();
  }
}
