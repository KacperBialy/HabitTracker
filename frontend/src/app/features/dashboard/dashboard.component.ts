import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';

import { TasksService } from '../../core/tasks.service';
import { ActiveTimerService } from '../../core/active-timer.service';
import { localDateString } from '../../core/date-utils';
import { DailyAggregate } from '../../core/models';
import { TimerRingComponent } from './timer-ring.component';
import { TaskRowComponent } from './task-row.component';
import { NewTaskModalComponent } from './new-task-modal.component';
import { LogTimeModalComponent, LogTimePayload } from './log-time-modal.component';
import { ContributionsHeatmapComponent } from './contributions-heatmap.component';
import { DayHistoryComponent } from './day-history.component';

interface TaskVm {
  id: string;
  name: string;
  todayMinutes: number;
}

@Component({
  selector: 'app-dashboard',
  imports: [
    TimerRingComponent,
    TaskRowComponent,
    NewTaskModalComponent,
    LogTimeModalComponent,
    ContributionsHeatmapComponent,
    DayHistoryComponent,
  ],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private readonly tasks = inject(TasksService);
  protected readonly timer = inject(ActiveTimerService);

  protected readonly taskVms = signal<TaskVm[]>([]);
  protected readonly heatmapDays = signal<DailyAggregate[]>([]);
  protected readonly selectedHistoryDate = signal<string | null>(null);
  protected readonly loading = signal(true);
  protected readonly showNewTask = signal(false);
  protected readonly loggingTask = signal<TaskVm | null>(null);
  protected readonly logError = signal('');

  protected readonly activeTaskId = computed(() => this.timer.activeTimer()?.taskId ?? null);

  protected readonly heroLabel = computed(() => this.formatElapsed(this.timer.elapsedSeconds()));

  protected readonly heroSub = computed(() => {
    const active = this.timer.activeTimer();
    if (!active)
      return '';

    const started = active.startedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `started ${started}`;
  });

  /** Visual heartbeat — sweeps once per minute. There's no fixed target duration to show real progress toward. */
  protected readonly heroProgress = computed(() => (this.timer.elapsedSeconds() % 60) / 60);

  protected readonly heroSaveNote = computed(() => {
    const minutes = Math.max(1, Math.round(this.timer.elapsedSeconds() / 60));
    return `Stopping saves ${minutes} min to today's log.`;
  });

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    // The rolling 365-day window can straddle the year boundary, so fetch this year and last
    // year and let the heatmap slice to the window (the aggregates endpoint is calendar-year).
    const currentYear = new Date().getFullYear();
    forkJoin({
      tasks: this.tasks.list(),
      entries: this.tasks.dayEntries(this.today()),
      thisYear: this.tasks.yearAggregates(currentYear),
      lastYear: this.tasks.yearAggregates(currentYear - 1),
    }).subscribe(({ tasks, entries, thisYear, lastYear }) => {
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
      this.heatmapDays.set([...lastYear.days, ...thisYear.days]);
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

  /** Starts (or switches to) a timer for this task; reloads once any previous timer is logged. */
  protected startTimer(task: TaskVm): void {
    this.timer.start(task.id, task.name).subscribe(() => this.load());
  }

  /** Stops the active timer, persists it, then reloads so taskVms reflect the new minutes. */
  protected stopTimer(): void {
    this.timer.stop(this.today()).subscribe({
      next: () => this.load(),
      error: () => this.logError.set('Could not save the timer. Please try again.'),
    });
  }

  private formatElapsed(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${`${seconds}`.padStart(2, '0')}`;
  }

  /** Local date as YYYY-MM-DD for the day-aggregates endpoint. */
  today(): string {
    return localDateString();
  }
}
