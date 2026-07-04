import { TestBed } from '@angular/core/testing';

import { ContributionsHeatmapComponent, HeatmapCell } from './contributions-heatmap.component';
import { localDateString } from '../../core/date-utils';

/** Reach into the protected `weeks()` computed for assertions. */
function weeksOf(component: ContributionsHeatmapComponent): (HeatmapCell | null)[][] {
  return (component as unknown as { weeks: () => (HeatmapCell | null)[][] }).weeks();
}

function realCells(component: ContributionsHeatmapComponent): HeatmapCell[] {
  return weeksOf(component)
    .flat()
    .filter((cell): cell is HeatmapCell => cell !== null);
}

function build(days: { date: string; totalMinutes: number; entryCount: number }[]): ContributionsHeatmapComponent {
  const fixture = TestBed.createComponent(ContributionsHeatmapComponent);
  fixture.componentRef.setInput('days', days);
  fixture.detectChanges();
  return fixture.componentInstance;
}

function addDaysLocal(value: string, delta: number): string {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + delta);
  return localDateString(date);
}

describe('ContributionsHeatmapComponent grid', () => {
  const today = localDateString();

  it('covers exactly 365 real days ending today', () => {
    const cells = realCells(build([]));
    expect(cells.length).toBe(365);
    expect(cells[0].date).toBe(addDaysLocal(today, -364));
    expect(cells[cells.length - 1].date).toBe(today);
  });

  it('makes every week column 7 rows tall', () => {
    for (const week of weeksOf(build([]))) {
      expect(week.length).toBe(7);
    }
  });

  it('starts the first column on a Sunday (leading days are padding)', () => {
    const firstWeek = weeksOf(build([]))[0];
    // The first *real* cell in column 0 lands on the window start's weekday;
    // everything before it in that column is null padding back to Sunday.
    const firstReal = firstWeek.find((cell): cell is HeatmapCell => cell !== null)!;
    const [year, month, day] = firstReal.date.split('-').map(Number);
    const weekday = new Date(year, month - 1, day).getDay();
    // All rows above the first real cell are padding.
    for (let row = 0; row < weekday; row++) expect(firstWeek[row]).toBeNull();
    expect(firstWeek[weekday]).toBe(firstReal);
  });

  it('leaves days with no data at level 0 with zero minutes', () => {
    const cell = realCells(build([])).find((candidate) => candidate.date === today)!;
    expect(cell.minutes).toBe(0);
    expect(cell.level).toBe(0);
  });

  it('buckets minutes into the five intensity levels', () => {
    const cases: [number, HeatmapCell['level']][] = [
      [0, 0],
      [1, 1],
      [29, 1],
      [30, 2],
      [59, 2],
      [60, 3],
      [119, 3],
      [120, 4],
      [500, 4],
    ];
    for (const [minutes, expectedLevel] of cases) {
      const component = build([{ date: today, totalMinutes: minutes, entryCount: 1 }]);
      const cell = realCells(component).find((candidate) => candidate.date === today)!;
      expect(cell.level).toBe(expectedLevel);
    }
  });

  it('reads totals and entry counts from matching aggregates', () => {
    const component = build([{ date: today, totalMinutes: 95, entryCount: 3 }]);
    const cell = realCells(component).find((candidate) => candidate.date === today)!;
    expect(cell.minutes).toBe(95);
    expect(cell.entryCount).toBe(3);
    expect(cell.level).toBe(3);
  });

  it('ignores aggregates outside the 365-day window', () => {
    const beforeWindow = addDaysLocal(today, -400);
    const component = build([{ date: beforeWindow, totalMinutes: 300, entryCount: 5 }]);
    const cells = realCells(component);
    expect(cells.some((cell) => cell.minutes > 0)).toBe(false);
  });
});
