import { buildTrendComparison, trendDeltaLabel } from './trend-comparison-data';
import { DayEntry } from '../../core/models';
import { localDateString } from '../../core/date-utils';
import { TASK_COLOR_HEX, TaskColor } from '../../core/task-colors';

function addDaysLocal(value: string, delta: number): string {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + delta);
  return localDateString(date);
}

function entry(
  date: string,
  minutes: number,
  taskId = 'task-1',
  taskName = 'Reading',
  taskColor = TaskColor.Slate,
): DayEntry {
  return { id: crypto.randomUUID(), date, taskId, taskName, minutes, taskColor, parent: null };
}

const today = localDateString();

describe('trendDeltaLabel', () => {
  it('labels a missing baseline as new, not 0%', () => {
    expect(trendDeltaLabel(null, 'flat')).toEqual({ text: 'new', kind: 'new' });
  });

  it('labels an unchanged window as 0%', () => {
    expect(trendDeltaLabel(0, 'flat')).toEqual({ text: '0%', kind: 'flat' });
  });

  it('prefixes an increase with an up arrow', () => {
    expect(trendDeltaLabel(43, 'up')).toEqual({ text: '↑ 43%', kind: 'up' });
  });

  it('prefixes a decline with a down arrow', () => {
    expect(trendDeltaLabel(-11, 'down')).toEqual({ text: '↓ 11%', kind: 'down' });
  });
});

describe('buildTrendComparison', () => {
  it('splits entries into the current and previous window', () => {
    const result = buildTrendComparison(
      [
        entry(today, 30),
        entry(addDaysLocal(today, -6), 10), // last day inside the current week
        entry(addDaysLocal(today, -7), 20), // first day of the previous week
        entry(addDaysLocal(today, -13), 5), // last day of the previous week
      ],
      7,
    );

    expect(result.currentMinutes).toBe(40);
    expect(result.previousMinutes).toBe(25);
    expect(result.percentChange).toBe(60);
    expect(result.direction).toBe('up');
  });

  it('ignores entries older than both windows', () => {
    const result = buildTrendComparison([entry(addDaysLocal(today, -14), 90), entry(today, 10)], 7);

    expect(result.currentMinutes).toBe(10);
    expect(result.previousMinutes).toBe(0);
  });

  it('reports a null change and flat direction when the previous window is empty', () => {
    const result = buildTrendComparison([entry(today, 60)], 7);

    expect(result.percentChange).toBeNull();
    expect(result.direction).toBe('flat');
  });

  it('reports a decline when time logged drops', () => {
    const result = buildTrendComparison([entry(today, 25), entry(addDaysLocal(today, -7), 100)], 7);

    expect(result.percentChange).toBe(-75);
    expect(result.direction).toBe('down');
  });

  it('reports flat when both windows match', () => {
    const result = buildTrendComparison([entry(today, 50), entry(addDaysLocal(today, -7), 50)], 7);

    expect(result.percentChange).toBe(0);
    expect(result.direction).toBe('flat');
  });

  it('uses a 30-day window for the month range', () => {
    const result = buildTrendComparison(
      [entry(addDaysLocal(today, -29), 10), entry(addDaysLocal(today, -30), 40)],
      30,
    );

    expect(result.currentMinutes).toBe(10);
    expect(result.previousMinutes).toBe(40);
  });

  it('breaks the comparison down per task, biggest current total first', () => {
    const result = buildTrendComparison(
      [
        entry(today, 30, 'task-1', 'Reading'),
        entry(addDaysLocal(today, -7), 10, 'task-1', 'Reading'),
        entry(today, 90, 'task-2', 'Guitar', TaskColor.Green),
        entry(addDaysLocal(today, -7), 180, 'task-2', 'Guitar', TaskColor.Green),
      ],
      7,
    );

    expect(result.tasks.map((task) => task.taskName)).toEqual(['Guitar', 'Reading']);

    const [guitar, reading] = result.tasks;
    expect(guitar.currentMinutes).toBe(90);
    expect(guitar.previousMinutes).toBe(180);
    expect(guitar.percentChange).toBe(-50);
    expect(guitar.direction).toBe('down');
    expect(guitar.color).toBe(TASK_COLOR_HEX[TaskColor.Green]);

    expect(reading.percentChange).toBe(200);
    expect(reading.direction).toBe('up');
  });

  it('keeps a task that stopped entirely, as a -100% row', () => {
    const result = buildTrendComparison([entry(addDaysLocal(today, -7), 60, 'task-9', 'Running')], 7);

    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].currentMinutes).toBe(0);
    expect(result.tasks[0].percentChange).toBe(-100);
    expect(result.tasks[0].direction).toBe('down');
  });

  it('reports a null per-task change for a task with no previous activity', () => {
    const result = buildTrendComparison([entry(today, 45, 'task-3', 'Cooking')], 7);

    expect(result.tasks[0].percentChange).toBeNull();
    expect(result.tasks[0].direction).toBe('flat');
  });

  it('computes each task share of the current window', () => {
    const result = buildTrendComparison(
      [entry(today, 90, 'task-1', 'Guitar'), entry(today, 30, 'task-2', 'Reading')],
      7,
    );

    expect(result.tasks.map((task) => task.sharePercent)).toEqual([75, 25]);
  });

  it('reports the absolute minute delta and the busiest weekday', () => {
    const result = buildTrendComparison([entry(today, 30), entry(addDaysLocal(today, -7), 90)], 7);

    expect(result.deltaMinutes).toBe(60);
    expect(result.mostActiveWeekday).toBeTruthy();
  });

  it('has no busiest weekday when nothing is logged in the window', () => {
    const result = buildTrendComparison([], 7);

    expect(result.mostActiveWeekday).toBeNull();
  });
});
