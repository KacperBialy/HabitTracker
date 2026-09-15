import { Task } from './models';

export interface TaskGroup {
  root: Task;
  children: Task[];
}

/**
 * Groups a flat task list into roots with their children.
 * Two-pass so children listed before their parent (createdAt desc) still nest.
 * A child whose parent is missing is promoted to a root.
 */
export function groupTasksByParent(tasks: Task[]): TaskGroup[] {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const childrenByParent = new Map<string, Task[]>();
  const roots: Task[] = [];

  for (const task of tasks) {
    if (task.parentTaskId && byId.has(task.parentTaskId)) {
      const siblings = childrenByParent.get(task.parentTaskId) ?? [];
      siblings.push(task);
      childrenByParent.set(task.parentTaskId, siblings);
    } else {
      roots.push(task);
    }
  }

  return roots.map((root) => ({
    root,
    children: childrenByParent.get(root.id) ?? [],
  }));
}
