# ADR-0001: Modular monolith over microservices

**Status:** Accepted

## Context

HabitTracker has several distinct business capabilities (users, tasks, more to come) that
benefit from clear ownership and boundaries. The two obvious shapes are separate microservices
or one process. The team is small, and the domain is still moving; cross-service infrastructure
(network calls, distributed transactions, independent deployment pipelines, service discovery)
is overhead we cannot justify yet, but we also don't want a big ball of mud that's impossible to
split later.

## Decision

Build a **modular monolith**: one deployable ASP.NET Core host with internals partitioned into
self-contained modules. Enforce module boundaries in-process (separate projects, `internal`
types, Contracts-only references) so the seams are real even though everything ships together.

## Consequences

**Easier**
- In-process calls — no network, no serialization, no distributed-transaction problems.
- One build, one deploy, one place to run and debug.
- Boundaries are explicit and compiler-enforced, so a module can be extracted into a service
  later with the Contracts surface as the ready-made API.

**Harder**
- Discipline is on us: nothing physically stops a bad reference except code review and the
  rules in [ARCHITECTURE.md](../ARCHITECTURE.md). (No architecture-test fitness functions yet.)
- All modules scale together; no per-module independent scaling or deployment.
- A module fault can take down the whole process.
