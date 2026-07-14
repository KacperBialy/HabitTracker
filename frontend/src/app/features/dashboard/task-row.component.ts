import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { formatMinutes } from '../../core/date-utils';
import { TaskColorHexPipe } from '../../core/task-color-hex.pipe';
import { DEFAULT_TASK_COLOR, TaskColor } from '../../core/task-colors';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-task-row',
  imports: [TaskColorHexPipe],
  template: `
    <div class="group flex flex-wrap items-center gap-2 rounded-[6px_9px_5px_8px/8px_5px_9px_6px]
                border-[1.4px] bg-paper px-2.5 py-1.5">
      <span class="inline-block h-2.5 w-2.5 shrink-0 rounded-[3px]" [style.background]="color() | taskColorHex"></span>
      <span class="min-w-0 flex-[1_1_12rem] truncate text-sm">{{ name() }}</span>
      @if (todayLabel()) {
        <span class="text-muted mr-auto text-[13px] sm:mr-1.5">{{ todayLabel() }}</span>
      }
      <button type="button"
              class="btn px-2.5 py-1 text-xs opacity-100 transition-opacity
                     sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 focus:opacity-100"
              (click)="log.emit()">+ log</button>
      @if (isTracking()) {
        <button type="button" class="btn danger px-2.5 py-1 text-xs" (click)="stop.emit()">■ stop</button>
      } @else {
        <button type="button"
                class="btn px-2.5 py-1 text-xs opacity-100 transition-opacity
                       sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 focus:opacity-100"
                (click)="start.emit()">▶ start</button>
      }
    </div>
  `,
})
export class TaskRowComponent {
  readonly name = input('');
  readonly color = input<TaskColor>(DEFAULT_TASK_COLOR);
  readonly todayMinutes = input(0);
  readonly isTracking = input(false);
  readonly log = output<void>();
  readonly start = output<void>();
  readonly stop = output<void>();

  readonly todayLabel = computed(() => {
    const label = formatMinutes(this.todayMinutes());
    return label ? `${label} today` : '';
  });
}
