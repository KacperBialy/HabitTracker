# ADR-0006: Manual time logging lives inside the Tasks module

**Status:** Accepted

## Context

Manual time logging records a duration against a task for a chosen calendar date (backfillable;
the safety net for an interrupted timer). The project convention is "one business capability =
one module" ([ADR-0001](0001-modular-monolith.md), glossary), so the default instinct is a new
`TimeLogs` module with its own schema and `DbContext`.

But a time log is intrinsically *about a task*: it has no meaning without one, every query is
scoped by the same `ownerId`, and we want a real foreign key so deleting a task removes its logs.
A standalone module couldn't have that FK — [ADR-0003](0003-schema-per-module.md) forbids
cross-schema foreign keys, leaving us the same "no referential integrity" gap that
[ADR-0005](0005-tasks-uses-opaque-ownerid.md) accepts for Tasks↔Users. Validating task ownership
would also become a cross-module `ITaskService` call instead of a local query.

## Decision

Time logging lives **inside the Tasks module** — same `TasksDbContext`, same `tasks` schema.

- `TimeLogEntry` is a domain entity in Tasks with a real FK to `TaskItem`
  (`ON DELETE CASCADE`); `LogTime` validates task existence + ownership with a local query, no
  cross-module hop.
- The public surface is a **separate interface**, `ITaskTimeLogService` (not folded into
  `ITaskService`), so the task lifecycle and time-logging concerns stay distinct even though they
  share a module and `DbContext`. Both are registered by `AddTasksModule`.
- No new module, schema, or `DbContext`; no new cross-module edge.

## Consequences

**Easier**
- **Referential integrity + cascade delete** between a log and its task — unavailable to a
  standalone module under [ADR-0003](0003-schema-per-module.md).
- Ownership validation is a local `db.Tasks.AnyAsync(...)`, not an `ITaskService` call across a
  Contracts boundary.
- One schema, one migration history, one transaction for task-and-log writes.

**Harder**
- The Tasks module now owns two capabilities, so it grows past a single responsibility — the
  bound on this is the separate `ITaskTimeLogService` interface, not a project split.
- If time logging ever needs to stand alone (its own service, scaling, or reuse by another
  module), extracting it means a schema split and trading the FK for the opaque-id pattern of
  [ADR-0005](0005-tasks-uses-opaque-ownerid.md). Record that move as a new ADR superseding this
  one.
