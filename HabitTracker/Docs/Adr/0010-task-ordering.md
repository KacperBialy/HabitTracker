# ADR-0010: User-set task order via an int `Position` per sibling group

**Status:** Accepted

## Context

Tasks were always listed newest first (`CreatedAt DESC`), and users had no way to change that.
Users want to set the order of their root tasks, and separately the order of each task's
subtasks. Manage Tasks and the dashboard should both show that order.

The lists are small. Each owner has a few dozen tasks at most. Each list belongs to a single
user and is never edited by anyone else, and subtasks are only one level deep (`CreateSubtask`
rejects a parent that is itself a subtask). Existing users must see the same order right after
the change ships.

## Decision

Store an **int `Position` on `tasks."Tasks"`**. It counts within a **sibling group**
`(OwnerId, ParentTaskId)`: all of an owner's roots form one group, and each root's subtasks
form their own group.

- **Reorder replaces the whole group.** `PUT /api/tasks/order` takes
  `{ parentTaskId, orderedTaskIds }`. `ITaskService.Reorder` checks that the ids are exactly the
  group's current tasks (none missing, none extra, no duplicates), then writes `0..n-1` in a single
  `SaveChangesAsync`. If the ids don't match, it returns 400. A stale client (one that
  missed a create or a delete in another tab) gets a 400 instead of silently leaving the order
  half-applied, and the UI then reloads the server's order.
- **New tasks go on top via `min(sibling Position) - 1`.** This keeps the existing newest-first
  behaviour without touching any other row. Positions can be negative because they are only
  used for sorting.
- **Order is `Position`, then `CreatedAt DESC`.** The tie-break keeps the order stable when
  two concurrent creates get the same position. Gaps left by deletes are fine, and the next
  reorder renumbers the group.
- **No backfill.** The migration adds the column with a default of `0`. Every existing task
  therefore ties, and the `CreatedAt DESC` tie-break gives exactly the old newest-first order.
  The first reorder of a group renumbers it.

### Rejected options

- **Fractional or lexorank positions.** These let a move rewrite a single row. They are built
  for long, shared, concurrently edited lists, and they need periodic rebalancing once the keys
  get too long or too close together. Our lists are short and have one owner, so rewriting the
  whole group costs nothing and leaves no rebalancing job to maintain.
- **A linked list (`PreviousTaskId`).** Reading the order needs a recursive query or an
  in-memory walk, and one broken link (for example from a partial write or a bad delete)
  corrupts the order for the whole group.
- **An index on `Position`.** Every query already filters by `OwnerId` (`IX_Tasks_OwnerId`).
  That leaves a few dozen rows, which sort instantly in memory. An index would only add write
  cost.
- **A unique constraint on `(OwnerId, ParentTaskId, Position)`.** Swapping two positions breaks
  it partway through the save unless the constraint is `DEFERRABLE`. Root rows have a `NULL`
  `ParentTaskId`, so it would also need `NULLS NOT DISTINCT`. The exact-ids check on reorder
  already prevents duplicate or missing positions within a group.

## Consequences

**Easier**
- Reordering is one request, one query and one save, and the server fully checks it. The
  client can't leave a group half-reordered.
- Creating a task still touches only one row, and the existing order carried over unchanged.
- The frontend sorts by `position` itself (`groupTasksByParent`), so it doesn't depend on the
  order the API returns the list in.

**Harder**
- **Moving a task to another parent, or promoting a subtask to a root, isn't supported.**
  That will need a new endpoint that takes the target parent and renumbers both groups in one
  save.
- The database doesn't enforce that positions are unique. Duplicates can appear, from
  concurrent creates or a direct SQL write, and only the `CreatedAt` tie-break keeps their
  order stable.
- Two tabs reordering the same group race each other, and the last write wins. This is
  acceptable for a single-user list, and a tab whose list is out of date recovers when it
  gets the 400.
