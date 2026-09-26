import { groupTasksByParent } from './task-tree';
import { Task } from './models';
import { TaskColor } from './task-colors';

function task(
  id: string,
  name: string,
  parentTaskId: string | null = null,
  position = 0,
  createdAt = '2026-01-01T00:00:00Z',
): Task {
  return { id, name, createdAt, color: TaskColor.Slate, parentTaskId, position };
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

  it('sorts roots and children by position regardless of input order', () => {
    const groups = groupTasksByParent([
      task('c1', 'Chapter 1', 'p', 1),
      task('b', 'Workout', null, 1),
      task('c0', 'Chapter 0', 'p', 0),
      task('c2', 'Chapter 2', 'p', 2),
      task('p', 'Reading', null, 0),
    ]);

    expect(groups.map((group) => group.root.id)).toEqual(['p', 'b']);
    expect(groups[0].children.map((child) => child.id)).toEqual(['c0', 'c1', 'c2']);
  });

  it('breaks position ties newest first', () => {
    const groups = groupTasksByParent([
      task('old', 'Older', null, 0, '2026-01-01T00:00:00Z'),
      task('new', 'Newer', null, 0, '2026-02-01T00:00:00Z'),
      task('oldChild', 'Older child', 'old', 0, '2026-01-01T00:00:00Z'),
      task('newChild', 'Newer child', 'old', 0, '2026-02-01T00:00:00Z'),
    ]);

    expect(groups.map((group) => group.root.id)).toEqual(['new', 'old']);
    expect(groups[1].children.map((child) => child.id)).toEqual(['newChild', 'oldChild']);
  });

  it('promotes an orphan child to a root', () => {
    const groups = groupTasksByParent([task('c', 'Chapter 1', 'missing')]);
    expect(groups).toHaveLength(1);
    expect(groups[0].root.id).toBe('c');
    expect(groups[0].children).toEqual([]);
  });
});
