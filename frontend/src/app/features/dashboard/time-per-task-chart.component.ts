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
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  ChartOptions,
  LinearScale,
  Tooltip,
  TooltipItem,
} from 'chart.js';

import { DayEntry } from '../../core/models';
import { formatMinutes } from '../../core/date-utils';
import { ChartRangeDays, buildStackedChartData } from './time-per-task-chart-data';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

const RANGE_OPTIONS: ChartRangeDays[] = [7, 30, 90];

// Theme tokens from styles.css — canvas can't read Tailwind utilities.
const INK = '#2b2b2b';
const MUTED = '#8a8478';
const FONT_FAMILY = 'Kalam, cursive';

function buildChartOptions(): ChartOptions<'bar'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        stacked: true,
        grid: { display: false },
        border: { color: INK, width: 1.4 },
        ticks: {
          color: MUTED,
          font: { family: FONT_FAMILY },
          maxRotation: 0,
          autoSkip: true,
          autoSkipPadding: 12,
        },
      },
      y: {
        stacked: true,
        beginAtZero: true,
        grid: { color: 'rgba(43, 43, 43, 0.08)' },
        border: { display: false },
        ticks: {
          color: MUTED,
          font: { family: FONT_FAMILY },
          // formatMinutes returns '' for <= 0, so the baseline tick needs a fallback.
          callback: (value) => formatMinutes(Number(value)) || '0m',
        },
      },
    },
    plugins: {
      tooltip: {
        filter: (item: TooltipItem<'bar'>) => (item.parsed.y ?? 0) > 0,
        backgroundColor: INK,
        titleFont: { family: FONT_FAMILY },
        bodyFont: { family: FONT_FAMILY },
        footerFont: { family: FONT_FAMILY, weight: 'normal' },
        callbacks: {
          label: (context: TooltipItem<'bar'>) =>
            ` ${context.dataset.label}: ${formatMinutes(context.parsed.y ?? 0)}`,
          footer: (items: TooltipItem<'bar'>[]) => {
            if (items.length < 2) return '';
            const totalMinutes = items.reduce((sum, item) => sum + (item.parsed.y ?? 0), 0);
            return `Total: ${formatMinutes(totalMinutes)}`;
          },
        },
      },
    },
  };
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-time-per-task-chart',
  templateUrl: './time-per-task-chart.component.html',
})
export class TimePerTaskChartComponent {
  readonly entries = input.required<DayEntry[], DayEntry[] | null | undefined>({
    transform: (value) => value ?? [],
  });

  protected readonly rangeOptions = RANGE_OPTIONS;
  protected readonly rangeDays = signal<ChartRangeDays>(30);

  protected readonly chartData = computed(() => buildStackedChartData(this.entries(), this.rangeDays()));

  protected readonly hasData = computed(() => this.chartData().datasets.length > 0);

  protected readonly legendItems = computed(() =>
    this.chartData().datasets.map((dataset) => ({ label: dataset.label, color: dataset.backgroundColor })),
  );

  protected readonly chartAriaLabel = computed(
    () => `Stacked bar chart of time logged per task over the last ${this.rangeDays()} days`,
  );

  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('chartCanvas');

  /** External mutable object owned by Chart.js — deliberately not a signal. */
  private chart: Chart<'bar'> | null = null;

  constructor() {
    afterRenderEffect(() => {
      const data = this.chartData(); // tracked: re-runs when entries or range change
      const canvas = this.canvasRef().nativeElement;
      if (!this.chart) {
        this.chart = new Chart(canvas, { type: 'bar', data, options: buildChartOptions() });
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
