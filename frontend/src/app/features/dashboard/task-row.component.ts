import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-task-row',
  template: `
    <div class="group flex items-center gap-2.5 rounded-[6px_9px_5px_8px/8px_5px_9px_6px]
                border-[1.4px] bg-paper px-2.5 py-1.5">
      <span class="min-w-0 flex-1 truncate text-sm">{{ name }}</span>
      @if (todayLabel) {
        <span class="text-muted mr-1.5 text-[13px]">{{ todayLabel }}</span>
      }
      <button type="button"
              class="btn px-2.5 py-1 text-xs opacity-0 transition-opacity
                     group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100"
              (click)="log.emit()">+ log</button>
      @if (isTracking) {
        <button type="button" class="btn danger px-2.5 py-1 text-xs" (click)="stop.emit()">■ stop</button>
      } @else {
        <button type="button"
                class="btn px-2.5 py-1 text-xs opacity-0 transition-opacity
                       group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100"
                (click)="start.emit()">▶ start</button>
      }
    </div>
  `,
})
export class TaskRowComponent {
  @Input() name = '';
  @Input() todayMinutes = 0;
  @Input() isTracking = false;
  @Output() log = new EventEmitter<void>();
  @Output() start = new EventEmitter<void>();
  @Output() stop = new EventEmitter<void>();

  get todayLabel(): string {
    const total = this.todayMinutes;
    if (total <= 0) return '';
    if (total < 60) return `${total}m today`;
    const hours = Math.floor(total / 60);
    const minutes = total % 60;
    return minutes === 0 ? `${hours}h today` : `${hours}h ${minutes}m today`;
  }
}
