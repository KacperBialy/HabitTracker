# ADR-0003: One Postgres schema and DbContext per module

**Status:** Accepted

## Context

Modules need to persist data. Sharing one `DbContext`/schema across modules would recreate the
coupling [ADR-0001](0001-modular-monolith.md) and [ADR-0002](0002-contracts-boundary.md) are
trying to avoid: shared migrations, cross-module foreign keys, and entities leaking across
boundaries. But we still want one database instance for operational simplicity.

## Decision

Each module owns:

- its own `DbContext` (`UsersDbContext`, `TasksDbContext`), `internal sealed`;
- a dedicated **Postgres schema** (`UsersDbContext.Schema = "users"`, `TasksDbContext.Schema = "tasks"`);
- its **own** `__EFMigrationsHistory` table **within that schema**, so migrations are independent;
- a connection string resolved per module (key `Users` → fallback `Default`; key `Tasks`, required).

All schemas live in one Postgres database. Design-time migrations use a per-module
`IDesignTimeDbContextFactory` with a hardcoded localhost connection. Strongly typed IDs map to
the DB via EF value converters; entities use private setters + static factories, with a
parameterless ctor only for EF materialization.

## Consequences

**Easier**
- No cross-module tables or FKs — boundaries hold at the data layer too.
- Each module migrates on its own timeline; no shared migration history to coordinate.
- Still one database to run, back up, and connect to.

**Harder**
- No DB-enforced referential integrity across modules (e.g. a task's `OwnerId` is not FK-checked
  against `users`) — integrity is the application's job. See [ADR-0005](0005-tasks-uses-opaque-ownerid.md).
- Cross-module reporting requires joining across schemas or composing in the app, not a single query.
- Connection-string config and a `DbContextFactory` are per-module boilerplate.
- The hardcoded factory connection is dev-only; production must supply real connection strings.
