import { Task } from './models';

export interface TaskGroup {
  root: Task;
  children: Task[];
}

/** Position ascending, newest first on ties — matches the server's ordering. */
const byPosition = (left: Task, right: Task) =>
  left.position - right.position || right.createdAt.localeCompare(left.createdAt);

/**
 * Groups a flat task list into roots with their children, each sorted by position.
 * Independent of input order: children listed before their parent still nest.
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

  return roots.sort(byPosition).map((root) => ({
    root,
    children: (childrenByParent.get(root.id) ?? []).sort(byPosition),
  }));
}
