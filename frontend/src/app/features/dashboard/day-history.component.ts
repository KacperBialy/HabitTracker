import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { formatDate } from '@angular/common';

import { DailyAggregate, DayEntry } from '../../core/models';
import { formatMinutes } from '../../core/date-utils';
import { TasksService } from '../../core/tasks.service';

interface HistoryRow {
  date: string;
  label: string;
  total: string;
  entryCount: number;
}

@Component({
  selector: 'app-day-history',
  template: `
    <section>
      <div class="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span class="display text-[1.75rem]">History</span>
        <span class="text-muted text-[0.875rem]">every day, newest first</span>
      </div>

      @if (rows().length === 0) {
        <div class="text-muted px-1 py-4 text-sm">No history yet — log some time to see it here.</div>
      } @else {
        <div class="flex flex-col gap-1.5">
          @for (row of rows(); track row.date) {
              <div class="rounded-[6px_9px_5px_8px/8px_5px_9px_6px] border-[1.4px] bg-paper"
                   [class.border-accent]="row.date === selectedDate()"
                   [class.ring-2]="row.date === selectedDate()"
                   [class.ring-accent]="row.date === selectedDate()">
                <button type="button"
                        class="flex w-full items-center gap-2 px-2.5 py-1.5 text-left"
                        [attr.aria-expanded]="expanded().has(row.date)"
                        (click)="toggle(row.date)">
                  <span class="text-muted w-4 shrink-0 text-xs">{{ expanded().has(row.date) ? '▾' : '▸' }}</span>
                  <span class="min-w-0 flex-1 truncate text-sm">{{ row.label }}</span>
                  <span class="text-muted text-[13px]">{{ row.total }}</span>
                </button>

                @if (expanded().has(row.date)) {
                  <div class="border-t border-rule/15 px-2.5 py-1.5 pl-8">
                    @if (entriesFor(row.date); as entries) {
                      @for (entry of entries; track entry.taskId) {
                        <div class="flex items-center gap-2 py-0.5 text-[13px]">
                          <span class="min-w-0 flex-1 truncate">{{ entry.taskName }}</span>
                          <span class="text-muted">{{ minutesLabel(entry.minutes) }}</span>
                        </div>
                      }
                    } @else {
                      <div class="text-muted py-0.5 text-[13px]">Loading…</div>
                    }
                  </div>
                }
              </div>
          }
        </div>
      }
    </section>
  `,
})
export class DayHistoryComponent {
  private readonly tasks = inject(TasksService);

  readonly days = input.required<DailyAggregate[], DailyAggregate[] | null | undefined>({
    transform: (value) => value ?? [],
  });

  readonly selectedDate = input<string | null>(null);

  private readonly expandedDates = signal(new Set<string>());
  private readonly entriesByDate = signal(new Map<string, DayEntry[]>());

  /** The last date auto-expanded via a heatmap click — so we react only to genuine changes. */
  private autoExpandedDate: string | null = null;

  constructor() {
    // A heatmap day-click flows in through `selectedDate`; expand that day in the list.
    effect(() => {
      const date = this.selectedDate();
      if (!date || date === this.autoExpandedDate) return;
      this.autoExpandedDate = date;
      this.expand(date);
    });
  }

  /** Days with logged time, newest first. */
  protected readonly rows = computed<HistoryRow[]>(() =>
    this.days()
      .filter((day) => day.entryCount > 0)
      .sort((first, second) => second.date.localeCompare(first.date))
      .map((day) => ({
        date: day.date,
        label: formatDate(day.date, 'EEE, MMM d, y', 'en-US'),
        total: formatMinutes(day.totalMinutes),
        entryCount: day.entryCount,
      })),
  );

  protected expanded(): ReadonlySet<string> {
    return this.expandedDates();
  }

  /** Cached per-task breakdown for a date, or undefined while it's still loading. */
  protected entriesFor(date: string): DayEntry[] | undefined {
    return this.entriesByDate().get(date);
  }

  protected minutesLabel(minutes: number): string {
    return formatMinutes(minutes);
  }

  protected toggle(date: string): void {
    if (this.expandedDates().has(date)) {
      const next = new Set(this.expandedDates());
      next.delete(date);
      this.expandedDates.set(next);
    } else {
      this.expand(date);
    }
  }

  /** Opens a day (idempotent) and lazily loads its breakdown. */
  private expand(date: string): void {
    if (this.expandedDates().has(date)) return;
    const next = new Set(this.expandedDates());
    next.add(date);
    this.expandedDates.set(next);
    this.ensureEntries(date);
  }

  /** Lazily fetch a day's breakdown once, group it per task, then cache it. */
  private ensureEntries(date: string): void {
    if (this.entriesByDate().has(date)) return;

    this.tasks.dayEntries(date).subscribe((entries) => {
      const next = new Map(this.entriesByDate());
      next.set(date, groupByTask(entries));
      this.entriesByDate.set(next);
    });
  }
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
