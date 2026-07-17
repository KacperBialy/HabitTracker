import { TaskColor } from './task-colors';

/** Mirrors TaskDto — TaskId serializes as a bare GUID string. */
export interface Task {
  id: string;
  name: string;
  createdAt: string;
  color: TaskColor;
}

/** Mirrors DayEntryDto from GET /api/tasks/timelogs/entries?from=&to= — date is an ISO YYYY-MM-DD string. */
export interface DayEntry {
  date: string;
  taskId: string;
  taskName: string;
  minutes: number;
  taskColor: TaskColor;
}

/** Mirrors TimeLogDto — logDate is an ISO YYYY-MM-DD string. */
export interface TimeLog {
  id: string;
  taskId: string;
  ownerId: string;
  minutes: number;
  logDate: string;
}

/** Mirrors DailyAggregateDto — date is an ISO YYYY-MM-DD string. */
export interface DailyAggregate {
  date: string;
  totalMinutes: number;
  entryCount: number;
}

/** Mirrors YearAggregatesDto from GET /api/tasks/timelogs/aggregates?year={year}. */
export interface YearAggregates {
  year: number;
  days: DailyAggregate[];
}
