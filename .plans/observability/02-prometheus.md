# Step 2 — Prometheus (0:20–0:45)

Add Prometheus to compose and get the `habittracker` target to **UP**.

## 1. New file: `observability/prometheus/prometheus.yml`

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: habittracker
    metrics_path: /api/metrics
    static_configs:
      - targets: ["habittracker:8080"]

  - job_name: prometheus
    static_configs:
      - targets: ["localhost:9090"]
```

`habittracker:8080` is the compose service name + container port — not `localhost`, not the
published `8080` on your Mac.

## 2. `compose.yaml`

Add the service:

```yaml
  prometheus:
    image: prom/prometheus:v3.1.0
    command:
      - --config.file=/etc/prometheus/prometheus.yml
      - --web.enable-lifecycle
    volumes:
      - ./observability/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus-data:/prometheus
    ports:
      - "9090:9090"
    depends_on:
      - habittracker
```

And under `volumes:` at the bottom, next to `postgres-data`:

```yaml
  prometheus-data:
```

`--web.enable-lifecycle` lets you `curl -X POST localhost:9090/-/reload` after editing the
config instead of restarting the container — worth the one line while iterating.

## 3. Make the app reachable over http

The app currently calls `app.UseHttpsRedirection()`. In the container there is no https
listener, so ASP.NET usually no-ops it — but if the scrape shows a 307 or the target is
DOWN with a redirect error, that is why. Fix by making the redirect development-only:

```csharp
if (app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
```

Only do this if you actually see the redirect. Don't pre-emptively change working code.

## 4. Verify

```bash
docker compose up --build -d
open http://localhost:9090/targets     # habittracker should be UP
```

Then in the Prometheus UI's expression browser, confirm data exists:

- `http_server_request_duration_seconds_count` — generate load first: refresh
  `http://localhost:8080` a few times, or `for i in $(seq 20); do curl -s localhost:8080 >/dev/null; done`
- `process_runtime_dotnet_gc_collections_count` (or `dotnet_gc_collections_total`,
  version-dependent — use the metric autocomplete rather than guessing)

## Troubleshooting

| Symptom | Cause |
|---|---|
| Target DOWN, `connection refused` | wrong port, or app container not healthy yet |
| Target DOWN, `404` | `metrics_path` typo, or `MapFallbackToFile` mapped before the metrics endpoint |
| Target UP but no app metrics | no traffic yet — hit the app |
| `context deadline exceeded` | app still running migrations on startup; re-scrape |

## Done when

- `/targets` shows `habittracker` UP with a recent "Last Scrape".
- At least one `http_server_*` series returns data in the expression browser.
