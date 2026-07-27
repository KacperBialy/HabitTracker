import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';

// jsdom has no canvas 2D context, so a real `new Chart(...)` would throw inside afterRenderEffect.
const chartMock = vi.hoisted(() => {
  const instances: { data: unknown; update: () => void; destroy: () => void }[] = [];
  return { instances };
});

vi.mock('chart.js', () => {
  class MockChart {
    static register = vi.fn();
    data: unknown;
    options: unknown;
    update = vi.fn();
    destroy = vi.fn();
    constructor(
      public canvas: unknown,
      config: { data: unknown; options: unknown },
    ) {
      this.data = config.data;
      this.options = config.options;
      chartMock.instances.push(this);
    }
  }
  return {
    Chart: MockChart,
    DoughnutController: class {},
    ArcElement: class {},
    Tooltip: class {},
  };
});

import { TaskShareChartComponent } from './task-share-chart.component';
import { buildDonutChartData } from './task-share-chart-data';
import { DayEntry } from '../../core/models';
import { localDateString } from '../../core/date-utils';
import { TASK_COLOR_HEX, TaskColor } from '../../core/task-colors';

function addDaysLocal(value: string, delta: number): string {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + delta);
  return localDateString(date);
}

function entry(overrides: Partial<DayEntry>): DayEntry {
  return {
    date: localDateString(),
    taskId: 'task-1',
    taskName: 'Reading',
    minutes: 30,
    taskColor: TaskColor.Green,
    ...overrides,
  };
}

describe('buildDonutChartData', () => {
  const today = localDateString();

  it('returns no slices and a zero total when there is nothing logged', () => {
    const data = buildDonutChartData([], 7);
    expect(data.labels).toEqual([]);
    expect(data.datasets[0].data).toEqual([]);
    expect(data.totalMinutes).toBe(0);
  });

  it('sums minutes per task across the window and totals them', () => {
    const data = buildDonutChartData(
      [
        entry({ minutes: 20 }),
        entry({ date: addDaysLocal(today, -3), minutes: 25 }),
        entry({ taskId: 'task-2', taskName: 'Guitar', minutes: 10 }),
      ],
      7,
    );
    expect(data.labels).toEqual(['Reading', 'Guitar']);
    expect(data.datasets[0].data).toEqual([45, 10]);
    expect(data.totalMinutes).toBe(55);
  });

  it('orders slices by minutes descending, tiebreaking on taskId', () => {
    const data = buildDonutChartData(
      [
        entry({ taskId: 'task-b', taskName: 'Beta', minutes: 10 }),
        entry({ taskId: 'task-a', taskName: 'Alpha', minutes: 10 }),
        entry({ taskId: 'task-c', taskName: 'Gamma', minutes: 60 }),
      ],
      7,
    );
    expect(data.labels).toEqual(['Gamma', 'Alpha', 'Beta']);
  });

  it('colors each slice from the task color map', () => {
    const data = buildDonutChartData([entry({ taskColor: TaskColor.Violet })], 7);
    expect(data.datasets[0].backgroundColor).toEqual([TASK_COLOR_HEX[TaskColor.Violet]]);
  });

  it('ignores entries outside the window', () => {
    const data = buildDonutChartData(
      [entry({ date: addDaysLocal(today, -7) }), entry({ date: addDaysLocal(today, 1) })],
      7,
    );
    expect(data.labels).toEqual([]);
    expect(data.totalMinutes).toBe(0);
  });

  it('includes days the week window excludes when the range is a month', () => {
    const entries = [entry({ date: addDaysLocal(today, -20), minutes: 15 })];
    expect(buildDonutChartData(entries, 7).totalMinutes).toBe(0);
    expect(buildDonutChartData(entries, 30).totalMinutes).toBe(15);
  });
});

describe('TaskShareChartComponent', () => {
  beforeEach(() => {
    chartMock.instances.length = 0;
  });

  function build(entries: DayEntry[]) {
    const fixture = TestBed.createComponent(TaskShareChartComponent);
    fixture.componentRef.setInput('entries', entries);
    fixture.detectChanges();
    return fixture;
  }

  it('defaults to the week range with week/month pills', () => {
    const fixture = build([entry({})]);
    const pills = [...(fixture.nativeElement as HTMLElement).querySelectorAll('.pill')];
    expect(pills.map((pill) => pill.textContent?.trim())).toEqual(['week', 'month']);
    expect(pills.filter((pill) => pill.classList.contains('active')).map((pill) => pill.textContent?.trim())).toEqual([
      'week',
    ]);
  });

  it('switches the window when a range pill is clicked', async () => {
    const fixture = build([entry({ date: addDaysLocal(localDateString(), -20), minutes: 15 })]);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No time logged in this period.');

    const monthPill = [...(fixture.nativeElement as HTMLElement).querySelectorAll('.pill')].find(
      (pill) => pill.textContent?.trim() === 'month',
    ) as HTMLElement;
    monthPill.click();
    fixture.detectChanges();

    expect(monthPill.classList.contains('active')).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('15m');
  });

  it('renders a breakdown row per task with duration and share', () => {
    const fixture = build([
      entry({ taskId: 'task-1', taskName: 'Reading', minutes: 90 }),
      entry({ taskId: 'task-2', taskName: 'Guitar', minutes: 30, taskColor: TaskColor.Blue }),
    ]);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Reading');
    expect(text).toContain('1h 30m');
    expect(text).toContain('75%');
    expect(text).toContain('Guitar');
    expect(text).toContain('25%');
    expect(text).toContain('2h'); // total in the donut hole
  });

  it('shows the empty state when nothing is logged in the window', () => {
    const fixture = build([]);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No time logged in this period.');
  });

  it('creates the chart once and updates it in place on range change', async () => {
    const fixture = build([entry({})]);
    await fixture.whenStable();
    expect(chartMock.instances.length).toBe(1);

    const monthPill = [...(fixture.nativeElement as HTMLElement).querySelectorAll('.pill')].find(
      (pill) => pill.textContent?.trim() === 'month',
    ) as HTMLElement;
    monthPill.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(chartMock.instances.length).toBe(1);
    expect(chartMock.instances[0].update).toHaveBeenCalled();
  });
});
