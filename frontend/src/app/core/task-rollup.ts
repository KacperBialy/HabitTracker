import { DayEntry } from './models';
import { TaskColor } from './task-colors';

/** Parent id when the entry is a subtask log; otherwise the entry's own task. */
export function rollupTaskId(entry: DayEntry): string {
  return entry.parent?.id ?? entry.taskId;
}

/** Parent name when the entry is a subtask log; otherwise the entry's own name. */
export function rollupTaskName(entry: DayEntry): string {
  return entry.parent?.name ?? entry.taskName;
}

/** Parent color when the entry is a subtask log; otherwise the entry's own color. */
export function rollupTaskColor(entry: DayEntry): TaskColor {
  return entry.parent?.color ?? entry.taskColor;
}

export function taskDisplayName(name: string, parentName: string | null | undefined): string {
  return parentName ? `${parentName} › ${name}` : name;
}

export function entryDisplayName(entry: DayEntry): string {
  return taskDisplayName(entry.taskName, entry.parent?.name);
}

/** One line in a parent-slice hover breakdown (parent own time, then each child). */
export interface BreakdownLine {
  taskId: string;
  name: string;
  color: TaskColor;
  minutes: number;
}

export function addBreakdownMinutes(
  lines: Map<string, BreakdownLine>,
  entry: DayEntry,
  minutes: number = entry.minutes,
): void {
  const existing = lines.get(entry.taskId);
  if (existing) {
    existing.minutes += minutes;
    return;
  }
  lines.set(entry.taskId, {
    taskId: entry.taskId,
    name: entry.taskName,
    color: entry.taskColor,
    minutes,
  });
}

/** Parent own line first, then children by name. Zero-minute lines are dropped. */
export function orderedBreakdown(lines: Map<string, BreakdownLine>, parentTaskId: string): BreakdownLine[] {
  const values = [...lines.values()].filter((line) => line.minutes > 0);
  const own = values.filter((line) => line.taskId === parentTaskId);
  const children = values
    .filter((line) => line.taskId !== parentTaskId)
    .sort(
      (left, right) =>
        left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }) ||
        left.taskId.localeCompare(right.taskId),
    );
  return [...own, ...children];
}
