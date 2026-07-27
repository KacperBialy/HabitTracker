import { DayEntry } from '../../core/models';
import { localDateString } from '../../core/date-utils';
import { TASK_COLOR_HEX } from '../../core/task-colors';

/** Donut windows: a rolling week and a rolling month, both ending today. */
export type DonutRangeDays = 7 | 30;

export interface DonutChartData {
  labels: string[];
  datasets: {
    data: number[];
    backgroundColor: string[];
    borderColor: string;
    borderWidth: number;
    hoverOffset: number;
  }[];
  /** Total minutes across all slices — rendered in the donut's hole. */
  totalMinutes: number;
}

/** One task's accumulator while rolling entries up into a slice. */
interface TaskSlice {
  taskId: string;
  taskName: string;
  color: string;
  minutes: number;
}

/** Paper background from styles.css — slice borders in this color read as gaps between segments. */
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

/** Rolls DayEntry rows up into one donut slice per task over the last `rangeDays` days ending today. */
export function buildDonutChartData(entries: DayEntry[], rangeDays: number): DonutChartData {
  const end = parseLocalDate(localDateString());
  const start = localDateString(addDays(end, -(rangeDays - 1)));
  const endKey = localDateString(end);

  const slicesByTask = new Map<string, TaskSlice>();
  for (const entry of entries) {
    if (entry.date < start || entry.date > endKey) continue;
    let slice = slicesByTask.get(entry.taskId);
    if (!slice) {
      slice = {
        taskId: entry.taskId,
        taskName: entry.taskName,
        color: TASK_COLOR_HEX[entry.taskColor],
        minutes: 0,
      };
      slicesByTask.set(entry.taskId, slice);
    }
    slice.minutes += entry.minutes;
  }

  // Largest share first so the donut reads as a ranking; taskId tiebreak keeps ties stable.
  const orderedSlices = [...slicesByTask.values()]
    .filter((slice) => slice.minutes > 0)
    .sort(
      (left, right) => right.minutes - left.minutes || left.taskId.localeCompare(right.taskId),
    );

  return {
    labels: orderedSlices.map((slice) => slice.taskName),
    datasets: [
      {
        data: orderedSlices.map((slice) => slice.minutes),
        backgroundColor: orderedSlices.map((slice) => slice.color),
        borderColor: PAPER,
        borderWidth: 2,
        hoverOffset: 6,
      },
    ],
    totalMinutes: orderedSlices.reduce((sum, slice) => sum + slice.minutes, 0),
  };
}
