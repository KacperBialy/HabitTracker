# Observability: .NET → OpenTelemetry → Prometheus → Grafana

Goal: automatic infra telemetry (ASP.NET Core, HTTP client, EF Core, .NET runtime) plus
custom HabitTracker business metrics, scraped by Prometheus and visualized in Grafana.

## Decisions taken up front

- **Exporter:** Prometheus scrape endpoint (`OpenTelemetry.Exporter.Prometheus.AspNetCore`)
  exposed at `/api/metrics` on the host. No OTel Collector — fewest moving parts.
- **Custom metrics site:** inside the Tasks module (`TaskService` / `TaskTimeLogService`),
  via a `HabitTrackerMetrics` singleton in `HabitTracker.SharedKernel`. Modules stay
  transport-agnostic — `System.Diagnostics.Metrics` only, no ASP.NET reference (ADR-0007).
- **`/api/metrics` auth:** anonymous. It is only reachable from the compose network in a
  real deployment; called out as a local-dev tradeoff in the README.
- **Traces:** out of scope for this 2h block. Metrics only. (Instrumentation packages
  bring tracing along; we just don't wire an exporter for it.)

## Flow

```mermaid
flowchart LR
    subgraph app["habittracker:8080 (.NET 10 host)"]
        direction TB
        subgraph modules["Modules (transport-agnostic)"]
            tasksvc["TaskService<br/>Create / Delete"]
            logsvc["TaskTimeLogService<br/>LogTime"]
        end
        metrics["HabitTrackerMetrics<br/><i>SharedKernel/Observability</i><br/>Meter &quot;HabitTracker&quot;"]
        infra["Auto-instrumentation<br/>ASP.NET Core · HttpClient<br/>Runtime · EF Core · Npgsql"]
        otel["AddObservability()<br/>OpenTelemetry MeterProvider"]
        scrape["GET /api/metrics<br/><i>anonymous, mapped before<br/>MapFallbackToFile</i>"]

        tasksvc -->|"Add(1, color)"| metrics
        logsvc -->|"Add(1) + Add(minutes)"| metrics
        metrics -->|".AddMeter(MeterName)"| otel
        infra -->|"AddXInstrumentation()"| otel
        otel -->|"Prometheus exporter"| scrape
    end

    prom["Prometheus :9090<br/><i>observability/prometheus/prometheus.yml</i><br/>job habittracker · scrape_interval 15s"]
    graf["Grafana :3000<br/>infra panels + Product Metrics row"]
    prov["Provisioning (git)<br/>datasource uid: prometheus<br/>dashboards/habittracker.json"]

    scrape -->|"scrape /api/metrics"| prom
    prom -->|"PromQL over HTTP<br/>http://prometheus:9090"| graf
    prov -.->|"mounted read-only at startup"| graf

    classDef step fill:#eef4ff,stroke:#3b6ea8,color:#12263f
    classDef store fill:#fff6e8,stroke:#b8791a,color:#3f2d12
    class tasksvc,logsvc,metrics,infra,otel,scrape step
    class prom,graf,prov store
```

Naming note: dotted OTel instrument names (`habittracker.tasks.created`) are exported as
`habittracker_tasks_created_total` — write dots in C#, underscores in PromQL.

## Steps

| # | File | Budget | Outcome |
|---|------|--------|---------|
| 1 | [01-otel-dotnet.md](01-otel-dotnet.md) | 0:00–0:20 | OTel wired in the host, `/api/metrics` serves text |
| 2 | [02-prometheus.md](02-prometheus.md) | 0:20–0:45 | Prometheus container scrapes the app |
| 3 | [03-grafana.md](03-grafana.md) | 0:45–1:15 | Grafana + provisioned datasource + infra dashboard |
| 4 | [04-custom-metrics.md](04-custom-metrics.md) | 1:15–1:40 | 5 business counters + Product Metrics panels |
| 5 | [05-readme-cleanup.md](05-readme-cleanup.md) | 1:40–2:00 | README section, screenshot, ADR, final verify |

Work them in order — each assumes the previous one is green.

## Definition of done for the whole block

- `docker compose up` brings up app + postgres + prometheus + grafana.
- Prometheus `/targets` shows `habittracker` **UP**.
- Grafana has one dashboard with infra panels *and* a Product Metrics row, provisioned
  from a file in the repo (not clicked in and lost).
- `dotnet build` and `dotnet test` pass.
- README has an `## Observability` section with a dashboard screenshot.
