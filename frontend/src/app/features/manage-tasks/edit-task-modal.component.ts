import { ChangeDetectionStrategy, Component, OnInit, input, output, signal } from '@angular/core';

import { TaskColorHexPipe } from '../../core/task-color-hex.pipe';
import { DEFAULT_TASK_COLOR, TASK_COLOR_OPTIONS, TaskColor } from '../../core/task-colors';

export interface EditTaskPayload {
  name: string;
  color: TaskColor;
}

/** Edits a task's name and color. Pre-filled from the current values; mirrors NewTaskModalComponent. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-edit-task-modal',
  imports: [TaskColorHexPipe],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/15 p-4"
         (click)="cancel.emit()">
      <div class="box w-full max-w-80 p-4 shadow-[4px_6px_0_rgba(0,0,0,0.12)] sm:p-5" (click)="$event.stopPropagation()">
        <div class="display mb-3 text-xl">Edit task</div>
        <input
          class="box w-full border-[1.2px] px-2.5 py-2 text-sm outline-none"
          placeholder="Task name"
          [value]="name()"
          (input)="name.set($any($event.target).value)"
          (keyup.enter)="submit()"
          autofocus
        />
        <div class="mt-3">
          <div class="text-muted mb-1.5 text-[0.8125rem]">Color</div>
          <div class="flex flex-wrap gap-2">
            @for (option of colorOptions; track option) {
              <button type="button"
                      class="h-6 w-6 rounded-[4px] border-[1.4px] transition-transform"
                      [class.border-rule]="option === color()"
                      [class.border-transparent]="option !== color()"
                      [class.scale-110]="option === color()"
                      [style.background]="option | taskColorHex"
                      [attr.aria-label]="'Color ' + option"
                      [attr.aria-pressed]="option === color()"
                      (click)="color.set(option)"></button>
            }
          </div>
        </div>
        <div class="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" class="btn" (click)="cancel.emit()">Cancel</button>
          <button type="button" class="btn primary" [disabled]="!name().trim()" (click)="submit()">
            Save
          </button>
        </div>
      </div>
    </div>
  `,
})
export class EditTaskModalComponent implements OnInit {
  readonly initialName = input('');
  readonly initialColor = input<TaskColor>(DEFAULT_TASK_COLOR);

  readonly save = output<EditTaskPayload>();
  readonly cancel = output<void>();

  protected readonly name = signal('');
  protected readonly color = signal<TaskColor>(DEFAULT_TASK_COLOR);

  protected readonly colorOptions = TASK_COLOR_OPTIONS;

  ngOnInit(): void {
    this.name.set(this.initialName());
    this.color.set(this.initialColor());
  }

  protected submit(): void {
    const trimmed = this.name().trim();
    if (trimmed) this.save.emit({ name: trimmed, color: this.color() });
  }
}
