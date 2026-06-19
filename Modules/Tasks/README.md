# Tasks module

## Responsibility

Owns a per-owner list of tasks. Supports create, list, rename, and delete, all scoped to an
**owner**. An owner is identified by an opaque `Guid` — the module deliberately knows nothing
about Users or how owners are authenticated.

It also owns **manual time logging**: against any owned task a duration (in minutes) can be
logged for a specific calendar date. The date is caller-chosen and may be backfilled to a past
day — this is the safety net for when a timer is interrupted before it can record.

## Public API

Everything below lives in `HabitTracker.Modules.Tasks.Contracts`. It is the **only** part of
this module other projects may reference.

### `ITaskService`

```csharp
Task<TaskDto>                  Create(Guid ownerId, CreateTaskRequest request, CancellationToken ct = default);
Task<IReadOnlyList<TaskDto>>   ListForOwner(Guid ownerId, CancellationToken ct = default);
Task<bool>                     Rename(Guid ownerId, TaskId id, RenameTaskRequest request, CancellationToken ct = default);
Task<bool>                     Delete(Guid ownerId, TaskId id, CancellationToken ct = default);
```

`Rename` / `Delete` return `bool` — `false` when no task matches the `(ownerId, id)` pair.
Every method takes `ownerId`, so a caller can only ever act on its own tasks.

### `ITaskTimeLogService`

```csharp
Task<TimeLogDto?>                 LogTime(Guid ownerId, TaskId taskId, LogTimeRequest request, CancellationToken ct = default);
Task<IReadOnlyList<TimeLogDto>>   ListTimeLogs(Guid ownerId, TaskId taskId, CancellationToken ct = default);
Task<bool>                        DeleteTimeLog(Guid ownerId, TaskId taskId, TimeLogId id, CancellationToken ct = default);
```

A separate service from `ITaskService` to keep the task lifecycle and time-logging concerns
distinct, even though both live in this module and share `TasksDbContext`. Time logging lives
inside Tasks (rather than its own module) so a log can have a real FK to its task — see
[ADR-0006](../../docs/adr/0006-time-logging-inside-tasks.md).

- `LogTime` returns `null` when the duration is invalid **or** the task doesn't exist / isn't
  owned by `ownerId` — both map to `404` at the HTTP layer.
- `ListTimeLogs` returns the task's logs, newest `LogDate` first (ties broken by `Id`).
- `DeleteTimeLog` takes `taskId` as well as the log id: a log is only deleted through *its own*
  task's route, and only by its owner. Returns `false` when nothing matches the triple.

### DTOs & requests

```csharp
record CreateTaskRequest(string Name);
record RenameTaskRequest(string Name);
record TaskDto(TaskId Id, Guid OwnerId, string Name, DateTimeOffset CreatedAt);

record LogTimeRequest(int Minutes, DateOnly LogDate);
record TimeLogDto(TimeLogId Id, TaskId TaskId, Guid OwnerId, int Minutes, DateOnly LogDate);
```

`Minutes` must be `1..1440` (a single calendar day cannot hold more than 24h); `LogDate` is a
date with no time-of-day. Out-of-range durations are rejected.

### Strongly-typed IDs

```csharp
readonly record struct TaskId(Guid Value);      // TaskId.New()    => Guid.CreateVersion7()
readonly record struct TimeLogId(Guid Value);   // TimeLogId.New() => Guid.CreateVersion7()
```

### Domain events

**None.** Tasks neither publishes nor handles domain events today.

## Dependencies

- **`Tasks.Contracts`** — its own public API.
- **`SharedKernel`** — pulled in for consistency with the module template (no events used yet).

Consumes **no other module**. In particular it does **not** reference `Users.Contracts`;
ownership is an opaque `Guid`. See
[ADR-0005](../../docs/adr/0005-tasks-uses-opaque-ownerid.md).

## Key concepts (ubiquitous language)

- **Owner / OwnerId** — the `Guid` a task belongs to. Opaque; not a `UserId`. The host supplies
  the authenticated user's id, but that linkage is by convention, not by type.
- **TaskItem** — the domain entity (`TaskItem.Register(ownerId, name, now)` factory; `Rename(name)`).
- **TaskId** — strongly-typed task identifier (GUID v7).
- **TimeLogEntry** — the time-log domain entity (`TimeLogEntry.Log(taskId, ownerId, minutes, logDate)`
  factory, which enforces the `1..1440` minutes rule). Has a real FK to its `TaskItem`.
- **TimeLogId** — strongly-typed time-log identifier (GUID v7).
- **LogDate** — the calendar day a log applies to (caller-chosen, backfillable). Distinct from
  when the row was recorded — the module stores no separate "recorded at" timestamp.

See the project-wide [glossary](../../docs/glossary.md).

## What it does NOT do

- No notion of "user," login, or authentication — only an opaque `OwnerId`.
- No authorization beyond owner-scoping every query/command by `ownerId`.
- No scheduling, recurrence, completion/streak tracking (despite "HabitTracker" — out of scope today).
- No cross-task or cross-owner queries.
- **No timer.** Time logging is manual only — durations are submitted by the caller, not measured
  by the server. No editing a logged entry either (correct a mistake by deleting and re-adding).
- No aggregation/reporting over logged time (per-day or per-task totals).

## Persistence & local dev

- **Schema:** `tasks` (own `__EFMigrationsHistory` in that schema).
- **`DbContext`:** `TasksDbContext` (internal).
- **Connection string key:** `Tasks` (**required — no fallback**; the module throws if missing).
- **Tables:** `Tasks` and `TimeLogs` (both in the `tasks` schema).
- **Migrations:** `Migrations/` (`InitialTasks`, then `AddTimeLogs`).
- **Constraints:** `Tasks` — non-unique index on `OwnerId`, max length Name 200. `TimeLogs` —
  FK to `Tasks` (`ON DELETE CASCADE`, so deleting a task removes its logs), non-unique indexes
  on `TaskId` and `OwnerId`, `LogDate` stored as `date`.

```bash
dotnet ef migrations add <Name> --project Modules/Tasks/HabitTracker.Modules.Tasks
dotnet ef database update        --project Modules/Tasks/HabitTracker.Modules.Tasks
```

Design-time migrations use `TasksDbContextFactory` with a hardcoded localhost connection
(`Host=localhost;Database=habittracker;Username=postgres;Password=postgres`).

## How it's exposed over HTTP

The **host** (not this module) maps the REST surface in `HabitTracker/Endpoints/TaskEndpoints.cs`,
deriving `ownerId` from the authenticated principal's `uid` claim via `ClaimsPrincipal.GetUserId()`:

| Method | Route | Service call |
|--------|-------|--------------|
| POST | `/api/tasks/` | `ITaskService.Create` |
| GET | `/api/tasks/` | `ITaskService.ListForOwner` |
| PUT | `/api/tasks/{id:guid}` | `ITaskService.Rename` |
| DELETE | `/api/tasks/{id:guid}` | `ITaskService.Delete` |
| POST | `/api/tasks/{taskId:guid}/timelogs` | `ITaskTimeLogService.LogTime` |
| GET | `/api/tasks/{taskId:guid}/timelogs` | `ITaskTimeLogService.ListTimeLogs` |
| DELETE | `/api/tasks/{taskId:guid}/timelogs/{logId:guid}` | `ITaskTimeLogService.DeleteTimeLog` |

Time-log routes are nested under their task to express the relationship; the `{taskId}` segment
is real (it scopes the lookup), not decorative. All require authorization.
