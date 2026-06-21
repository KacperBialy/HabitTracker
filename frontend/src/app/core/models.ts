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
