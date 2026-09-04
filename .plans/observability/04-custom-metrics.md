# Step 4 — Custom HabitTracker metrics (1:15–1:40)

The portfolio-relevant part: business telemetry, distinct from infra telemetry. Recorded
**inside the Tasks module**, so the counters follow real domain operations rather than HTTP
calls.

## Which metrics

| Instrument | Type | Recorded in | Notes |
|---|---|---|---|
| `habittracker.tasks.created` | Counter\<long\> | `TaskService.Create` | tag: `color` |
| `habittracker.tasks.deleted` | Counter\<long\> | `TaskService.Delete` (only when it returns true) | replaces the plan's `tasks_completed` — the domain has no "complete" |
| `habittracker.time_logs.created` | Counter\<long\> | `TaskTimeLogService.LogTime` (after `SaveChangesAsync`) | |
| `habittracker.tracked.minutes` | Counter\<long\> | same call site | `Add(request.Minutes)` |
| `habittracker.timer.sessions` | Counter\<long\> | `TaskTimeLogService.LogTime` | tag `source=timer\|manual` — see below |

The Prometheus exporter renames these to `habittracker_tasks_created_total` etc. — dots
become underscores and counters gain `_total`. Write the OTel-style dotted names in C#; use
the underscored names in PromQL.

### On `timer.sessions`

The timer is frontend-only (`ActiveTimerService`) — the backend cannot tell a stopwatch stop
from a manual entry. Two options, pick one:

- **A (recommended, ~5 min):** add `bool FromTimer` to `LogTimeRequest` (default `false`),
  set it in `ActiveTimerService` when it posts on stop, and tag the counter with it.
  Touches: `Contracts/Requests/LogTimeRequest.cs`, `frontend/src/app/core/models.ts`
  (handwritten mirror — must be updated by hand), the frontend call site, and any test that
  constructs a `LogTimeRequest`.
- **B (0 min):** drop this metric, ship four. Four real metrics beat five where one lies.

Do A only if the clock allows; it is the last thing in this step, not the first.

## 1. New file: `HabitTracker.SharedKernel/Observability/HabitTrackerMetrics.cs`

SharedKernel is already referenced by every module and has no ASP.NET dependency —
`System.Diagnostics.Metrics` is in the BCL, so **no new package reference is needed anywhere**.

```csharp
using System.Diagnostics.Metrics;

namespace HabitTracker.SharedKernel.Observability;

public sealed class HabitTrackerMetrics
{
    public const string MeterName = "HabitTracker";

    private readonly Counter<long> tasksCreated;
    private readonly Counter<long> tasksDeleted;
    private readonly Counter<long> timeLogsCreated;
    private readonly Counter<long> trackedMinutes;

    public HabitTrackerMetrics(IMeterFactory meterFactory)
    {
        var meter = meterFactory.Create(MeterName);

        tasksCreated = meter.CreateCounter<long>(
            "habittracker.tasks.created", unit: "{task}", description: "Tasks created.");
        tasksDeleted = meter.CreateCounter<long>(
            "habittracker.tasks.deleted", unit: "{task}", description: "Tasks deleted.");
        timeLogsCreated = meter.CreateCounter<long>(
            "habittracker.time_logs.created", unit: "{entry}", description: "Time log entries created.");
        trackedMinutes = meter.CreateCounter<long>(
            "habittracker.tracked.minutes", unit: "min", description: "Total minutes logged against tasks.");
    }

    public void TaskCreated(TaskColorTag color) => tasksCreated.Add(1, new KeyValuePair<string, object?>("color", color.Value));
    public void TaskDeleted() => tasksDeleted.Add(1);

    public void TimeLogged(int minutes)
    {
        timeLogsCreated.Add(1);
        trackedMinutes.Add(minutes);
    }
}
```

`TaskColorTag` is a placeholder — SharedKernel must not reference Tasks.Contracts. Simplest
fix: make the parameter a plain `string colorName` and pass `request.Color.ToString()` from
the module. Do that rather than inventing a wrapper type.

`IMeterFactory` is registered by `AddOpenTelemetry()`/the generic host automatically; you
just need `services.AddSingleton<HabitTrackerMetrics>()`.

## 2. Registration

In `Modules/Tasks/HabitTracker.Modules.Tasks/TasksModule.cs`, inside `AddTasksModule`:

```csharp
services.AddSingleton<HabitTrackerMetrics>();
```

Use `TryAddSingleton` (`Microsoft.Extensions.DependencyInjection.Extensions`) if you expect
another module to register it too. Right now only Tasks does — plain `AddSingleton` is fine.

## 3. Call sites

Both services use primary constructors — add the parameter there:

```csharp
internal sealed class TaskService(TasksDbContext db, /* ... */, HabitTrackerMetrics metrics)
internal sealed class TaskTimeLogService(TasksDbContext db, TimeProvider clock, HabitTrackerMetrics metrics)
```

Record **after** `SaveChangesAsync` succeeds — a counter incremented before a failed commit
lies. In `LogTime`, that means after the existing `await db.SaveChangesAsync(ct);` and before
`return entry.ToDto();`:

```csharp
metrics.TimeLogged(request.Minutes);
```

In `Delete`, only on the `true` path. In `Create`, after the save, with
`request.Color.ToString()` as the tag.

Note `TaskService` also touches `IMemoryCache` (`TaskCacheKeys`) — read the file before
editing the constructor; the parameter list above is illustrative.

## 4. Register the meter with OpenTelemetry

Back in `HabitTracker/Infrastructure/ObservabilityExtensions.cs`, replace the TODO:

```csharp
.AddMeter(HabitTrackerMetrics.MeterName)
```

**Without this line the counters exist and are never exported.** This is the single most
likely thing to go wrong in this step.

## 5. Grafana: Product Metrics row

Fill the row left empty in step 3:

| Panel | Type | PromQL |
|---|---|---|
| Tasks created (rate) | timeseries | `sum(rate(habittracker_tasks_created_total[5m]))` |
| Tasks created by color | piechart / bar | `sum by (color) (increase(habittracker_tasks_created_total[24h]))` |
| Time logs created | timeseries | `sum(rate(habittracker_time_logs_created_total[5m]))` |
| Minutes tracked (24h) | stat | `sum(increase(habittracker_tracked_minutes_total[24h]))` |
| Avg minutes per log (24h) | stat | `sum(increase(habittracker_tracked_minutes_total[24h])) / sum(increase(habittracker_time_logs_created_total[24h]))` |

Re-export the dashboard JSON over `observability/grafana/dashboards/habittracker.json`.

## 6. Verify

```bash
dotnet build && dotnet test
docker compose up --build -d
```

Then create a task and log time through the UI, and:

```bash
curl -s localhost:8080/api/metrics | grep habittracker
```

Counters must appear **only after** the first operation — OTel does not emit a counter that
has never been incremented. A zero-traffic scrape showing nothing is correct behavior, not a bug.

## Done when

- `dotnet test` passes (integration tests resolve the new singleton — if DI throws, the
  registration is missing from `AddTasksModule`).
- `habittracker_*_total` series visible in Prometheus after exercising the app.
- Product Metrics row has data and is committed in the dashboard JSON.
