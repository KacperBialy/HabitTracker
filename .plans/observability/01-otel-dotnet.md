# Step 1 — OpenTelemetry in the .NET API (0:00–0:20)

Wire OpenTelemetry metrics into the host and expose a Prometheus scrape endpoint at
`/api/metrics`. Nothing outside the app yet — success is `curl` returning text.

## 1. Packages

Add to `HabitTracker/HabitTracker.csproj` (host only — module projects stay ASP.NET-free):

```bash
dotnet add HabitTracker package OpenTelemetry.Extensions.Hosting
dotnet add HabitTracker package OpenTelemetry.Instrumentation.AspNetCore
dotnet add HabitTracker package OpenTelemetry.Instrumentation.Http
dotnet add HabitTracker package OpenTelemetry.Instrumentation.Runtime
dotnet add HabitTracker package OpenTelemetry.Exporter.Prometheus.AspNetCore
```

Notes:
- **EF Core needs no package.** On .NET 10, `Microsoft.EntityFrameworkCore` emits metrics on
  its own meter; we just add the meter by name (below). Do not go hunting for an
  `OpenTelemetry.Instrumentation.EntityFrameworkCore` metrics package — that one is traces.
- `Prometheus.AspNetCore` is pre-release; if `dotnet add` picks nothing, add
  `--prerelease`.
- **No EventCounters package.** It bridges legacy `EventCounter`s into OTel metrics, but on
  .NET 10 the same signals are published as native `Meter` instruments that the AspNetCore and
  Runtime packages already pick up — adding it gives you duplicate, differently-named series
  plus EventListener polling overhead. Only revisit if a third-party library exposes something
  *only* as an EventCounter.
- **`Instrumentation.Http` stays** even though nothing here calls `HttpClient` directly: the
  OIDC handler uses it internally for discovery-document fetches and the token exchange on
  `OnTokenValidated`. Without it those show up as unexplained gaps in the login path.

## 2. New file: `HabitTracker/Infrastructure/ObservabilityExtensions.cs`

Keeps `Program.cs` at the same altitude as the other `Add*` calls.

```csharp
namespace HabitTracker.Infrastructure;

public static class ObservabilityExtensions
{
    public const string ServiceName = "HabitTracker";

    public static IServiceCollection AddObservability(this IServiceCollection services)
    {
        services.AddOpenTelemetry()
            .ConfigureResource(resource => resource.AddService(ServiceName))
            .WithMetrics(metrics => metrics
                .AddAspNetCoreInstrumentation()
                .AddHttpClientInstrumentation()
                .AddRuntimeInstrumentation()
                .AddMeter("Microsoft.EntityFrameworkCore")
                .AddMeter("Npgsql")
                .AddPrometheusExporter());

        return services;
    }
}
```

Leave a `// TODO` for the custom meter — step 4 adds `.AddMeter(HabitTrackerMetrics.MeterName)`
right here.

## 3. `Program.cs`

- After `builder.Services.AddOidcAuthentication(...)`:
  ```csharp
  builder.Services.AddObservability();
  ```
- Map the scrape endpoint **before** `app.MapFallbackToFile("index.html")` — the fallback is
  mapped last on purpose and would otherwise swallow `/api/metrics`:
  ```csharp
  app.MapPrometheusScrapingEndpoint("/api/metrics");
  ```
  Place it next to `MapTaskEndpoints()`.
- The endpoint is **anonymous by design** (decision in the README). Do not chain
  `.RequireAuthorization()` — Prometheus has no cookie.
- Watch `UseHttpsRedirection()`: in compose the app is plain http on :8080 and Prometheus
  scrapes http. The existing `UseForwardedHeaders` handles this, but if the scrape returns
  307 in step 2, that redirect is the culprit.

## 4. Verify

```bash
dotnet build
dotnet run --project HabitTracker
# in another shell
curl -sk https://localhost:7252/api/metrics | head -40
```

Expect `# HELP` / `# TYPE` lines. Hit `/api/tasks` (or just the SPA root) a few times first,
then re-curl — ASP.NET Core histograms only appear once a request has been recorded.

## Done when

- `curl` returns Prometheus text format.
- You can see `http_server_request_duration_seconds_*` and `process_runtime_dotnet_gc_*`
  (exact names differ by version — grep loosely: `grep -E 'http_server|dotnet' `).
- `dotnet test` still passes (the metrics endpoint must not break `ApiFactory` SPA tests —
  if a fallback test now hits the metrics route, that is a real ordering bug, fix the map order).
