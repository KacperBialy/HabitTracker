import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';

import { TasksService } from '../../core/tasks.service';
import { ActiveTimerService } from '../../core/active-timer.service';
import { Task } from '../../core/models';
import { TaskColor } from '../../core/task-colors';
import { TaskColorHexPipe } from '../../core/task-color-hex.pipe';
import { AppNavComponent } from '../../core/app-nav.component';
import { NewTaskModalComponent } from '../dashboard/new-task-modal.component';
import { EditTaskModalComponent, EditTaskPayload } from './edit-task-modal.component';
import { DeleteTaskModalComponent } from './delete-task-modal.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-manage-tasks',
  imports: [
    AppNavComponent,
    TaskColorHexPipe,
    NewTaskModalComponent,
    EditTaskModalComponent,
    DeleteTaskModalComponent,
  ],
  templateUrl: './manage-tasks.component.html',
})
export class ManageTasksComponent implements OnInit {
  private readonly tasks = inject(TasksService);
  private readonly timer = inject(ActiveTimerService);

  protected readonly taskList = signal<Task[]>([]);
  protected readonly loading = signal(true);
  protected readonly showNewTask = signal(false);
  protected readonly editingTask = signal<Task | null>(null);
  protected readonly deletingTask = signal<Task | null>(null);

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.tasks.list().subscribe((tasks) => {
      this.taskList.set(tasks);
      this.loading.set(false);
    });
  }

  protected createTask(request: { name: string; color: TaskColor }): void {
    this.tasks.create(request.name, request.color).subscribe(() => {
      this.showNewTask.set(false);
      this.load();
    });
  }

  protected updateTask(payload: EditTaskPayload): void {
    const task = this.editingTask();
    if (!task) return;

    this.tasks.update(task.id, payload.name, payload.color).subscribe(() => {
      this.editingTask.set(null);
      this.load();
    });
  }

  protected deleteTask(): void {
    const task = this.deletingTask();
    if (!task) return;

    // The timer is frontend-only; drop it without logging time to a task that's about to be gone.
    if (this.timer.activeTimer()?.taskId === task.id) 
      this.timer.discard();

    this.tasks.delete(task.id).subscribe(() => {
      this.deletingTask.set(null);
      this.load();
    });
  }
}
