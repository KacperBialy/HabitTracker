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
      @if (subtaskCount() > 0) {
        <button type="button"
                class="-ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm
                       text-muted transition-colors hover:bg-black/5 hover:text-ink"
                [attr.aria-label]="(expanded() ? 'Collapse ' : 'Expand ') + name() + ' subtasks'"
                [attr.aria-expanded]="expanded()"
                (click)="toggleSubtasks.emit()">
          <svg class="h-3 w-3 transition-transform"
               [class.-rotate-90]="!expanded()"
               viewBox="0 0 12 12"
               aria-hidden="true">
            <path d="M2.5 4.25 6 7.5l3.5-3.25"
                  fill="none"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.4" />
          </svg>
        </button>
      }
      <span class="inline-block shrink-0 rounded-[3px]"
            [class]="swatchSizeClass()"
            [style.background]="color() | taskColorHex"></span>
      <span class="flex min-w-0 flex-[1_1_12rem] items-baseline gap-2">
        <span class="truncate text-sm">{{ name() }}</span>
        @if (subtaskCount() > 0) {
          <span class="shrink-0 text-[0.6875rem] text-muted">{{ subtaskCount() }} sub</span>
        }
      </span>
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
  readonly isSubtask = input(false);
  readonly subtaskCount = input(0);
  readonly expanded = input(true);
  readonly log = output<void>();
  readonly start = output<void>();
  readonly stop = output<void>();
  readonly toggleSubtasks = output<void>();

  readonly todayLabel = computed(() => {
    const label = formatMinutes(this.todayMinutes());
    return label ? `${label} today` : '';
  });

  readonly swatchSizeClass = computed(() => (this.isSubtask() ? 'h-2 w-2' : 'h-2.5 w-2.5'));
}
