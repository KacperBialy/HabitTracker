import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

/** Shared top-bar nav: hand-lettered tabs with the active route underlined. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-nav',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <div class="border-b-[1.6px] border-rule">
      <div class="shell flex items-end gap-5 px-4 py-3 sm:gap-7 sm:px-6">
        <a routerLink="/" class="display text-2xl leading-none">habit<span class="accent">.</span></a>
        <nav class="display flex items-end gap-4 text-lg leading-none sm:gap-6 sm:text-xl">
          <a routerLink="/"
             routerLinkActive="text-ink underline decoration-2 underline-offset-[6px]"
             [routerLinkActiveOptions]="{ exact: true }"
             class="text-muted transition-colors hover:text-ink">Today</a>
          <a routerLink="/tasks"
             routerLinkActive="text-ink underline decoration-2 underline-offset-[6px]"
             class="text-muted transition-colors hover:text-ink">Tasks</a>
        </nav>
      </div>
    </div>
  `,
})
export class AppNavComponent {}
