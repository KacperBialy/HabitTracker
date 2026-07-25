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
    BarController: class {},
    BarElement: class {},
    CategoryScale: class {},
    LinearScale: class {},
    Tooltip: class {},
  };
});

import { TimePerTaskChartComponent } from './time-per-task-chart.component';
import { buildStackedChartData } from './time-per-task-chart-data';
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

describe('buildStackedChartData', () => {
  const today = localDateString();

  it('produces one label per day of the window, ending today', () => {
    const data = buildStackedChartData([], 7);
    expect(data.labels.length).toBe(7);
    expect(data.datasets).toEqual([]);
  });

  it('zero-fills days without entries and sums multiple entries per task per day', () => {
    const data = buildStackedChartData(
      [
        entry({ minutes: 20 }),
        entry({ minutes: 25 }),
        entry({ date: addDaysLocal(today, -2), minutes: 15 }),
      ],
      7,
    );
    expect(data.datasets.length).toBe(1);
    expect(data.datasets[0].data).toEqual([0, 0, 0, 0, 15, 0, 45]);
  });

  it('creates one dataset per task, sorted by task name', () => {
    const data = buildStackedChartData(
      [
        entry({ taskId: 'task-z', taskName: 'zebra care' }),
        entry({ taskId: 'task-a', taskName: 'Algebra' }),
      ],
      7,
    );
    expect(data.datasets.map((dataset) => dataset.label)).toEqual(['Algebra', 'zebra care']);
  });

  it('keeps tasks with identical names apart by taskId', () => {
    const data = buildStackedChartData(
      [
        entry({ taskId: 'task-b', taskName: 'Reading', minutes: 10 }),
        entry({ taskId: 'task-a', taskName: 'Reading', minutes: 20 }),
      ],
      7,
    );
    expect(data.datasets.length).toBe(2);
    expect(data.datasets[0].data[6]).toBe(20); // task-a first (id tiebreak)
    expect(data.datasets[1].data[6]).toBe(10);
  });

  it('colors each dataset from the task color map', () => {
    const data = buildStackedChartData([entry({ taskColor: TaskColor.Violet })], 7);
    expect(data.datasets[0].backgroundColor).toBe(TASK_COLOR_HEX[TaskColor.Violet]);
  });

  it('ignores entries outside the window', () => {
    const data = buildStackedChartData(
      [entry({ date: addDaysLocal(today, -7) }), entry({ date: addDaysLocal(today, 1) })],
      7,
    );
    expect(data.datasets).toEqual([]);
  });
});

describe('TimePerTaskChartComponent', () => {
  beforeEach(() => {
    chartMock.instances.length = 0;
  });

  function build(entries: DayEntry[]) {
    const fixture = TestBed.createComponent(TimePerTaskChartComponent);
    fixture.componentRef.setInput('entries', entries);
    fixture.detectChanges();
    return fixture;
  }

  function chartDataOf(fixture: ReturnType<typeof build>): { labels: string[]; datasets: unknown[] } {
    const component = fixture.componentInstance as unknown as {
      chartData: () => { labels: string[]; datasets: unknown[] };
    };
    return component.chartData();
  }

  it('defaults to a 30-day range with 7/30/90 pills', () => {
    const fixture = build([entry({})]);
    const pills = [...(fixture.nativeElement as HTMLElement).querySelectorAll('.pill')];
    expect(pills.map((pill) => pill.textContent?.trim())).toEqual(['7d', '30d', '90d']);
    expect(pills.filter((pill) => pill.classList.contains('active')).map((pill) => pill.textContent?.trim())).toEqual([
      '30d',
    ]);
    expect(chartDataOf(fixture).labels.length).toBe(30);
  });

  it('switches the window when a range pill is clicked', () => {
    const fixture = build([entry({})]);
    const sevenDayPill = [...(fixture.nativeElement as HTMLElement).querySelectorAll('.pill')].find(
      (pill) => pill.textContent?.trim() === '7d',
    ) as HTMLElement;
    sevenDayPill.click();
    fixture.detectChanges();
    expect(sevenDayPill.classList.contains('active')).toBe(true);
    expect(chartDataOf(fixture).labels.length).toBe(7);
  });

  it('renders one legend item per task and no empty-state note when there is data', () => {
    const fixture = build([
      entry({ taskId: 'task-1', taskName: 'Reading' }),
      entry({ taskId: 'task-2', taskName: 'Guitar', taskColor: TaskColor.Blue }),
    ]);
    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Reading');
    expect(host.textContent).toContain('Guitar');
    expect(host.textContent).not.toContain('No time logged');
  });

  it('shows the empty-state note when nothing is logged in the window', () => {
    const fixture = build([]);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No time logged in this period.');
  });

  it('creates the chart once and updates it in place on range change', async () => {
    const fixture = build([entry({})]);
    await fixture.whenStable();
    expect(chartMock.instances.length).toBe(1);

    const sevenDayPill = [...(fixture.nativeElement as HTMLElement).querySelectorAll('.pill')].find(
      (pill) => pill.textContent?.trim() === '7d',
    ) as HTMLElement;
    sevenDayPill.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(chartMock.instances.length).toBe(1);
    expect(chartMock.instances[0].update).toHaveBeenCalled();
    expect((chartMock.instances[0].data as { labels: string[] }).labels.length).toBe(7);
  });
});
