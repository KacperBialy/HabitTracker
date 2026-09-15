import { DayEntry } from '../../core/models';
import { localDateString } from '../../core/date-utils';
import { TASK_COLOR_HEX } from '../../core/task-colors';
import {
  BreakdownLine,
  addBreakdownMinutes,
  orderedBreakdown,
  rollupTaskColor,
  rollupTaskId,
  rollupTaskName,
} from '../../core/task-rollup';

export type ChartRangeDays = 7 | 30 | 90;

export interface StackedChartDataset {
  label: string;
  data: number[];
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  borderSkipped: boolean;
  borderRadius: number;
  maxBarThickness: number;
  /** Per-day hover split: parent own minutes first, then each child. */
  breakdownByDay: BreakdownLine[][];
}

export interface StackedChartData {
  labels: string[];
  datasets: StackedChartDataset[];
}

/** One parent task's accumulator while rolling entries up into a dataset. */
interface TaskSeries {
  taskId: string;
  taskName: string;
  color: string;
  minutesByDay: number[];
  breakdownByDay: Map<string, BreakdownLine>[];
}

/** Paper background from styles.css — segment borders in this color read as gaps between stacked segments. */
const PAPER = '#fbf9f4';

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

/** Rolls DayEntry rows up into one stacked-bar dataset per parent over the last `rangeDays` days ending today. */
export function buildStackedChartData(entries: DayEntry[], rangeDays: number): StackedChartData {
  const end = parseLocalDate(localDateString());
  const start = addDays(end, -(rangeDays - 1));

  const dateKeys: string[] = [];
  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1))
    dateKeys.push(localDateString(cursor));
  const indexByDate = new Map(dateKeys.map((date, index) => [date, index] as const));

  const seriesByTask = new Map<string, TaskSeries>();
  for (const entry of entries) {
    const dayIndex = indexByDate.get(entry.date);
    if (dayIndex === undefined) continue;
    const parentId = rollupTaskId(entry);
    let series = seriesByTask.get(parentId);
    if (!series) {
      series = {
        taskId: parentId,
        taskName: rollupTaskName(entry),
        color: TASK_COLOR_HEX[rollupTaskColor(entry)],
        minutesByDay: new Array<number>(dateKeys.length).fill(0),
        breakdownByDay: Array.from({ length: dateKeys.length }, () => new Map()),
      };
      seriesByTask.set(parentId, series);
    }
    series.minutesByDay[dayIndex] += entry.minutes;
    addBreakdownMinutes(series.breakdownByDay[dayIndex], entry);
  }

  // Stable stack order regardless of entry order; taskId tiebreak covers duplicate names.
  const orderedSeries = [...seriesByTask.values()].sort(
    (left, right) =>
      left.taskName.localeCompare(right.taskName, undefined, { sensitivity: 'base' }) ||
      left.taskId.localeCompare(right.taskId),
  );

  return {
    labels: dateKeys.map(humanDate),
    datasets: orderedSeries.map((series) => ({
      label: series.taskName,
      data: series.minutesByDay,
      backgroundColor: series.color,
      borderColor: PAPER,
      borderWidth: 1,
      borderSkipped: false,
      borderRadius: 2,
      maxBarThickness: 28,
      breakdownByDay: series.breakdownByDay.map((lines) => orderedBreakdown(lines, series.taskId)),
    })),
  };
}
