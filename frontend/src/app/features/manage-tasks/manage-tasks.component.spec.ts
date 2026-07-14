import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';

import { ManageTasksComponent } from './manage-tasks.component';
import { TasksService } from '../../core/tasks.service';
import { ActiveTimerService, ActiveTimerSnapshot } from '../../core/active-timer.service';
import { Task } from '../../core/models';
import { TaskColor } from '../../core/task-colors';

describe('ManageTasksComponent', () => {
  let listCalls = 0;
  let updateCalls: { id: string; name: string; color: TaskColor }[] = [];
  let deletedIds: string[] = [];
  let discardCalls = 0;
  let activeTimer: ReturnType<typeof signal<ActiveTimerSnapshot | null>>;

  function setup(tasks: Task[]) {
    listCalls = 0;
    updateCalls = [];
    deletedIds = [];
    discardCalls = 0;
    activeTimer = signal<ActiveTimerSnapshot | null>(null);
    const tasksService: Partial<TasksService> = {
      list: () => {
        listCalls++;
        return of(tasks);
      },
      create: () => of(tasks[0]),
      update: (id: string, name: string, color: TaskColor) => {
        updateCalls.push({ id, name, color });
        return of(undefined);
      },
      delete: (taskId: string) => {
        deletedIds.push(taskId);
        return of(undefined);
      },
    };
    const activeTimerService: Partial<ActiveTimerService> = {
      activeTimer,
      discard: () => {
        discardCalls++;
      },
    };

    TestBed.configureTestingModule({
      imports: [ManageTasksComponent],
      providers: [
        provideRouter([]),
        { provide: TasksService, useValue: tasksService },
        { provide: ActiveTimerService, useValue: activeTimerService },
      ],
    });

    const fixture = TestBed.createComponent(ManageTasksComponent);
    fixture.detectChanges(); // triggers ngOnInit
    return fixture.componentInstance as any;
  }

  const task = (id: string, name: string, color = TaskColor.Slate): Task => ({
    id,
    name,
    createdAt: '2026-01-01T00:00:00Z',
    color,
  });

  it('loads tasks on init', () => {
    const cmp = setup([task('a', 'Reading')]);
    expect(cmp.taskList().length).toBe(1);
    expect(cmp.loading()).toBe(false);
  });

  it('updates the task, closes the modal, and reloads', () => {
    const cmp = setup([task('a', 'Reading', TaskColor.Slate)]);
    cmp.editingTask.set(cmp.taskList()[0]);

    cmp.updateTask({ name: 'Deep reading', color: TaskColor.Blue });

    expect(updateCalls).toEqual([{ id: 'a', name: 'Deep reading', color: TaskColor.Blue }]);
    expect(cmp.editingTask()).toBeNull();
    expect(listCalls).toBe(2); // initial + reload
  });

  it('deletes the task, closes the modal, and reloads', () => {
    const cmp = setup([task('a', 'Reading')]);
    cmp.deletingTask.set(cmp.taskList()[0]);

    cmp.deleteTask();

    expect(deletedIds).toEqual(['a']);
    expect(cmp.deletingTask()).toBeNull();
    expect(listCalls).toBe(2);
    expect(discardCalls).toBe(0); // no active timer to drop
  });

  it('discards the running timer when deleting the tracked task', () => {
    const cmp = setup([task('a', 'Reading')]);
    activeTimer.set({ taskId: 'a', taskName: 'Reading', startedAt: new Date() });
    cmp.deletingTask.set(cmp.taskList()[0]);

    cmp.deleteTask();

    expect(discardCalls).toBe(1);
    expect(deletedIds).toEqual(['a']);
  });

  it('leaves a timer running for a different task on delete', () => {
    const cmp = setup([task('a', 'Reading'), task('b', 'Workout')]);
    activeTimer.set({ taskId: 'b', taskName: 'Workout', startedAt: new Date() });
    cmp.deletingTask.set(cmp.taskList()[0]); // deleting 'a'

    cmp.deleteTask();

    expect(discardCalls).toBe(0);
    expect(deletedIds).toEqual(['a']);
  });
});
