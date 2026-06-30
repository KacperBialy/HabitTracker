import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { ActiveTimerService } from './active-timer.service';
import { TasksService } from './tasks.service';

const STORAGE_KEY = 'habit-tracker.active-timer';

describe('ActiveTimerService', () => {
  let logTimeCalls: Array<{ taskId: string; minutes: number; logDate: string }>;

  function setup(): ActiveTimerService {
    logTimeCalls = [];
    const tasksService: Partial<TasksService> = {
      logTime: (taskId: string, minutes: number, logDate: string) => {
        logTimeCalls.push({ taskId, minutes, logDate });
        return of({ id: 'log1', taskId, ownerId: 'o', minutes, logDate });
      },
    };

    TestBed.configureTestingModule({
      providers: [{ provide: TasksService, useValue: tasksService }],
    });

    return TestBed.inject(ActiveTimerService);
  }

  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    vi.useRealTimers();
  });

  it('is idle with no active timer by default', () => {
    const service = setup();
    expect(service.activeTimer()).toBeNull();
    expect(service.elapsedSeconds()).toBe(0);
  });

  it('starts a timer and persists it to localStorage', () => {
    const service = setup();
    service.start('task-a', 'Reading').subscribe();

    const active = service.activeTimer();
    expect(active?.taskId).toBe('task-a');
    expect(active?.taskName).toBe('Reading');

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.taskId).toBe('task-a');
  });

  it('ticks elapsedSeconds while a timer is running', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-30T10:00:00Z'));

    const service = setup();
    service.start('task-a', 'Reading').subscribe();
    expect(service.elapsedSeconds()).toBe(0);

    vi.advanceTimersByTime(5000);
    expect(service.elapsedSeconds()).toBe(5);
  });

  it('stops the timer, logs rounded minutes, and clears state', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-30T10:00:00Z'));

    const service = setup();
    service.start('task-a', 'Reading').subscribe();
    vi.advanceTimersByTime(90_000); // 1.5 minutes

    service.stop('2026-06-30').subscribe();

    expect(logTimeCalls).toEqual([{ taskId: 'task-a', minutes: 2, logDate: '2026-06-30' }]);
    expect(service.activeTimer()).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('rounds up to the next minute when even 1 second over', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-30T10:00:00Z'));

    const service = setup();
    service.start('task-a', 'Reading').subscribe();
    vi.advanceTimersByTime(61_000);

    service.stop('2026-06-30').subscribe();

    expect(logTimeCalls[0].minutes).toBe(2);
  });

  it('floors logged minutes at 1 even for a few seconds elapsed', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-30T10:00:00Z'));

    const service = setup();
    service.start('task-a', 'Reading').subscribe();
    vi.advanceTimersByTime(5000);

    service.stop('2026-06-30').subscribe();

    expect(logTimeCalls[0].minutes).toBe(1);
  });

  it('auto-stops and logs the previous task before starting a new one', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-30T10:00:00Z'));

    const service = setup();
    service.start('task-a', 'Reading').subscribe();
    vi.advanceTimersByTime(60_000);

    service.start('task-b', 'Workout').subscribe();

    expect(logTimeCalls).toEqual([{ taskId: 'task-a', minutes: 1, logDate: '2026-06-30' }]);
    expect(service.activeTimer()?.taskId).toBe('task-b');
  });

  it('is a no-op when starting the same task that is already running', () => {
    const service = setup();
    service.start('task-a', 'Reading').subscribe();
    service.start('task-a', 'Reading').subscribe();

    expect(logTimeCalls.length).toBe(0);
    expect(service.activeTimer()?.taskId).toBe('task-a');
  });

  it('stop is a safe no-op when nothing is running', () => {
    const service = setup();
    let completed = false;
    service.stop().subscribe(() => (completed = true));

    expect(completed).toBe(true);
    expect(logTimeCalls.length).toBe(0);
  });

  it('resumes an in-progress timer from localStorage on construction', () => {
    vi.useFakeTimers();
    const startedAt = new Date('2026-06-30T10:00:00Z');
    vi.setSystemTime(new Date('2026-06-30T10:02:00Z'));

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ taskId: 'task-a', taskName: 'Reading', startedAt: startedAt.toISOString() }),
    );

    const service = setup();

    expect(service.activeTimer()?.taskId).toBe('task-a');
    expect(service.elapsedSeconds()).toBe(120);
  });
});
