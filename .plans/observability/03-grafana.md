# Step 3 — Grafana (0:45–1:15)

Grafana in compose, Prometheus datasource + dashboard **provisioned from files** so the
work is in git and survives a `docker compose down -v`. Working > beautiful.

## 1. Compose service

```yaml
  grafana:
    image: grafana/grafana:11.5.1
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_AUTH_ANONYMOUS_ENABLED=true
      - GF_AUTH_ANONYMOUS_ORG_ROLE=Viewer
      - GF_USERS_DEFAULT_THEME=light
    volumes:
      - ./observability/grafana/provisioning:/etc/grafana/provisioning:ro
      - ./observability/grafana/dashboards:/var/lib/grafana/dashboards:ro
      - grafana-data:/var/lib/grafana
    ports:
      - "3000:3000"
    depends_on:
      - prometheus
```

Plus `grafana-data:` under top-level `volumes:`. Anonymous viewer access keeps the README
screenshot honest and lets anyone clone-and-look without credentials.

## 2. Datasource: `observability/grafana/provisioning/datasources/prometheus.yml`

```yaml
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    uid: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
```

Pin `uid: prometheus` — the dashboard JSON references it by uid, and an auto-generated uid
would break the panels.

## 3. Dashboard provider: `observability/grafana/provisioning/dashboards/dashboards.yml`

```yaml
apiVersion: 1
providers:
  - name: HabitTracker
    type: file
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
      foldersFromFilesStructure: false
```

`allowUiUpdates: true` so you can tweak panels in the browser without Grafana fighting you.

## 4. The dashboard itself

Fastest honest path — **build it in the UI, then export**:

1. New dashboard → add the panels below.
2. Share → Export → **Export for sharing externally: OFF** (keeps the `prometheus` uid
   instead of turning it into a `${DS_}` input).
3. Save the JSON to `observability/grafana/dashboards/habittracker.json`.
4. `docker compose restart grafana` and confirm it loads from the file.

Panels (all against the Prometheus datasource):

| Panel | Type | PromQL |
|---|---|---|
| Request rate | timeseries | `sum(rate(http_server_request_duration_seconds_count[5m]))` |
| Error rate | timeseries | `sum(rate(http_server_request_duration_seconds_count{http_response_status_code=~"5.."}[5m])) / sum(rate(http_server_request_duration_seconds_count[5m]))` |
| Latency P50/P95 | timeseries | `histogram_quantile(0.50, sum by (le) (rate(http_server_request_duration_seconds_bucket[5m])))` and the same with `0.95` |
| Requests by endpoint | timeseries | `sum by (http_route) (rate(http_server_request_duration_seconds_count[5m]))` |
| CPU | timeseries | `rate(process_cpu_seconds_total[5m])` |
| Memory | timeseries | `process_runtime_dotnet_gc_heap_size_bytes` (fall back to `process_working_set_bytes`) |
| GC collections | timeseries | `sum by (gen) (rate(process_runtime_dotnet_gc_collections_count[5m]))` |
| DB command duration P95 | timeseries | `histogram_quantile(0.95, sum by (le) (rate(db_client_operation_duration_seconds_bucket[5m])))` |

**Metric names drift between OTel versions.** Do not trust this table blindly — type the
prefix into Grafana's metric browser and take what autocomplete offers. Set the error-rate
panel unit to `percentunit` and the latency panels to `s`.

Leave an empty row named **Product Metrics** at the bottom — step 4 fills it.

## 5. Verify

```bash
docker compose up -d
open http://localhost:3000
```

Generate load, then confirm every panel draws a line. A panel showing "No data" is a
finding, not a cosmetic issue — fix the query now.

## Done when

- Grafana starts with the datasource and dashboard already present (no manual clicking
  after a fresh `docker compose down -v && docker compose up`).
- All 8 infra panels have data.
- `observability/grafana/dashboards/habittracker.json` is committed.
