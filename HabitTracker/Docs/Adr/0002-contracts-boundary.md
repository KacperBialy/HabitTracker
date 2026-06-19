# ADR-0002: Public API via a separate Contracts project

**Status:** Accepted

## Context

[ADR-0001](0001-modular-monolith.md) commits us to in-process modules with real boundaries. We
need a mechanism that lets one module call another without being able to touch its internals.
C#'s `internal` keyword is per-assembly, so the boundary has to be drawn at the project level.

## Decision

Every module is **two projects**:

- `HabitTracker.Modules.<Name>` — implementation. All types are `internal sealed`. Holds Domain,
  Application, Persistence.
- `HabitTracker.Modules.<Name>.Contracts` — the public API: service interfaces (`IUserService`),
  DTOs, strongly typed IDs (`UserId`), and domain events.

Other projects may reference **only** the `.Contracts` project. Cross-module calls go
interface-to-interface. The one allowed public type outside Contracts is a **domain event
record**, since handlers subscribe to it by type ([ADR-0004](0004-in-process-domain-events.md)).

## Consequences

**Easier**
- A module's internals are invisible and freely refactorable — only Contracts is a commitment.
- The Contracts project doubles as the extraction boundary if a module ever becomes a service.
- "What may I depend on?" has a one-word answer: Contracts.

**Harder**
- Two projects per module is more ceremony; a new module means scaffolding both.
- DTO/ID duplication at the boundary (Contracts `UserDto` vs. internal `User`) — entities expose a
  `ToDto()` mapper to bridge.
- The host must reference the **implementation** projects (to call `Add<Name>Module` for DI), so
  it alone sees more than Contracts — accepted, since the host is the composition root.
