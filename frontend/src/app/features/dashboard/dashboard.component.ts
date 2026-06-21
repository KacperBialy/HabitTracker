import { Component, OnInit, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';

import { TasksService } from '../../core/tasks.service';
import { TimerRingComponent } from './timer-ring.component';
import { TaskRowComponent } from './task-row.component';
import { NewTaskModalComponent } from './new-task-modal.component';
import { LogTimeModalComponent, LogTimePayload } from './log-time-modal.component';

interface TaskVm {
  id: string;
  name: string;
  todayMinutes: number;
}

@Component({
  selector: 'app-dashboard',
  imports: [TimerRingComponent, TaskRowComponent, NewTaskModalComponent, LogTimeModalComponent],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private readonly tasks = inject(TasksService);

  protected readonly taskVms = signal<TaskVm[]>([]);
  protected readonly loading = signal(true);
  protected readonly showNewTask = signal(false);
  protected readonly loggingTask = signal<TaskVm | null>(null);
  protected readonly logError = signal('');

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    forkJoin({
      tasks: this.tasks.list(),
      entries: this.tasks.dayEntries(this.today()),
    }).subscribe(({ tasks, entries }) => {
      const minutesByTask = new Map<string, number>();
      for (const entry of entries) {
        minutesByTask.set(entry.taskId, (minutesByTask.get(entry.taskId) ?? 0) + entry.minutes);
      }
      this.taskVms.set(
        tasks.map((task) => ({
          id: task.id,
          name: task.name,
          todayMinutes: minutesByTask.get(task.id) ?? 0,
        })),
      );
      this.loading.set(false);
    });
  }

  protected createTask(name: string): void {
    this.tasks.create(name).subscribe(() => {
      this.showNewTask.set(false);
      this.load();
    });
  }

  protected openLog(task: TaskVm): void {
    this.logError.set('');
    this.loggingTask.set(task);
  }

  protected logTime(payload: LogTimePayload): void {
    const task = this.loggingTask();
    if (!task) return;

    this.tasks.logTime(task.id, payload.minutes, payload.logDate).subscribe({
      next: () => {
        this.loggingTask.set(null);
        this.load();
      },
      error: () => this.logError.set('Could not save the entry. Please try again.'),
    });
  }

  /** Local date as YYYY-MM-DD for the day-aggregates endpoint. */
  today(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = `${now.getMonth() + 1}`.padStart(2, '0');
    const day = `${now.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
