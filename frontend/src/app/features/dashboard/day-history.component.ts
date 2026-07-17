import { ChangeDetectionStrategy, Component, computed, effect, input } from '@angular/core';
import { formatDate } from '@angular/common';

import { DayEntry } from '../../core/models';
import { formatMinutes, localDateString } from '../../core/date-utils';
import { TaskColorHexPipe } from '../../core/task-color-hex.pipe';

interface HistoryRow {
  date: string;
  label: string;
  total: string;
  entries: DayEntry[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-day-history',
  imports: [TaskColorHexPipe],
  template: `
    <section>
      <div class="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span class="display text-[1.75rem]">History</span>
        <span class="text-muted text-[0.875rem]">every day, newest first</span>
      </div>

      @if (rows().length === 0) {
        <div class="text-muted px-1 py-4 text-sm">No history yet — log some time to see it here.</div>
      } @else {
        <div class="relative">
          <div class="absolute top-4 bottom-4 left-[17px] w-[1.6px] bg-rule/25" aria-hidden="true"></div>

          <div class="flex flex-col gap-3">
            @for (row of rows(); track row.date) {
              <div class="flex flex-col gap-1.5" [id]="'history-day-' + row.date">
                <div class="flex w-full items-center gap-2">
                  <span class="flex w-9 shrink-0 justify-center">
                    <span class="z-10 flex h-8 w-8 items-center justify-center rounded-full border-[1.6px] bg-paper"
                          [class.border-rule]="row.date !== selectedDate()"
                          [class.border-accent]="row.date === selectedDate()"
                          [class.ring-2]="row.date === selectedDate()"
                          [class.ring-accent]="row.date === selectedDate()"
                          [class.text-accent]="row.date === selectedDate()">
                      <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor"
                           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 7v5l3 2" />
                      </svg>
                    </span>
                  </span>
                  <span class="display min-w-0 flex-1 truncate text-[1.15rem]"
                        [class.text-accent]="row.date === selectedDate()">{{ row.label }}</span>
                  <span class="text-muted text-[13px]">{{ row.total }}</span>
                </div>

                @for (entry of row.entries; track entry.taskId) {
                  <div class="flex items-center gap-2">
                    <span class="flex w-9 shrink-0 justify-center">
                      <span class="z-10 inline-block h-4 w-4 rounded-[3px] border-[1.4px] border-rule"
                            [style.background]="entry.taskColor | taskColorHex"></span>
                    </span>
                    <div class="min-w-0 flex-1 rounded-[6px_9px_5px_8px/8px_5px_9px_6px] border-[1.4px] border-rule bg-paper px-3 py-2 text-sm">
                      Logged <span class="font-semibold">{{ minutesLabel(entry.minutes) }}</span>
                      on <span class="font-semibold">{{ entry.taskName }}</span>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      }
    </section>
  `,
})
export class DayHistoryComponent {
  /** Every logged entry in the visible window; the component groups them per day and task. */
  readonly entries = input.required<DayEntry[], DayEntry[] | null | undefined>({
    transform: (value) => value ?? [],
  });

  readonly selectedDate = input<string | null>(null);

  constructor() {
    // A heatmap day-click flows in through `selectedDate`; bring that day into view.
    effect(() => {
      const date = this.selectedDate();
      if (!date)
        return;

      document.getElementById(`history-day-${date}`)?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    });
  }

  /** Days with logged time, newest first, each with its per-task breakdown. */
  protected readonly rows = computed<HistoryRow[]>(() => {
    const byDate = new Map<string, DayEntry[]>();
    for (const entry of this.entries()) {
      const existing = byDate.get(entry.date);
      if (existing) {
        existing.push(entry);
      } else {
        byDate.set(entry.date, [entry]);
      }
    }

    return [...byDate.entries()]
      .sort(([firstDate], [secondDate]) => secondDate.localeCompare(firstDate))
      .map(([date, dayEntries]) => ({
        date,
        label: dayLabel(date),
        total: formatMinutes(dayEntries.reduce((sum, entry) => sum + entry.minutes, 0)),
        entries: groupByTask(dayEntries),
      }));
  });

  protected minutesLabel(minutes: number): string {
    return formatMinutes(minutes);
  }
}

/** "Today · Tue, Apr 28" / "Yesterday · …" / "Tue, Apr 28" (year appended only when not the current year). */
function dayLabel(date: string): string {
  const now = new Date();
  const today = localDateString(now);
  const yesterday = localDateString(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  const sameYear = date.startsWith(`${now.getFullYear()}-`);
  const formatted = formatDate(date, sameYear ? 'EEE, MMM d' : 'EEE, MMM d, y', 'en-US');
  if (date === today)
    return `Today · ${formatted}`;

  if (date === yesterday)
    return `Yesterday · ${formatted}`;

  return formatted;
}

/** Collapses multiple entries for the same task into one, summing minutes, biggest first. */
function groupByTask(entries: DayEntry[]): DayEntry[] {
  const byTask = new Map<string, DayEntry>();
  for (const entry of entries) {
    const existing = byTask.get(entry.taskId);
    if (existing) {
      byTask.set(entry.taskId, { ...existing, minutes: existing.minutes + entry.minutes });
    } else {
      byTask.set(entry.taskId, { ...entry });
    }
  }
  return [...byTask.values()].sort((first, second) => second.minutes - first.minutes);
}
