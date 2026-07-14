/**
 * Mirrors the backend TaskColor enum (Contracts/Models/TaskColor.cs). Values are sent/received
 * as integers, so these MUST stay in sync with the C# member values.
 */
export enum TaskColor {
  Slate = 0,
  Red = 1,
  Orange = 2,
  Amber = 3,
  Green = 4,
  Teal = 5,
  Blue = 6,
  Violet = 7,
}

/** Enum → hex used to render the swatch/dot. The backend stays presentation-agnostic. */
export const TASK_COLOR_HEX: Record<TaskColor, string> = {
  [TaskColor.Slate]: '#8a8478',
  [TaskColor.Red]: '#c0392b',
  [TaskColor.Orange]: '#d35400',
  [TaskColor.Amber]: '#c99a2e',
  [TaskColor.Green]: '#30a14e',
  [TaskColor.Teal]: '#2a9d8f',
  [TaskColor.Blue]: '#2b6cb0',
  [TaskColor.Violet]: '#7d5ba6',
};

/** Order the swatches appear in the picker. */
export const TASK_COLOR_OPTIONS: TaskColor[] = [
  TaskColor.Slate,
  TaskColor.Red,
  TaskColor.Orange,
  TaskColor.Amber,
  TaskColor.Green,
  TaskColor.Teal,
  TaskColor.Blue,
  TaskColor.Violet,
];

export const DEFAULT_TASK_COLOR = TaskColor.Slate;
