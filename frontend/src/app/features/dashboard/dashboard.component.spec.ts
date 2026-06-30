import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { signal } from '@angular/core';

import { DashboardComponent } from './dashboard.component';
import { TasksService } from '../../core/tasks.service';
import { ActiveTimerService } from '../../core/active-timer.service';
import { Task, DayEntry } from '../../core/models';

describe('DashboardComponent merge', () => {
  let listCalls = 0;

  function setup(tasks: Task[], entries: DayEntry[]) {
    listCalls = 0;
    const tasksService: Partial<TasksService> = {
      list: () => {
        listCalls++;
        return of(tasks);
      },
      dayEntries: () => of(entries),
      create: () => of(tasks[0]),
      logTime: () =>
        of({ id: 'log1', taskId: tasks[0].id, ownerId: 'o', minutes: 45, logDate: '2026-06-21' }),
    };
    const activeTimerService: Partial<ActiveTimerService> = {
      activeTimer: signal(null),
      elapsedSeconds: signal(0),
      start: () => of(undefined),
      stop: () => of(undefined),
    };

    TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: TasksService, useValue: tasksService },
        { provide: ActiveTimerService, useValue: activeTimerService },
      ],
    });

    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges(); // triggers ngOnInit
    return fixture.componentInstance;
  }

  const task = (id: string, name: string): Task => ({ id, name, createdAt: '2026-01-01T00:00:00Z' });
  const entry = (taskId: string, minutes: number): DayEntry => ({ taskId, taskName: '', minutes });

  it('maps tasks with no entries to zero minutes', () => {
    const cmp = setup([task('a', 'Reading')], []);
    expect((cmp as any).taskVms()).toEqual([{ id: 'a', name: 'Reading', todayMinutes: 0 }]);
  });

  it('attaches a single entry to its task', () => {
    const cmp = setup([task('a', 'Reading')], [entry('a', 24)]);
    expect((cmp as any).taskVms()[0].todayMinutes).toBe(24);
  });

  it('sums multiple entries for the same task', () => {
    const cmp = setup([task('a', 'Reading')], [entry('a', 24), entry('a', 18)]);
    expect((cmp as any).taskVms()[0].todayMinutes).toBe(42);
  });

  it('keeps minutes scoped to the right task', () => {
    const cmp = setup(
      [task('a', 'Reading'), task('b', 'Workout')],
      [entry('a', 10), entry('b', 45)],
    );
    const vms = (cmp as any).taskVms();
    expect(vms.find((vm: any) => vm.id === 'a').todayMinutes).toBe(10);
    expect(vms.find((vm: any) => vm.id === 'b').todayMinutes).toBe(45);
  });

  it('reloads and closes the modal after a successful log', () => {
    const cmp = setup([task('a', 'Reading')], []) as any;
    cmp.openLog(cmp.taskVms()[0]);
    expect(cmp.loggingTask()).not.toBeNull();
    expect(listCalls).toBe(1); // initial load

    cmp.logTime({ minutes: 45, logDate: '2026-06-21' });

    expect(cmp.loggingTask()).toBeNull(); // modal closed
    expect(listCalls).toBe(2); // reloaded
  });
});
