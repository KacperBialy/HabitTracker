import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-new-task-modal',
  imports: [FormsModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/15"
         (click)="cancel.emit()">
      <div class="box w-80 p-5 shadow-[4px_6px_0_rgba(0,0,0,0.12)]" (click)="$event.stopPropagation()">
        <div class="display mb-3 text-xl">New task</div>
        <input
          class="box w-full border-[1.2px] px-2.5 py-2 text-sm outline-none"
          placeholder="Task name"
          [(ngModel)]="name"
          (keyup.enter)="submit()"
          autofocus
        />
        <div class="mt-4 flex justify-end gap-2">
          <button type="button" class="btn" (click)="cancel.emit()">Cancel</button>
          <button type="button" class="btn primary" [disabled]="!name.trim()" (click)="submit()">
            Create
          </button>
        </div>
      </div>
    </div>
  `,
})
export class NewTaskModalComponent {
  @Output() create = new EventEmitter<string>();
  @Output() cancel = new EventEmitter<void>();

  protected name = '';

  protected submit(): void {
    const trimmed = this.name.trim();
    if (trimmed) this.create.emit(trimmed);
  }
}
