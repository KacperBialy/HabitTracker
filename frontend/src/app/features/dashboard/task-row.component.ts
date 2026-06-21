import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-task-row',
  template: `
    <div class="flex items-center gap-2.5 rounded-[6px_9px_5px_8px/8px_5px_9px_6px]
                border-[1.4px] border-rule bg-paper px-2.5 py-1.5">
      <span class="h-3.5 w-3.5 flex-none rounded-[3px] border border-black/25 bg-muted"></span>
      <span class="min-w-0 flex-1 truncate text-sm">{{ name }}</span>
      @if (todayLabel) {
        <span class="text-muted mr-1.5 text-[13px]">{{ todayLabel }}</span>
      }
      <!-- Decorative: no timer backend yet. -->
      <button type="button" class="btn px-2.5 py-1 text-xs" disabled>▶</button>
    </div>
  `,
})
export class TaskRowComponent {
  @Input() name = '';
  @Input() todayMinutes = 0;

  get todayLabel(): string {
    const total = this.todayMinutes;
    if (total <= 0) return '';
    if (total < 60) return `${total}m today`;
    const hours = Math.floor(total / 60);
    const minutes = total % 60;
    return minutes === 0 ? `${hours}h today` : `${hours}h ${minutes}m today`;
  }
}
