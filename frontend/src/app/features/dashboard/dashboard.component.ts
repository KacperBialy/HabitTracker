import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';

import { TasksService } from '../../core/tasks.service';
import { AppNavComponent } from '../../core/app-nav.component';
import { ActiveTimerService } from '../../core/active-timer.service';
import { formatMinutes, localDateString } from '../../core/date-utils';
import { DailyAggregate, DayEntry } from '../../core/models';
import { TaskColor } from '../../core/task-colors';
import { groupTasksByParent } from '../../core/task-tree';
import { taskDisplayName } from '../../core/task-rollup';
import { TimerRingComponent } from './timer-ring.component';
import { TaskRowComponent } from './task-row.component';
import { NewTaskModalComponent, NewTaskPayload } from './new-task-modal.component';
import { LogTimeModalComponent, LogTimePayload } from './log-time-modal.component';
import { ContributionsHeatmapComponent } from './contributions-heatmap.component';
import { DayHistoryComponent } from './day-history.component';
import { TimePerTaskChartComponent } from './time-per-task-chart.component';
import { TaskShareChartComponent } from './task-share-chart.component';
import { TrendComparisonComponent } from './trend-comparison.component';

export interface TaskVm {
  id: string;
  name: string;
  color: TaskColor;
  parentTaskId: string | null;
  parentName: string | null;
  ownMinutes: number;
  totalMinutes: number;
  children: TaskVm[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-dashboard',
  imports: [
    AppNavComponent,
    TimerRingComponent,
    TaskRowComponent,
    NewTaskModalComponent,
    LogTimeModalComponent,
    TrendComparisonComponent,
    ContributionsHeatmapComponent,
    TimePerTaskChartComponent,
    TaskShareChartComponent,
    DayHistoryComponent,
  ],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private readonly tasks = inject(TasksService);
  protected readonly timer = inject(ActiveTimerService);

  protected readonly taskVms = signal<TaskVm[]>([]);
  protected readonly heatmapDays = signal<DailyAggregate[]>([]);
  protected readonly historyEntries = signal<DayEntry[]>([]);
  protected readonly selectedHistoryDate = signal<string | null>(null);
  protected readonly loading = signal(true);
  protected readonly showNewTask = signal(false);
  protected readonly newTaskParent = signal<TaskVm | null>(null);
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
    return `Stopping saves ${formatMinutes(minutes)} to today's log.`;
  });

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    // The rolling 365-day window can straddle the year boundary, so fetch this year and last
    // year and let the heatmap slice to the window (the aggregates endpoint is calendar-year).
    // Entries cover the same two calendar years and feed both today's totals and the history.
    const currentYear = new Date().getFullYear();
    const today = this.today();
    forkJoin({
      tasks: this.tasks.list(),
      entries: this.tasks.entries(`${currentYear - 1}-01-01`, `${currentYear}-12-31`),
      thisYear: this.tasks.yearAggregates(currentYear),
      lastYear: this.tasks.yearAggregates(currentYear - 1),
    }).subscribe(({ tasks, entries, thisYear, lastYear }) => {
      const minutesByTask = new Map<string, number>();
      for (const entry of entries) {
        if (entry.date !== today) continue;
        minutesByTask.set(entry.taskId, (minutesByTask.get(entry.taskId) ?? 0) + entry.minutes);
      }
      this.historyEntries.set(entries);
      this.taskVms.set(
        groupTasksByParent(tasks).map((group) => {
          const children = group.children.map((child) => {
            const ownMinutes = minutesByTask.get(child.id) ?? 0;
            return {
              id: child.id,
              name: child.name,
              color: child.color,
              parentTaskId: child.parentTaskId,
              parentName: group.root.name,
              ownMinutes,
              totalMinutes: ownMinutes,
              children: [],
            };
          });
          const ownMinutes = minutesByTask.get(group.root.id) ?? 0;
          return {
            id: group.root.id,
            name: group.root.name,
            color: group.root.color,
            parentTaskId: group.root.parentTaskId,
            parentName: null,
            ownMinutes,
            totalMinutes: ownMinutes + children.reduce((sum, child) => sum + child.ownMinutes, 0),
            children,
          };
        }),
      );
      this.heatmapDays.set([...lastYear.days, ...thisYear.days]);
      this.loading.set(false);
    });
  }

  protected openNewSubtask(parent: TaskVm): void {
    this.showNewTask.set(false);
    this.newTaskParent.set(parent);
  }

  protected closeNewTask(): void {
    this.showNewTask.set(false);
    this.newTaskParent.set(null);
  }

  protected createTask(payload: NewTaskPayload): void {
    const created = payload.parentTaskId
      ? this.tasks.createSubtask(payload.parentTaskId, payload.name, payload.color)
      : this.tasks.create(payload.name, payload.color);

    created.subscribe(() => {
      this.closeNewTask();
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

  /** Deletes one log from the history; reloads either way so the view matches the server. */
  protected deleteEntry(entry: DayEntry): void {
    this.tasks.deleteTimeLog(entry.taskId, entry.id).subscribe({
      next: () => this.load(),
      error: () => this.load(),
    });
  }

  /** Starts (or switches to) a timer for this task; reloads once any previous timer is logged. */
  protected startTimer(task: TaskVm): void {
    this.timer.start(task.id, taskDisplayName(task.name, task.parentName)).subscribe(() => this.load());
  }

  /** Stops the active timer, persists it, then reloads so taskVms reflect the new minutes. */
  protected stopTimer(): void {
    this.timer.stop(this.today()).subscribe({
      next: () => this.load(),
      error: () => this.logError.set('Could not save the timer. Please try again.'),
    });
  }

  protected displayName(task: TaskVm): string {
    return taskDisplayName(task.name, task.parentName);
  }

  private formatElapsed(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const paddedSeconds = `${seconds}`.padStart(2, '0');
    if (hours === 0) return `${minutes}:${paddedSeconds}`;
    return `${hours}:${`${minutes}`.padStart(2, '0')}:${paddedSeconds}`;
  }

  /** Local date as YYYY-MM-DD for the day-aggregates endpoint. */
  today(): string {
    return localDateString();
  }
}
