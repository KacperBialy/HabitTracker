import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { ArcElement, Chart, ChartOptions, DoughnutController, Tooltip, TooltipItem } from 'chart.js';

import { DayEntry } from '../../core/models';
import { formatMinutes } from '../../core/date-utils';
import { BreakdownLine } from '../../core/task-rollup';
import { DonutRangeDays, buildDonutChartData } from './task-share-chart-data';
import { buildTrendComparison, trendDeltaLabel } from './trend-comparison-data';

Chart.register(DoughnutController, ArcElement, Tooltip);

const RANGE_OPTIONS: { days: DonutRangeDays; label: string }[] = [
  { days: 7, label: 'week' },
  { days: 30, label: 'month' },
];

// Theme tokens from styles.css — canvas can't read Tailwind utilities.
const INK = '#2b2b2b';
const FONT_FAMILY = 'Kalam, cursive';

function buildChartOptions(): ChartOptions<'doughnut'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    plugins: {
      tooltip: {
        backgroundColor: INK,
        titleFont: { family: FONT_FAMILY },
        bodyFont: { family: FONT_FAMILY },
        callbacks: {
          label: (context: TooltipItem<'doughnut'>) => {
            const minutes = context.parsed ?? 0;
            const total = context.dataset.data.reduce(
              (sum: number, value) => sum + Number(value ?? 0),
              0,
            );
            const share = total > 0 ? Math.round((minutes / total) * 100) : 0;
            return ` ${context.label}: ${formatMinutes(minutes)} (${share}%)`;
          },
          afterBody: (items: TooltipItem<'doughnut'>[]) => {
            const item = items[0];
            if (!item) return [];
            const lines =
              (item.dataset as { breakdowns?: BreakdownLine[][] }).breakdowns?.[item.dataIndex] ?? [];
            if (lines.length <= 1) return [];
            return lines.map((line) => ` ${line.name}: ${formatMinutes(line.minutes)}`);
          },
        },
      },
    },
  };
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-task-share-chart',
  templateUrl: './task-share-chart.component.html',
})
export class TaskShareChartComponent {
  readonly entries = input.required<DayEntry[], DayEntry[] | null | undefined>({
    transform: (value) => value ?? [],
  });

  protected readonly rangeOptions = RANGE_OPTIONS;
  protected readonly rangeDays = signal<DonutRangeDays>(7);

  protected readonly chartData = computed(() => buildDonutChartData(this.entries(), this.rangeDays()));

  protected readonly comparison = computed(() => buildTrendComparison(this.entries(), this.rangeDays()));

  protected readonly hasData = computed(() => this.chartData().totalMinutes > 0);

  protected readonly totalLabel = computed(() => formatMinutes(this.chartData().totalMinutes) || '0m');

  protected readonly rangeLabel = computed(
    () => RANGE_OPTIONS.find((option) => option.days === this.rangeDays())?.label ?? '',
  );

  /**
   * Legend: composition (duration + share of this window) with a separate
   * colored delta vs the previous window of the same length.
   */
  protected readonly legendItems = computed(() => {
    const data = this.chartData();
    const total = data.totalMinutes;
    const slices = data.datasets[0];
    const trendByTask = new Map(this.comparison().tasks.map((task) => [task.taskId, task]));
    const range = this.rangeLabel();
    return data.labels.map((label, index) => {
      const taskId = data.taskIds[index];
      const trend = trendByTask.get(taskId);
      const delta = trendDeltaLabel(trend?.percentChange ?? null, trend?.direction ?? 'flat');
      const deltaTitle =
        delta.kind === 'new' ? `new this ${range}` : `${delta.text} vs last ${range}`;
      const share = total > 0 ? Math.round((slices.data[index] / total) * 100) : 0;
      const duration = formatMinutes(slices.data[index]);
      return {
        taskId,
        label,
        color: slices.backgroundColor[index],
        duration,
        share,
        deltaText: delta.text,
        deltaKind: delta.kind,
        deltaTitle,
        ariaLabel: `${label}, ${duration}, ${share}% of this ${range}, ${deltaTitle}`,
      };
    });
  });

  protected readonly chartAriaLabel = computed(
    () => `Donut chart of time share per task over the last ${this.rangeDays()} days`,
  );

  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('donutCanvas');

  /** External mutable object owned by Chart.js — deliberately not a signal. */
  private chart: Chart<'doughnut'> | null = null;

  constructor() {
    afterRenderEffect(() => {
      const data = this.chartData(); // tracked: re-runs when entries or range change
      const canvas = this.canvasRef().nativeElement;
      if (!this.chart) {
        this.chart = new Chart(canvas, { type: 'doughnut', data, options: buildChartOptions() });
      } else {
        this.chart.data = data;
        this.chart.update();
      }
    });

    inject(DestroyRef).onDestroy(() => {
      this.chart?.destroy();
      this.chart = null;
    });
  }
}
