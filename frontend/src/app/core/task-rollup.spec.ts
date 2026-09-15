import { entryDisplayName, orderedBreakdown, rollupTaskColor, rollupTaskId, rollupTaskName, taskDisplayName } from './task-rollup';
import { DayEntry } from './models';
import { TaskColor } from './task-colors';

function entry(overrides: Partial<DayEntry>): DayEntry {
  return {
    id: 'e1',
    date: '2026-06-19',
    taskId: 'child',
    taskName: 'Chapter 1',
    minutes: 20,
    taskColor: TaskColor.Violet,
    parent: { id: 'parent', name: 'Reading', color: TaskColor.Green },
    ...overrides,
  };
}

describe('task-rollup', () => {
  it('rollups a subtask entry to its parent', () => {
    const child = entry({});
    expect(rollupTaskId(child)).toBe('parent');
    expect(rollupTaskName(child)).toBe('Reading');
    expect(rollupTaskColor(child)).toBe(TaskColor.Green);
  });

  it('rollups a root entry to itself', () => {
    const root = entry({
      taskId: 'parent',
      taskName: 'Reading',
      taskColor: TaskColor.Green,
      parent: null,
    });
    expect(rollupTaskId(root)).toBe('parent');
    expect(rollupTaskName(root)).toBe('Reading');
    expect(rollupTaskColor(root)).toBe(TaskColor.Green);
  });

  it('builds a breadcrumb for nested names', () => {
    expect(taskDisplayName('Chapter 1', 'Reading')).toBe('Reading › Chapter 1');
    expect(taskDisplayName('Reading', null)).toBe('Reading');
    expect(entryDisplayName(entry({}))).toBe('Reading › Chapter 1');
  });

  it('orders breakdown with parent own minutes first', () => {
    const lines = new Map([
      ['child', { taskId: 'child', name: 'Chapter 1', color: TaskColor.Violet, minutes: 20 }],
      ['parent', { taskId: 'parent', name: 'Reading', color: TaskColor.Green, minutes: 10 }],
    ]);
    expect(orderedBreakdown(lines, 'parent').map((line) => line.taskId)).toEqual(['parent', 'child']);
  });
});
