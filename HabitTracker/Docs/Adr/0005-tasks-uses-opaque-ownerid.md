# ADR-0005: Tasks owns work by opaque `Guid ownerId`, not `UserId`

**Status:** Accepted

## Context

A task belongs to a user. The natural modeling instinct is for `ITaskService` to take a
`UserId` from `Users.Contracts`. But that would make the Tasks module reference the Users module
— the first cross-module dependency in the system — coupling task management to the identity
scheme and undermining [ADR-0001](0001-modular-monolith.md)/[ADR-0002](0002-contracts-boundary.md).

## Decision

`ITaskService` takes an **opaque `Guid ownerId`**:

```csharp
Task<TaskDto> Create(Guid ownerId, CreateTaskRequest request, CancellationToken ct = default);
// ...Rename/Delete/ListForOwner all owner-scoped by Guid
```

Tasks references **neither** Users impl nor `Users.Contracts`. The host bridges identity to
ownership: it reads the authenticated principal's `uid` claim via
`ClaimsPrincipal.GetUserId()` (`HabitTracker/Infrastructure/ClaimsPrincipalExtensions.cs`) and
passes that `Guid` to `ITaskService`. That extension is the anti-corruption seam between auth
identity and task ownership.

## Consequences

**Easier**
- Tasks stay fully decoupled — zero edges to Users. It can be reasoned about, tested, and
  extracted without any identity dependency.
- The owner could be any `Guid`-identified principal (a team, a service) later, not just a user.

**Harder**
- **No type safety on ownership** — `ownerId` is a bare `Guid`, so a caller could pass the wrong
  one; correctness rests on the host always sourcing it from `GetUserId()`.
- **No referential integrity:** nothing guarantees an `ownerId` corresponds to a real user
  (reinforced by [ADR-0003](0003-schema-per-module.md)'s no-cross-schema-FK stance). Orphaned
  tasks are possible if a user is deleted.
- Every `ITaskService` method must carry `ownerId` and scope by it — the contract can't lean on
  ambient identity.

If Tasks ever genuinely needs user data, prefer subscribing to a Users domain event
([ADR-0004](0004-in-process-domain-events.md)) or calling `IUserService` through Contracts over
adding a hard dependency — and record that change as a new ADR.
