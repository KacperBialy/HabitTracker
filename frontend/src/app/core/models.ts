/** Mirrors TaskDto — TaskId serializes as a bare GUID string. */
export interface Task {
  id: string;
  name: string;
  createdAt: string;
}

/** Mirrors DayEntryDto from GET /api/tasks/timelogs/aggregates/{date}. */
export interface DayEntry {
  taskId: string;
  taskName: string;
  minutes: number;
}

/** Mirrors TimeLogDto — logDate is an ISO YYYY-MM-DD string. */
export interface TimeLog {
  id: string;
  taskId: string;
  ownerId: string;
  minutes: number;
  logDate: string;
}
