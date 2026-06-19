# Glossary

Canonical definitions for terms that cross module boundaries. The **Owner** column names the
module that defines the concept; other modules must use it as defined here.

| Term | Owner | Definition |
|------|-------|------------|
| **Module** | — | A self-contained business capability: two projects (`HabitTracker.Modules.<Name>` impl + `.Contracts` public API), its own `DbContext`, its own Postgres schema, and an `Add<Name>Module` extension. |
| **Contracts** | — | A module's public API project. The only thing other projects may reference. Holds service interfaces, DTOs, strongly-typed IDs, and domain events. |
| **Subject** | Users | The OIDC `sub` claim — the stable, provider-issued identifier for a login. The natural key by which a `User` is upserted. Distinct from `UserId`. |
| **UserId** | Users | The system's own identity for a user: a `Guid` (v7) wrapped in a `readonly record struct`. Generated on registration. |
| **uid** | Authentication / host | A cookie claim carrying the registered user's id, added at `OnTokenValidated`. Read by host endpoints via `ClaimsPrincipal.GetUserId()` to scope requests. The bridge between an authenticated principal and a module's `ownerId`. |
| **Owner / OwnerId** | Tasks | The `Guid` that owns a task. Deliberately **opaque** — Tasks does not import `UserId` and does not depend on Users. In practice the host passes the authenticated user's id, but the coupling is by convention, not by type. See [ADR-0005](adr/0005-tasks-uses-opaque-ownerid.md). |
| **Register** | — | The static factory convention for creating a domain entity (`User.Register(...)`, `TaskItem.Register(...)`). Entities have private setters and no public constructor; the parameterless ctor exists only for EF. |
| **Domain event** | SharedKernel | An `IDomainEvent` record describing something that has happened in a module's domain (e.g. `UserRegistered`). Published in-process after `SaveChangesAsync`; other modules react via `IDomainEventHandler<T>`. |
| **Schema** | — | The Postgres schema a module owns (`users`, `tasks`), including its own `__EFMigrationsHistory` table. One schema per module; no shared tables. |
| **Strongly-typed ID** | — | A `readonly record struct` wrapping a `Guid` (e.g. `UserId`, `TaskId`), with a `New()` factory using `Guid.CreateVersion7()`, mapped to the DB via an EF value converter. |

## Notes on ambiguous terms

- **"User" vs. "Owner"** — a Task's *owner* is, by deployment convention, a registered *user*,
  but the Tasks module has no notion of "user." It only knows an `OwnerId : Guid`. Don't
  introduce a `UserId` dependency into Tasks without a decision recorded as an ADR.
- **"Subject" vs. "UserId"** — both identify a user. `Subject` is external (from the IdP);
  `UserId` is internal (ours). Authentication looks users up/creates them by `Subject`; everything
  downstream uses `UserId` / `uid`.
