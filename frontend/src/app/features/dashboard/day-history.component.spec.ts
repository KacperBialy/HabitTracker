import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { DayHistoryComponent } from './day-history.component';
import { DayEntry } from '../../core/models';
import { TaskColor } from '../../core/task-colors';

interface HistoryRow {
  date: string;
  label: string;
  total: string;
  entries: DayEntry[];
}

/** Reach into the protected `rows()` computed for assertions. */
function rowsOf(component: DayHistoryComponent): HistoryRow[] {
  return (component as unknown as { rows: () => HistoryRow[] }).rows();
}

describe('DayHistoryComponent', () => {
  function build(entries: DayEntry[]): DayHistoryComponent {
    TestBed.configureTestingModule({});
    const fixture = TestBed.createComponent(DayHistoryComponent);
    fixture.componentRef.setInput('entries', entries);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  const entry = (date: string, taskId: string, taskName: string, minutes: number, taskColor = TaskColor.Green): DayEntry => ({
    date,
    taskId,
    taskName,
    minutes,
    taskColor,
  });

  it('groups entries per day, newest day first', () => {
    const cmp = build([
      entry('2026-07-10', 'a', 'Reading', 30),
      entry('2026-07-14', 'a', 'Reading', 45),
      entry('2026-07-14', 'b', 'Workout', 20),
    ]);
    expect(rowsOf(cmp).map((row) => row.date)).toEqual(['2026-07-14', '2026-07-10']);
    expect(rowsOf(cmp)[0].entries.length).toBe(2);
  });

  it('formats each day total as a compact duration', () => {
    const cmp = build([
      entry('2026-07-14', 'a', 'Reading', 90),
      entry('2026-07-14', 'b', 'Workout', 45),
    ]);
    expect(rowsOf(cmp)[0].total).toBe('2h 15m');
  });

  it('renders an empty list when nothing was logged', () => {
    const cmp = build([]);
    expect(rowsOf(cmp).length).toBe(0);
  });

  it('groups multiple entries for the same task within a day, summing minutes, biggest first', () => {
    const cmp = build([
      entry('2026-07-14', 'a', 'Reading', 30),
      entry('2026-07-14', 'b', 'Workout', 45, TaskColor.Red),
      entry('2026-07-14', 'a', 'Reading', 30),
    ]);

    expect(rowsOf(cmp)[0].entries).toEqual([
      entry('2026-07-14', 'a', 'Reading', 60),
      entry('2026-07-14', 'b', 'Workout', 45, TaskColor.Red),
    ]);
  });

  it('labels today, yesterday, same-year and prior-year days', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 17)); // local Jul 17, 2026
    try {
      const cmp = build([
        entry('2026-07-17', 'a', 'Reading', 30),
        entry('2026-07-16', 'a', 'Reading', 30),
        entry('2026-07-10', 'a', 'Reading', 30),
        entry('2025-12-31', 'a', 'Reading', 30),
      ]);
      expect(rowsOf(cmp).map((row) => row.label)).toEqual([
        'Today · Fri, Jul 17',
        'Yesterday · Thu, Jul 16',
        'Fri, Jul 10',
        'Wed, Dec 31, 2025',
      ]);
    } finally {
      vi.useRealTimers();
    }
  });
});
