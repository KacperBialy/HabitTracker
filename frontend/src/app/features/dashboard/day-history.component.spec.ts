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
  function buildFixture(entries: DayEntry[]) {
    TestBed.configureTestingModule({});
    const fixture = TestBed.createComponent(DayHistoryComponent);
    fixture.componentRef.setInput('entries', entries);
    fixture.detectChanges();
    return { fixture, cmp: fixture.componentInstance };
  }

  function build(entries: DayEntry[]): DayHistoryComponent {
    return buildFixture(entries).cmp;
  }

  const entry = (date: string, taskId: string, taskName: string, minutes: number, taskColor = TaskColor.Green): DayEntry => ({
    id: crypto.randomUUID(),
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

  it('keeps every log as its own row within a day, longest first', () => {
    const shortReading = entry('2026-07-14', 'a', 'Reading', 30);
    const workout = entry('2026-07-14', 'b', 'Workout', 45, TaskColor.Red);
    const longReading = entry('2026-07-14', 'a', 'Reading', 60);
    const cmp = build([shortReading, workout, longReading]);

    // Same-task logs are not merged: each one must stay deletable on its own.
    expect(rowsOf(cmp)[0].entries).toEqual([longReading, workout, shortReading]);
  });

  it('emits the clicked log when its delete button is pressed', () => {
    const toDelete = entry('2026-07-14', 'a', 'Reading', 45);
    const other = entry('2026-07-14', 'b', 'Workout', 30);
    const { fixture, cmp } = buildFixture([toDelete, other]);
    const emitted: DayEntry[] = [];
    cmp.deleteEntry.subscribe((deleted) => emitted.push(deleted));

    const button = fixture.nativeElement.querySelector('button[aria-label="Delete 45m on Reading"]') as HTMLButtonElement;
    expect(button).not.toBeNull();
    button.click();

    expect(emitted).toEqual([toDelete]);
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
