# Architecture Decision Records

Each ADR captures **why** a significant structural decision was made — context, decision, and
consequences — so the reasoning survives the people who made it. ADRs are immutable once
Accepted; to change a decision, write a new ADR that supersedes the old one.

| # | Title | Status |
|---|-------|--------|
| [0001](0001-modular-monolith.md) | Modular monolith over microservices | Accepted |
| [0002](0002-contracts-boundary.md) | Public API via a separate Contracts project | Accepted |
| [0003](0003-schema-per-module.md) | One Postgres schema and DbContext per module | Accepted |
| [0004](0004-in-process-domain-events.md) | In-process, handler-based domain events | Accepted |
| [0005](0005-tasks-uses-opaque-ownerid.md) | Tasks owns work by opaque `Guid ownerId`, not `UserId` | Accepted |
| [0006](0006-time-logging-inside-tasks.md) | Manual time logging lives inside the Tasks module | Accepted |
| [0007](0007-http-endpoints-in-host.md) | HTTP endpoints live in the host, not in modules | Accepted |
| [0008](0008-same-origin-spa.md) | Angular SPA served same-origin by the host | Accepted |

## Format

```
# ADR-NNNN: Title
Status: Proposed | Accepted | Superseded by ADR-MMMM
Context: the situation that forced a choice
Decision: what we chose
Consequences: what gets easier, what gets harder
```
