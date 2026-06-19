# ADR-0007: HTTP endpoints live in the host, not in modules

**Status:** Accepted

## Context

Each module today is an impl project (Domain, Application, Persistence) plus a Contracts project
([ADR-0002](0002-contracts-boundary.md)). The impl projects reference EF Core + Npgsql and nothing
of the web framework — a module knows how to *do* task operations, not how they reach it over the
wire. They are transport-agnostic by construction.

When we added the Tasks HTTP surface, we had to choose where the minimal-API endpoints
(`MapPost("/api/tasks", ...)`) and their `app`/`HttpContext`/`IEndpointRouteBuilder` references
live. Three options:

1. **In the host** — the host's `Endpoints/` maps routes against each module's Contracts.
2. **In the module impl** — a `Map<Name>Endpoints` extension beside `Add<Name>Module`. This
   requires adding `<FrameworkReference Include="Microsoft.AspNetCore.App" />` to the impl project.
3. **In a third per-module presentation project** (`...Tasks.Api`) referencing Contracts + the
   framework, leaving impl pure.

Option 2 was tried first and is what surfaced the trade-off: it makes the impl project the *first*
business module to depend on ASP.NET, breaking the transport-agnostic property and making Tasks
asymmetric with Users (which has no web reference). The tell was the framework reference itself —
the endpoint handlers only ever touched **Contracts** types (`ITaskService`, `CreateTaskRequest`,
`TaskId`), never the module's `internal` services, so there was no reason for them to share the
impl assembly.

`HabitTracker.Authentication` does map its own endpoints with a framework reference, but that is
not precedent for business modules: Auth is an infrastructure/composition project whose whole job
(OIDC, cookies, challenge/sign-out) is intrinsically web. Web coupling there is the capability;
web coupling in a *business* module is incidental — HTTP is one delivery mechanism for task
operations, not part of what a task is.

## Decision

HTTP endpoints live **in the host** (`HabitTracker/Endpoints/`), mapped against module
**Contracts** only.

- Module impl projects stay transport-agnostic — EF/Npgsql + Contracts + SharedKernel, **no
  ASP.NET reference**. Symmetric across Users, Tasks, and future modules.
- The host maps routes via `Map<Name>Endpoints` extensions (e.g. `TaskEndpoints`) that inject the
  module's Contracts services and translate to/from HTTP. The host already composes modules via
  `Add<Name>Module` in `Program.cs`; owning the HTTP face is the same composition-root role.
- `ClaimsPrincipal.GetUserId()` stays in the host (`HabitTracker.Infrastructure`) next to the
  endpoints that use it. Because endpoints are host-owned, no module needs it, so there is no
  reason to push it down into SharedKernel.
- Option 3 (separate `.Api` project per module) is rejected as too much ceremony for this
  codebase's size; revisit only if the host's `Endpoints/` becomes unwieldy.

## Consequences

**Easier**
- Modules remain transport-agnostic: an impl project could be driven by a different host (gRPC,
  message consumer, CLI) without change and never compiles against the web framework.
- All modules are symmetric — no "this one knows it's a web app" special case.
- Endpoints touch only the Contracts boundary, so the host gains no access to module internals;
  the boundary that ADR-0002 draws is exactly the boundary the HTTP layer talks through.

**Harder**
- The host's `Endpoints/` grows by one file per module, and a module's HTTP shape is edited in the
  host rather than next to the module. This is centralization, not a layering violation — every
  edit is still against Contracts.
- A module is not fully self-contained: shipping a new module means also adding its endpoints in
  the host. If the host's endpoint surface ever becomes a maintenance burden, the migration path
  is the per-module `.Api` project (option 3), recorded as a new ADR superseding this one.
