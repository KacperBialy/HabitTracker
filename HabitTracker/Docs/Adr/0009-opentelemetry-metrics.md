# ADR-0009: OpenTelemetry metrics with a Prometheus scrape endpoint

**Status:** Accepted

## Context

The application had no runtime visibility. Nothing answered "is it up", "how slow is the task
list", "how often does a request 500", or "how much time are people actually logging" without
attaching a debugger or reading the database by hand. Two different kinds of questions were wanted:

- **Infrastructure** — request rate, error rate, latency, GC and threadpool pressure, database
  command duration. Standard signals, already emitted by the framework.
- **Product** — tasks created, entries logged, minutes tracked, timer vs. manual. These are
  domain facts, not HTTP facts: a time log can arrive from the timer or from the manual form, and
  "one task created" is a business event whose count should not depend on how many endpoints
  happen to create tasks.

.NET already exposes the infrastructure signals through `System.Diagnostics.Metrics`, so the real
decisions were how to export them and where the product counters are allowed to live.

Where to record product metrics was the sharper question, because the obvious place is wrong.
Recording them in the host's endpoints ([ADR-0007](0007-http-endpoints-in-host.md)) keeps modules
free of any telemetry dependency, but it measures the *transport*: a task created by a future
background job, CLI, or message consumer would never be counted, and the counter silently means
"tasks created over HTTP" while being named `tasks_created`.

## Decision

Instrument with **OpenTelemetry**, exporting in Prometheus text format from the host, and record
business metrics **inside the modules**.

- The host owns the exporter. `AddObservability()` (`HabitTracker.Infrastructure`) registers the
  ASP.NET Core, HttpClient, runtime, EF Core and Npgsql instrumentation plus the `HabitTracker`
  meter, and maps the Prometheus scrape endpoint at `/api/metrics`.
- Business metrics live in **SharedKernel** — `HabitTracker.SharedKernel.Observability.HabitTrackerMetrics`
  wraps an `IMeterFactory` meter and exposes intention-revealing methods (`TaskCreated`,
  `TimeLogged`). Module application services call those methods after the operation succeeds.
  The rule: **modules record business metrics; the host owns the exporter.**
- **No OTel Collector.** Prometheus scrapes the app directly. Collector, OTLP push, and a
  hosted backend are all deployment concerns that OpenTelemetry lets us change later without
  touching a single call site.
- **Metrics only; traces deferred.** Distributed tracing buys little in a single-process monolith
  with one database; the `AddOpenTelemetry()` builder is already there when it does.
- Prometheus and Grafana run in `compose.yaml`, with the datasource and dashboard provisioned
  from [`observability/`](../../../observability/) so the stack comes up ready to use.

## Consequences

**Easier**
- Product and infrastructure questions are answerable from one dashboard, from a cold
  `docker compose up`, with no manual Grafana setup to redo or document.
- Business counters follow domain operations, so they stay correct as new delivery mechanisms
  are added — a task created by a future job counts exactly like one created over HTTP.
- The backend is unchanged in shape: an exporter swap (OTLP to a collector, or a hosted backend)
  is a change in `ObservabilityExtensions` alone.

**Harder**
- Module impl projects now touch SharedKernel for metrics. They already referenced it for domain
  events ([ADR-0004](0004-in-process-domain-events.md)), so this widens an existing dependency
  rather than adding one — but it does mean a module is no longer purely EF + Contracts.
- Metric names and tags are a public contract with the dashboards. Renaming a counter or changing
  a tag's cardinality breaks panels; tags stay bounded (`color`, `source`) and never carry ids.
- `/api/metrics` is **anonymous** — no authorization is required on it, so anything that can
  reach the app can read the counters. This makes reachability the control: locally the whole
  stack is on the compose network, and in production Prometheus publishes no ports, so the
  endpoint is only reachable from inside. Any future host that exposes the app directly has to
  keep that endpoint off the public surface.
