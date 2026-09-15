import { groupTasksByParent } from './task-tree';
import { Task } from './models';
import { TaskColor } from './task-colors';

function task(id: string, name: string, parentTaskId: string | null = null): Task {
  return { id, name, createdAt: '2026-01-01T00:00:00Z', color: TaskColor.Slate, parentTaskId };
}

describe('groupTasksByParent', () => {
  it('nests children under their parent and preserves list order', () => {
    const newerChild = task('c2', 'Chapter 2', 'p');
    const parent = task('p', 'Reading');
    const olderChild = task('c1', 'Chapter 1', 'p');
    const groups = groupTasksByParent([newerChild, parent, olderChild]);

    expect(groups).toHaveLength(1);
    expect(groups[0].root.id).toBe('p');
    expect(groups[0].children.map((child) => child.id)).toEqual(['c2', 'c1']);
  });

  it('keeps multiple roots in encounter order', () => {
    const groups = groupTasksByParent([task('b', 'Workout'), task('a', 'Reading')]);
    expect(groups.map((group) => group.root.id)).toEqual(['b', 'a']);
  });

  it('promotes an orphan child to a root', () => {
    const groups = groupTasksByParent([task('c', 'Chapter 1', 'missing')]);
    expect(groups).toHaveLength(1);
    expect(groups[0].root.id).toBe('c');
    expect(groups[0].children).toEqual([]);
  });
});
