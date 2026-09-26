import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
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
  let reorderCalls: { parentTaskId: string | null; orderedTaskIds: string[] }[] = [];
  let reorderFails = false;
  let fixture: ComponentFixture<ManageTasksComponent>;
  let activeTimer: ReturnType<typeof signal<ActiveTimerSnapshot | null>>;

  function setup(tasks: Task[]) {
    listCalls = 0;
    updateCalls = [];
    deletedIds = [];
    discardCalls = 0;
    reorderCalls = [];
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
      reorder: (parentTaskId: string | null, orderedTaskIds: string[]) => {
        reorderCalls.push({ parentTaskId, orderedTaskIds });
        return reorderFails ? throwError(() => new Error('boom')) : of(undefined);
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

    fixture = TestBed.createComponent(ManageTasksComponent);
    fixture.detectChanges(); // triggers ngOnInit
    return fixture.componentInstance as any;
  }

  const task = (
    id: string,
    name: string,
    color = TaskColor.Slate,
    parentTaskId: string | null = null,
    position = 0,
  ): Task => ({
    id,
    name,
    createdAt: '2026-01-01T00:00:00Z',
    color,
    parentTaskId,
    position,
  });

  const dropEvent = (previousIndex: number, currentIndex: number) => ({ previousIndex, currentIndex });

  afterEach(() => {
    reorderFails = false;
  });

  it('loads tasks on init', () => {
    const cmp = setup([task('a', 'Reading')]);
    expect(cmp.taskList().length).toBe(1);
    expect(cmp.loading()).toBe(false);
  });

  it('toggles subtask visibility for a parent task', () => {
    const cmp = setup([
      task('parent', 'Workout'),
      task('child', 'Cycling', TaskColor.Slate, 'parent'),
    ]);

    expect(cmp.expandedTaskIds().has('parent')).toBe(false);
    cmp.toggleSubtasks('parent');
    expect(cmp.expandedTaskIds().has('parent')).toBe(true);
    cmp.toggleSubtasks('parent');
    expect(cmp.expandedTaskIds().has('parent')).toBe(false);
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

  it('drops a root in a new slot, sends the new root order, and re-sorts immediately', () => {
    const cmp = setup([
      task('a', 'Reading', TaskColor.Slate, null, 0),
      task('b', 'Workout', TaskColor.Slate, null, 1),
      task('c', 'Cooking', TaskColor.Slate, null, 2),
    ]);

    cmp.drop(null, cmp.rootTasks(), dropEvent(0, 2));

    expect(reorderCalls).toEqual([{ parentTaskId: null, orderedTaskIds: ['b', 'c', 'a'] }]);
    expect(cmp.taskGroups().map((group: { root: Task }) => group.root.id)).toEqual(['b', 'c', 'a']);
    expect(listCalls).toBe(1); // optimistic — no reload on success
  });

  it('drops a subtask within its parent and sends only its siblings', () => {
    const cmp = setup([
      task('p', 'Workout', TaskColor.Slate, null, 0),
      task('other', 'Reading', TaskColor.Slate, null, 1),
      task('c1', 'Cycling', TaskColor.Slate, 'p', 0),
      task('c2', 'Running', TaskColor.Slate, 'p', 1),
      task('x1', 'Novel', TaskColor.Slate, 'other', 0),
    ]);

    cmp.drop('p', cmp.taskGroups()[0].children, dropEvent(1, 0));

    expect(reorderCalls).toEqual([{ parentTaskId: 'p', orderedTaskIds: ['c2', 'c1'] }]);
    expect(cmp.taskGroups()[0].children.map((child: Task) => child.id)).toEqual(['c2', 'c1']);
  });

  it('ignores a drop back into the same slot', () => {
    const cmp = setup([task('a', 'Reading', TaskColor.Slate, null, 0), task('b', 'Workout', TaskColor.Slate, null, 1)]);

    cmp.drop(null, cmp.rootTasks(), dropEvent(1, 1));

    expect(reorderCalls).toEqual([]);
  });

  it('renders a drag handle on every root and expanded subtask row', () => {
    const cmp = setup([
      task('a', 'Reading', TaskColor.Slate, null, 0),
      task('b', 'Workout', TaskColor.Slate, null, 1),
      task('c1', 'Cycling', TaskColor.Slate, 'b', 0),
    ]);
    cmp.toggleSubtasks('b');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('[cdkDragHandle]').length).toBe(3);
  });

  it('reloads the list when reorder fails', () => {
    reorderFails = true;
    const cmp = setup([
      task('a', 'Reading', TaskColor.Slate, null, 0),
      task('b', 'Workout', TaskColor.Slate, null, 1),
    ]);

    cmp.drop(null, cmp.rootTasks(), dropEvent(0, 1));

    expect(listCalls).toBe(2);
    expect(cmp.taskGroups().map((group: { root: Task }) => group.root.id)).toEqual(['a', 'b']);
  });
});
