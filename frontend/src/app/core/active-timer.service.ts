import { Injectable, OnDestroy, computed, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';

import { TasksService } from './tasks.service';
import { localDateString } from './date-utils';

const STORAGE_KEY = 'habit-tracker.active-timer';
const TICK_MS = 1000;
const MIN_LOGGABLE_MINUTES = 1;

interface StoredTimer {
  taskId: string;
  taskName: string;
  startedAt: string;
}

export interface ActiveTimerSnapshot {
  taskId: string;
  taskName: string;
  startedAt: Date;
}

@Injectable({ providedIn: 'root' })
export class ActiveTimerService implements OnDestroy {
  private readonly tasksService = inject(TasksService);

  private readonly active = signal<ActiveTimerSnapshot | null>(this.readStorage());
  private readonly nowMs = signal<number>(Date.now());
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private readonly onStorageEvent = (e: StorageEvent) => this.handleStorageEvent(e);

  readonly activeTimer = this.active.asReadonly();

  readonly elapsedSeconds = computed(() => {
    const timer = this.active();
    if (!timer) return 0;
    return Math.max(0, Math.floor((this.nowMs() - timer.startedAt.getTime()) / 1000));
  });

  constructor() {
    if (this.active()) this.ensureTicking();
    window.addEventListener('storage', this.onStorageEvent);
  }

  ngOnDestroy(): void {
    this.stopTicking();
    window.removeEventListener('storage', this.onStorageEvent);
  }

  /** Starts a timer for taskId. If a different timer is running, stops+logs it first. Same task already running is a no-op. */
  start(taskId: string, taskName: string): Observable<void> {
    return new Observable<void>((subscriber) => {
      const current = this.active();
      const beginNew = () => {
        const snapshot: ActiveTimerSnapshot = { taskId, taskName, startedAt: new Date() };
        this.active.set(snapshot);
        this.writeStorage(snapshot);
        this.ensureTicking();
        subscriber.next();
        subscriber.complete();
      };

      if (current && current.taskId !== taskId) {
        this.stop().subscribe({
          next: beginNew,
          error: beginNew,
        });
      } else if (!current) {
        beginNew();
      } else {
        subscriber.next();
        subscriber.complete();
      }
    });
  }

  /** Stops the active timer (if any), logs elapsed minutes (rounded up, floored at 1), then clears state. No-op if idle. */
  stop(logDate: string = localDateString()): Observable<void> {
    const timer = this.active();
    if (!timer) {
      return new Observable<void>((subscriber) => {
        subscriber.next();
        subscriber.complete();
      });
    }

    const minutes = this.roundToLoggableMinutes(this.elapsedSeconds());
    this.clear();

    return new Observable<void>((subscriber) => {
      this.tasksService.logTime(timer.taskId, minutes, logDate).subscribe({
        next: () => {
          subscriber.next();
          subscriber.complete();
        },
        error: (err) => subscriber.error(err),
      });
    });
  }

  discard(): void {
    this.clear();
  }

  private clear(): void {
    this.active.set(null);
    this.stopTicking();
    localStorage.removeItem(STORAGE_KEY);
  }

  private roundToLoggableMinutes(seconds: number): number {
    const minutes = Math.ceil(seconds / 60);
    return Math.max(MIN_LOGGABLE_MINUTES, minutes);
  }

  private ensureTicking(): void {
    if (this.intervalHandle !== null) return;

    this.nowMs.set(Date.now());
    this.intervalHandle = setInterval(() => this.nowMs.set(Date.now()), TICK_MS);
  }

  private stopTicking(): void {
    if (this.intervalHandle !== null) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  private readStorage(): ActiveTimerSnapshot | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw) as StoredTimer;
      if (!parsed.taskId || !parsed.startedAt) return null;

      return {
        taskId: parsed.taskId,
        taskName: parsed.taskName ?? '',
        startedAt: new Date(parsed.startedAt),
      };
    } catch {
      return null;
    }
  }

  private writeStorage(snapshot: ActiveTimerSnapshot): void {
    const stored: StoredTimer = {
      taskId: snapshot.taskId,
      taskName: snapshot.taskName,
      startedAt: snapshot.startedAt.toISOString(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    } catch {
      // Storage unavailable/quota exceeded — timer still works in-memory until reload.
    }
  }

  private handleStorageEvent(e: StorageEvent): void {
    if (e.key !== STORAGE_KEY) return;

    const next = this.readStorage();
    this.active.set(next);
    if (next) this.ensureTicking();
    else this.stopTicking();
  }
}
