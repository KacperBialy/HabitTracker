# Step 5 — README + cleanup (1:40–2:00)

## 1. Screenshot

Existing screenshots live in `docs/screenshots/` and are referenced from the README's
`## Screenshots` section. Match the convention:

1. Generate a few minutes of traffic so the panels aren't flat lines.
2. Grafana → the HabitTracker dashboard → time range **Last 1 hour**, kiosk mode (`d` then `k`)
   for a clean shot.
3. Save as `docs/screenshots/grafana-dashboard.png`.

## 2. README `## Observability` section

Insert **after `## Architecture`, before `## Getting started`** — it is a system property,
not a getting-started step.

```markdown
## Observability

HabitTracker is instrumented with **OpenTelemetry** and ships a full local metrics stack.

- **ASP.NET Core** — request rate, error rate, latency histograms, per-route breakdown.
- **.NET runtime** — GC, CPU, threadpool, memory.
- **EF Core / Npgsql** — database command duration.
- **Custom business metrics** — `habittracker_tasks_created_total`,
  `habittracker_time_logs_created_total`, `habittracker_tracked_minutes_total` and friends,
  recorded inside the Tasks module so they follow domain operations rather than HTTP calls.

Metrics are exposed in Prometheus format at `/api/metrics`, scraped by **Prometheus**, and
visualized in **Grafana** — datasource and dashboard are provisioned from
[`observability/`](observability/), so `docker compose up` brings the whole stack up ready to use.

| Service | URL |
|---|---|
| App | http://localhost:8080 |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3000 (anonymous viewer; admin/admin to edit) |

![Grafana dashboard](docs/screenshots/grafana-dashboard.png)
```

Also add one line to `## Tech stack`:

```markdown
- **Observability** — OpenTelemetry metrics (ASP.NET Core, runtime, EF Core, custom business counters) → Prometheus → Grafana.
```

Note the `/api/metrics` endpoint is unauthenticated — fine for a local compose stack on an
internal network; say so in one clause rather than pretending otherwise.

## 3. CLAUDE.md

Add the new ports to the Docker line in the command block:

```
docker compose up  # app :8080, postgres :5432, prometheus :9090, grafana :3000
```

And a short paragraph under **Architecture** describing where the metrics class lives
(`HabitTracker.SharedKernel/Observability/HabitTrackerMetrics.cs`) and the rule: **modules
record business metrics; the host owns the exporter.** Future-you will otherwise put a
counter in an endpoint.

## 4. ADR-0009

The ADRs run 0001–0008 and the README/CLAUDE.md both index them. Add
`HabitTracker/Docs/Adr/0009-opentelemetry-metrics.md` following the existing format
(read 0007 for the shape) covering:

- **Context** — no runtime visibility; wanted infra + product telemetry.
- **Decision** — OpenTelemetry with a Prometheus scrape endpoint on the host; business
  metrics recorded in modules via a SharedKernel `HabitTrackerMetrics`; no OTel Collector.
- **Consequences** — modules gain a SharedKernel dependency for metrics (they already had
  one); a collector can be slotted in later without touching call sites; traces deferred;
  scrape endpoint is anonymous.

Then add it to the ADR list in `HabitTracker/Docs/Adr/README.md` and the `## ADRs` line in
`CLAUDE.md`.

## 5. Final verification

```bash
docker compose down -v          # prove provisioning works from scratch
docker compose up --build -d
dotnet build
dotnet test
cd frontend && npm test         # only if step 4 option A touched the frontend
```

Then click through: app loads, create a task, log time, Prometheus target UP, every Grafana
panel including Product Metrics has data.

## 6. Commit

Split into reviewable commits rather than one blob:

```
feat: add OpenTelemetry metrics with Prometheus exporter
feat: add Prometheus and Grafana to docker compose
feat: record HabitTracker business metrics in Tasks module
docs: document observability stack and add ADR-0009
```

Subject lines imperative, <= 60 chars, no trailing period.

## Done when

- Fresh `docker compose down -v && up` yields a working dashboard with no manual steps.
- README renders the screenshot and the section reads correctly.
- Build + tests green, work committed.
