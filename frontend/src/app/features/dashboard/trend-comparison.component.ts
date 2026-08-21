import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

import { DayEntry } from '../../core/models';
import { formatMinutes } from '../../core/date-utils';
import { DonutRangeDays } from './task-share-chart-data';
import { TrendDirection, buildTrendComparison } from './trend-comparison-data';

const RANGE_OPTIONS: { days: DonutRangeDays; label: string }[] = [
  { days: 7, label: 'week' },
  { days: 30, label: 'month' },
];

/** Arrow glyphs for the delta chip and per-task deltas. */
const DIRECTION_ARROW: Record<TrendDirection, string> = {
  up: '↑',
  down: '↓',
  flat: '',
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-trend-comparison',
  templateUrl: './trend-comparison.component.html',
})
export class TrendComparisonComponent {
  readonly entries = input.required<DayEntry[], DayEntry[] | null | undefined>({
    transform: (value) => value ?? [],
  });

  protected readonly rangeOptions = RANGE_OPTIONS;
  protected readonly rangeDays = signal<DonutRangeDays>(7);

  protected readonly comparison = computed(() => buildTrendComparison(this.entries(), this.rangeDays()));

  protected readonly rangeLabel = computed(
    () => RANGE_OPTIONS.find((option) => option.days === this.rangeDays())?.label ?? '',
  );

  protected readonly totalLabel = computed(() => formatMinutes(this.comparison().currentMinutes) || '0m');

  protected readonly previousLabel = computed(() => formatMinutes(this.comparison().previousMinutes) || '0m');

  /** Delta chip: an arrow plus the magnitude, or a neutral "no comparison yet". */
  protected readonly chip = computed(() => {
    const { percentChange, direction } = this.comparison();
    if (percentChange === null) {
      return { text: 'no comparison yet', direction: 'none' as const };
    }
    if (percentChange === 0) {
      return { text: 'no change', direction: 'none' as const };
    }
    return {
      text: `${DIRECTION_ARROW[direction]} ${Math.abs(percentChange)}%`,
      direction,
    };
  });

  protected readonly deltaSub = computed(() => {
    const { percentChange, deltaMinutes } = this.comparison();
    const label = this.rangeLabel();
    if (percentChange === null) {
      return `nothing logged the ${label} before — this is your baseline`;
    }
    if (percentChange === 0) {
      return `exactly the same as last ${label} (${this.previousLabel()})`;
    }
    const word = percentChange > 0 ? 'more' : 'less';
    return `${formatMinutes(deltaMinutes)} ${word} than last ${label} (${this.previousLabel()})`;
  });

  /** Per-task rows: dot, name, share bar, current total and its own delta. */
  protected readonly taskRows = computed(() =>
    this.comparison().tasks.map((task) => ({
      taskId: task.taskId,
      taskName: task.taskName,
      color: task.color,
      duration: formatMinutes(task.currentMinutes) || '0m',
      sharePercent: task.sharePercent,
      direction: task.direction,
      // A task with no previous activity is new, not a 0% change.
      isNew: task.percentChange === null,
      deltaLabel:
        task.percentChange === null
          ? 'new'
          : task.percentChange === 0
            ? '0%'
            : `${DIRECTION_ARROW[task.direction]} ${Math.abs(task.percentChange)}%`,
    })),
  );

  protected readonly footLeft = computed(() => {
    const count = this.comparison().tasks.length;
    return `${count} ${count === 1 ? 'task' : 'tasks'} tracked`;
  });

  protected readonly footRight = computed(() => {
    const weekday = this.comparison().mostActiveWeekday;
    return weekday ? `most active day: ${weekday}` : 'no activity yet';
  });

  protected readonly ariaLabel = computed(() => {
    const { percentChange } = this.comparison();
    const label = this.rangeLabel();
    if (percentChange === null) {
      return `${this.totalLabel()} logged this ${label}; no data for the ${label} before`;
    }
    const word = percentChange > 0 ? 'up' : percentChange < 0 ? 'down' : 'unchanged';
    return `${this.totalLabel()} logged this ${label}, ${word} ${Math.abs(percentChange)}% vs last ${label}`;
  });
}
