import { DayEntry } from '../../core/models';
import { localDateString } from '../../core/date-utils';
import { TASK_COLOR_HEX } from '../../core/task-colors';
import { DonutRangeDays } from './task-share-chart-data';

/** Direction of travel vs. the previous window; 'flat' also covers "no baseline". */
export type TrendDirection = 'up' | 'down' | 'flat';

export interface TrendRow {
  taskId: string;
  taskName: string;
  color: string;
  /** Minutes in the window ending today. */
  currentMinutes: number;
  /** Minutes in the window of equal length immediately before it. */
  previousMinutes: number;
  /** Signed change vs. the previous window; null when the previous window is empty. */
  percentChange: number | null;
  direction: TrendDirection;
  /** Share of the current window's total, 0-100 — drives the row's share bar width. */
  sharePercent: number;
}

/** One day of the current window, oldest first — the hero sparkline. */
export interface TrendDay {
  date: string;
  minutes: number;
}

export interface TrendComparison {
  currentMinutes: number;
  previousMinutes: number;
  percentChange: number | null;
  direction: TrendDirection;
  /** Absolute minute difference vs. the previous window. */
  deltaMinutes: number;
  /** One row per task active in either window, biggest current total first. */
  tasks: TrendRow[];
  /** Every day of the current window, including zero days, oldest first. */
  days: TrendDay[];
  /** Weekday name of the busiest day in the current window; null when nothing was logged. */
  mostActiveWeekday: string | null;
}

/** One task's accumulator while splitting entries across the two windows. */
interface TaskTotals {
  taskId: string;
  taskName: string;
  color: string;
  currentMinutes: number;
  previousMinutes: number;
}

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day); // Date's month arg is 0-indexed (0 = Jan)
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** A percentage against a zero baseline is undefined, not 0% — callers render null as "no comparison". */
function percentChange(currentMinutes: number, previousMinutes: number): number | null {
  if (previousMinutes <= 0) return null;
  return Math.round(((currentMinutes - previousMinutes) / previousMinutes) * 100);
}

function directionOf(change: number | null): TrendDirection {
  if (change === null || change === 0) return 'flat';
  return change > 0 ? 'up' : 'down';
}

/**
 * Totals the last `rangeDays` days ending today against the `rangeDays` before that, overall
 * and per task. Both windows are the same length, so no partial-period correction is needed.
 */
export function buildTrendComparison(entries: DayEntry[], rangeDays: DonutRangeDays): TrendComparison {
  const today = parseLocalDate(localDateString());
  const currentStart = localDateString(addDays(today, -(rangeDays - 1)));
  const currentEnd = localDateString(today);
  const previousStart = localDateString(addDays(today, -(rangeDays * 2 - 1)));
  const previousEnd = localDateString(addDays(today, -rangeDays));

  // Pre-seed every day of the current window so zero days still render a bar.
  const minutesByDate = new Map<string, number>();
  for (let offset = rangeDays - 1; offset >= 0; offset--) {
    minutesByDate.set(localDateString(addDays(today, -offset)), 0);
  }

  let currentMinutes = 0;
  let previousMinutes = 0;
  const totalsByTask = new Map<string, TaskTotals>();

  for (const entry of entries) {
    const inCurrent = entry.date >= currentStart && entry.date <= currentEnd;
    const inPrevious = entry.date >= previousStart && entry.date <= previousEnd;
    if (!inCurrent && !inPrevious) continue;

    let totals = totalsByTask.get(entry.taskId);
    if (!totals) {
      totals = {
        taskId: entry.taskId,
        taskName: entry.taskName,
        color: TASK_COLOR_HEX[entry.taskColor],
        currentMinutes: 0,
        previousMinutes: 0,
      };
      totalsByTask.set(entry.taskId, totals);
    }

    if (inCurrent) {
      totals.currentMinutes += entry.minutes;
      currentMinutes += entry.minutes;
      minutesByDate.set(entry.date, (minutesByDate.get(entry.date) ?? 0) + entry.minutes);
    } else {
      totals.previousMinutes += entry.minutes;
      previousMinutes += entry.minutes;
    }
  }

  const days = [...minutesByDate.entries()].map(([date, minutes]) => ({ date, minutes }));

  // Biggest current total first so the list reads as a ranking; taskId tiebreak keeps ties stable.
  const tasks = [...totalsByTask.values()]
    .sort(
      (left, right) =>
        right.currentMinutes - left.currentMinutes || left.taskId.localeCompare(right.taskId),
    )
    .map((totals) => {
      const change = percentChange(totals.currentMinutes, totals.previousMinutes);
      return {
        taskId: totals.taskId,
        taskName: totals.taskName,
        color: totals.color,
        currentMinutes: totals.currentMinutes,
        previousMinutes: totals.previousMinutes,
        percentChange: change,
        direction: directionOf(change),
        sharePercent:
          currentMinutes > 0 ? Math.round((totals.currentMinutes / currentMinutes) * 100) : 0,
      };
    });

  const busiest = days.reduce<TrendDay | null>(
    (best, day) => (day.minutes > 0 && (!best || day.minutes > best.minutes) ? day : best),
    null,
  );

  const overallChange = percentChange(currentMinutes, previousMinutes);
  return {
    currentMinutes,
    previousMinutes,
    percentChange: overallChange,
    direction: directionOf(overallChange),
    deltaMinutes: Math.abs(currentMinutes - previousMinutes),
    tasks,
    days,
    mostActiveWeekday: busiest ? WEEKDAY_NAMES[parseLocalDate(busiest.date).getDay()] : null,
  };
}
