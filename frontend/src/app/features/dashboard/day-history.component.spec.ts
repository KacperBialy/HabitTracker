import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { DayHistoryComponent } from './day-history.component';
import { TasksService } from '../../core/tasks.service';
import { DailyAggregate, DayEntry } from '../../core/models';

interface HistoryRow {
  date: string;
  label: string;
  total: string;
  entryCount: number;
}

/** Reach into the protected `rows()` computed for assertions. */
function rowsOf(component: DayHistoryComponent): HistoryRow[] {
  return (component as unknown as { rows: () => HistoryRow[] }).rows();
}

describe('DayHistoryComponent', () => {
  let dayEntriesCalls: string[];
  let entriesByDate: Record<string, DayEntry[]>;

  type Instance = DayHistoryComponent & {
    toggle: (date: string) => void;
    expanded: () => ReadonlySet<string>;
    entriesFor: (date: string) => DayEntry[] | undefined;
  };

  function buildFixture(days: DailyAggregate[]) {
    dayEntriesCalls = [];
    entriesByDate = {};
    const tasksService: Partial<TasksService> = {
      dayEntries: (date: string) => {
        dayEntriesCalls.push(date);
        return of(entriesByDate[date] ?? []);
      },
    };

    TestBed.configureTestingModule({
      providers: [{ provide: TasksService, useValue: tasksService }],
    });

    const fixture = TestBed.createComponent(DayHistoryComponent);
    fixture.componentRef.setInput('days', days);
    fixture.detectChanges();
    return fixture;
  }

  function build(days: DailyAggregate[]): Instance {
    return buildFixture(days).componentInstance as Instance;
  }

  const day = (date: string, totalMinutes: number, entryCount: number): DailyAggregate => ({
    date,
    totalMinutes,
    entryCount,
  });

  it('lists only days with entries, newest first', () => {
    const cmp = build([
      day('2026-07-10', 30, 1),
      day('2026-07-14', 90, 2),
      day('2026-07-12', 0, 0), // no entries — excluded
    ]);
    expect(rowsOf(cmp).map((row) => row.date)).toEqual(['2026-07-14', '2026-07-10']);
  });

  it('formats the total as a compact duration', () => {
    const cmp = build([day('2026-07-14', 135, 2)]);
    expect(rowsOf(cmp)[0].total).toBe('2h 15m');
  });

  it('renders an empty list when nothing was logged', () => {
    const cmp = build([day('2026-07-12', 0, 0)]);
    expect(rowsOf(cmp).length).toBe(0);
  });

  it('lazily fetches a day breakdown on first expand and caches it', () => {
    const cmp = build([day('2026-07-14', 90, 1)]);
    entriesByDate['2026-07-14'] = [{ taskId: 'a', taskName: 'Reading', minutes: 90 }];

    expect(cmp.entriesFor('2026-07-14')).toBeUndefined();

    cmp.toggle('2026-07-14');
    expect(cmp.expanded().has('2026-07-14')).toBe(true);
    expect(cmp.entriesFor('2026-07-14')).toEqual([{ taskId: 'a', taskName: 'Reading', minutes: 90 }]);
    expect(dayEntriesCalls).toEqual(['2026-07-14']);

    // Collapse then re-expand — must not refetch.
    cmp.toggle('2026-07-14');
    cmp.toggle('2026-07-14');
    expect(dayEntriesCalls).toEqual(['2026-07-14']);
  });

  it('groups multiple entries for the same task, summing minutes, biggest first', () => {
    const cmp = build([day('2026-07-14', 105, 3)]);
    entriesByDate['2026-07-14'] = [
      { taskId: 'a', taskName: 'Reading', minutes: 30 },
      { taskId: 'b', taskName: 'Workout', minutes: 45 },
      { taskId: 'a', taskName: 'Reading', minutes: 30 },
    ];

    cmp.toggle('2026-07-14');

    expect(cmp.entriesFor('2026-07-14')).toEqual([
      { taskId: 'a', taskName: 'Reading', minutes: 60 },
      { taskId: 'b', taskName: 'Workout', minutes: 45 },
    ]);
  });

  it('auto-expands and fetches the day when selectedDate changes (heatmap click)', () => {
    const fixture = buildFixture([day('2026-07-14', 90, 1), day('2026-07-10', 30, 1)]);
    entriesByDate['2026-07-10'] = [{ taskId: 'a', taskName: 'Reading', minutes: 30 }];
    const cmp = fixture.componentInstance as Instance;

    expect(cmp.expanded().size).toBe(0);

    fixture.componentRef.setInput('selectedDate', '2026-07-10');
    fixture.detectChanges();

    expect(cmp.expanded().has('2026-07-10')).toBe(true);
    expect(dayEntriesCalls).toEqual(['2026-07-10']);
    expect(cmp.entriesFor('2026-07-10')).toEqual([{ taskId: 'a', taskName: 'Reading', minutes: 30 }]);
  });
});
