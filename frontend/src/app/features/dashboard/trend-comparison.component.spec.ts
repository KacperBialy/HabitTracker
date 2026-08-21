import { TestBed } from '@angular/core/testing';

import { TrendComparisonComponent } from './trend-comparison.component';
import { buildTrendComparison } from './trend-comparison-data';
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
  return { date, taskId, taskName, minutes, taskColor };
}

const today = localDateString();

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

  it('emits one day per range day, including zero days, oldest first', () => {
    const result = buildTrendComparison([entry(today, 20)], 7);

    expect(result.days).toHaveLength(7);
    expect(result.days[0].date).toBe(addDaysLocal(today, -6));
    expect(result.days[6].date).toBe(today);
    expect(result.days[6].minutes).toBe(20);
    expect(result.days.filter((day) => day.minutes === 0)).toHaveLength(6);
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
    expect(result.days).toHaveLength(7);
  });
});

describe('TrendComparisonComponent', () => {
  function createComponent(entries: DayEntry[]) {
    const fixture = TestBed.createComponent(TrendComparisonComponent);
    fixture.componentRef.setInput('entries', entries);
    fixture.detectChanges();
    return fixture;
  }

  it('renders the total and an up chip with the delta magnitude', () => {
    const fixture = createComponent([entry(today, 120), entry(addDaysLocal(today, -7), 60)]);

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('2h');
    expect(text).toContain('↑ 100%');
    expect(fixture.nativeElement.querySelector('.trend-chip.up')).toBeTruthy();
  });

  it('renders a down chip and the absolute minute difference', () => {
    const fixture = createComponent([entry(today, 30), entry(addDaysLocal(today, -7), 90)]);

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('↓ 67%');
    expect(text).toContain('1h less than last week');
    expect(fixture.nativeElement.querySelector('.trend-chip.down')).toBeTruthy();
  });

  it('shows a neutral chip when there is no baseline', () => {
    const fixture = createComponent([entry(today, 45)]);

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('no comparison yet');
    expect(text).toContain('this is your baseline');
    expect(fixture.nativeElement.querySelector('.trend-chip.none')).toBeTruthy();
  });

  it('draws one bar per day of the window, flagging zero days', () => {
    const fixture = createComponent([entry(today, 60)]);

    const bars = fixture.nativeElement.querySelectorAll('.trend-bar');
    expect(bars).toHaveLength(7);
    expect(fixture.nativeElement.querySelectorAll('.trend-bar.zero')).toHaveLength(6);
  });

  it('lists one row per task with a share bar sized to its share', () => {
    const fixture = createComponent([
      entry(today, 90, 'task-1', 'Guitar', TaskColor.Green),
      entry(today, 30, 'task-2', 'Reading'),
      entry(addDaysLocal(today, -7), 60, 'task-1', 'Guitar', TaskColor.Green),
    ]);

    const rows = fixture.nativeElement.querySelectorAll('.trend-task');
    expect(rows).toHaveLength(2);

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Guitar');
    expect(text).toContain('Reading');
    expect(text).toContain('↑ 50%');

    const firstShare = rows[0].querySelector('.trend-share i') as HTMLElement;
    expect(firstShare.style.width).toBe('75%'); // 90 of 120 minutes
  });

  it('labels a task with no previous activity as new', () => {
    const fixture = createComponent([entry(today, 45, 'task-3', 'Cooking')]);

    expect(fixture.nativeElement.querySelector('.trend-task-delta.new')?.textContent?.trim()).toBe('new');
  });

  it('summarises task count and the most active weekday in the footer', () => {
    const fixture = createComponent([entry(today, 45), entry(today, 10, 'task-2', 'Reading')]);

    const foot = fixture.nativeElement.querySelector('.trend-foot')?.textContent as string;
    expect(foot).toContain('2 tasks tracked');
    expect(foot).toContain('most active day:');
  });

  it('recomputes when the range switches to month', () => {
    const fixture = createComponent([entry(addDaysLocal(today, -10), 60)]);
    const component = fixture.componentInstance as unknown as {
      rangeDays: { set: (value: 7 | 30) => void };
      comparison: () => { currentMinutes: number };
    };

    expect(component.comparison().currentMinutes).toBe(0);

    component.rangeDays.set(30);
    fixture.detectChanges();
    expect(component.comparison().currentMinutes).toBe(60);
    expect(fixture.nativeElement.querySelectorAll('.trend-bar')).toHaveLength(30);
  });

  it('shows an empty-state message when nothing is logged', () => {
    const fixture = createComponent([]);

    expect(fixture.nativeElement.textContent as string).toContain('No time logged in this period.');
  });
});
