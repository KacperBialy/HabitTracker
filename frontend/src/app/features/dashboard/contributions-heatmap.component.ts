import { Component, computed, input, output } from '@angular/core';

import { DailyAggregate } from '../../core/models';
import { localDateString } from '../../core/date-utils';

export interface HeatmapCell {
  date: string;
  minutes: number;
  entryCount: number;
  level: 0 | 1 | 2 | 3 | 4;
}

type HeatmapWeek = (HeatmapCell | null)[];

const WINDOW_DAYS = 365;

const CELL_CLASS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'bg-[#ebedf0] border border-rule/15', // faint empty cell, still reads as a grid
  1: 'bg-[#9be9a8]', // lightest green
  2: 'bg-[#40c463]',
  3: 'bg-[#30a14e]',
  4: 'bg-[#216e39]', // darkest green
};

const LEGEND_LEVELS: (0 | 1 | 2 | 3 | 4)[] = [0, 1, 2, 3, 4];

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function bucket(minutes: number): 0 | 1 | 2 | 3 | 4 {
  if (minutes <= 0) return 0;
  if (minutes < 30) return 1;
  if (minutes < 60) return 2;
  if (minutes < 120) return 3;
  return 4;
}

function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day); // Date's month arg is 0-indexed (0 = Jan)
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function humanDate(value: string): string {
  return parseLocalDate(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

@Component({
  selector: 'app-contributions-heatmap',
  template: `
    <section>
      <div class="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span class="display text-[1.75rem]">Activity</span>
        <span class="text-muted text-[0.875rem]">last 365 days</span>
      </div>

      <div class="overflow-x-auto pb-2">
        <div class="flex min-w-[42rem] flex-col gap-2">
          <div class="flex gap-0.75 pl-7.5">
            @for (label of monthLabels(); track $index) {
              <div class="text-muted min-w-0 flex-1 text-[11px] leading-none">{{ label }}</div>
            }
          </div>

          <div class="flex gap-1.5">
            <div class="text-muted grid w-6.5 shrink-0 grid-rows-7 gap-0.75 text-[11px] leading-none">
              <span></span>
              <span>Mon</span>
              <span></span>
              <span>Wed</span>
              <span></span>
              <span>Fri</span>
              <span></span>
            </div>

            <div class="flex flex-1 gap-0.75">
              @for (week of weeks(); track $index) {
                <div class="grid min-w-0 flex-1 grid-rows-7 gap-0.75">
                  @for (cell of week; track $index) {
                    @if (cell) {
                      <button type="button"
                              class="aspect-square w-full rounded-xs {{ cellClass(cell.level) }}"
                              [title]="tooltip(cell)"
                              [attr.aria-label]="tooltip(cell)"
                              (click)="selectDay.emit(cell)"></button>
                    } @else {
                      <span class="aspect-square w-full"></span>
                    }
                  }
                </div>
              }
            </div>
          </div>
        </div>
      </div>

      <!-- Legend -->
      <div class="text-muted mt-3 flex flex-wrap items-center gap-1.5 text-[12px]">
        <span>Less</span>
        @for (level of legendLevels; track level) {
          <span class="h-3 w-3 rounded-xs {{ cellClass(level) }}"></span>
        }
        <span>More</span>
      </div>
    </section>
  `,
})
export class ContributionsHeatmapComponent {
  readonly days = input.required<DailyAggregate[], DailyAggregate[] | null | undefined>({
    transform: (value) => value ?? [],
  });

  readonly selectDay = output<HeatmapCell>();

  protected readonly legendLevels = LEGEND_LEVELS;

  /** All cells for the rolling window, split into week columns. */
  protected readonly weeks = computed<HeatmapWeek[]>(() => {
    const byDate = new Map<string, DailyAggregate>();
    for (const day of this.days())
      byDate.set(day.date, day);

    const end = parseLocalDate(localDateString());
    const start = addDays(end, -(WINDOW_DAYS - 1));

    const gridStart = addDays(start, -start.getDay());

    const weeks: HeatmapWeek[] = [];
    let current: HeatmapWeek = [];
    for (let cursor = gridStart; cursor <= end; cursor = addDays(cursor, 1)) {
      if (cursor < start) {
        current.push(null);
      } else {
        const date = localDateString(cursor);
        const aggregate = byDate.get(date);
        const minutes = aggregate?.totalMinutes ?? 0;
        current.push({
          date,
          minutes,
          entryCount: aggregate?.entryCount ?? 0,
          level: bucket(minutes),
        });
      }
      if (current.length === 7) {
        weeks.push(current);
        current = [];
      }
    }
    if (current.length > 0) {
      while (current.length < 7) current.push(null);
      weeks.push(current);
    }
    return weeks;
  });

  protected readonly monthLabels = computed<string[]>(() => {
    const weeks = this.weeks();
    let lastMonth = -1;
    return weeks.map((week) => {
      const firstReal = week.find((cell): cell is HeatmapCell => cell !== null);
      if (!firstReal) return '';
      const month = parseLocalDate(firstReal.date).getMonth();
      if (month === lastMonth) return '';
      lastMonth = month;
      return MONTH_NAMES[month];
    });
  });

  protected cellClass(level: 0 | 1 | 2 | 3 | 4): string {
    return CELL_CLASS[level];
  }

  protected tooltip(cell: HeatmapCell): string {
    const when = humanDate(cell.date);
    if (cell.minutes <= 0) return `No activity  ${when}`;
    return `${cell.minutes} min (${cell.entryCount} ${cell.entryCount === 1 ? 'entry' : 'entries'}) — ${when}`;
  }
}
