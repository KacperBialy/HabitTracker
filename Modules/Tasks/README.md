# Tasks module

## Responsibility

Owns a per-owner list of tasks. Supports create, list, rename, and delete, all scoped to an
**owner**. An owner is identified by an opaque `Guid` — the module deliberately knows nothing
about Users or how owners are authenticated.

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

### DTOs & requests

```csharp
record CreateTaskRequest(string Name);
record RenameTaskRequest(string Name);
record TaskDto(TaskId Id, Guid OwnerId, string Name, DateTimeOffset CreatedAt);
```

### Strongly-typed ID

```csharp
readonly record struct TaskId(Guid Value);   // TaskId.New() => Guid.CreateVersion7()
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

See the project-wide [glossary](../../docs/glossary.md).

## What it does NOT do

- No notion of "user," login, or authentication — only an opaque `OwnerId`.
- No authorization beyond owner-scoping every query/command by `ownerId`.
- No scheduling, recurrence, completion/streak tracking (despite "HabitTracker" — out of scope today).
- No cross-task or cross-owner queries.

## Persistence & local dev

- **Schema:** `tasks` (own `__EFMigrationsHistory` in that schema).
- **`DbContext`:** `TasksDbContext` (internal).
- **Connection string key:** `Tasks` (**required — no fallback**; the module throws if missing).
- **Migrations:** `Migrations/` (initial: `InitialTasks`).
- **Constraints:** non-unique index on `OwnerId`; max length Name 200.

```bash
dotnet ef migrations add <Name> --project Modules/Tasks/HabitTracker.Modules.Tasks
dotnet ef database update        --project Modules/Tasks/HabitTracker.Modules.Tasks
```

Design-time migrations use `TasksDbContextFactory` with a hardcoded localhost connection
(`Host=localhost;Database=habittracker;Username=postgres;Password=postgres`).

## How it's exposed over HTTP

The **host** (not this module) maps the REST surface in `HabitTracker/Endpoints/TaskEndpoints.cs`,
deriving `ownerId` from the authenticated principal's `uid` claim via `ClaimsPrincipal.GetUserId()`:

| Method | Route | `ITaskService` call |
|--------|-------|---------------------|
| POST | `/api/tasks/` | `Create` |
| GET | `/api/tasks/` | `ListForOwner` |
| PUT | `/api/tasks/{id:guid}` | `Rename` |
| DELETE | `/api/tasks/{id:guid}` | `Delete` |

All require authorization.
