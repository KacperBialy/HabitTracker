import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** Confirms permanent deletion of a task and all its time entries. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-delete-task-modal',
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/15 p-4"
         (click)="cancel.emit()">
      <div class="box w-full max-w-80 p-4 shadow-[4px_6px_0_rgba(0,0,0,0.12)] sm:p-5" (click)="$event.stopPropagation()">
        <div class="display mb-3 text-xl">Delete task</div>
        <p class="text-sm">
          Delete <span class="font-semibold">{{ taskName() }}</span> and all of its time entries?
          This can't be undone.
        </p>
        <div class="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" class="btn" (click)="cancel.emit()">Cancel</button>
          <button type="button" class="btn danger" (click)="confirm.emit()">Delete</button>
        </div>
      </div>
    </div>
  `,
})
export class DeleteTaskModalComponent {
  readonly taskName = input('');
  readonly confirm = output<void>();
  readonly cancel = output<void>();
}
