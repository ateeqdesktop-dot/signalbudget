# SignalBudget

> Treat observability cardinality as a contract, not a surprise bill.

SignalBudget is a TypeScript/Node.js CLI that compares a committed telemetry baseline with a proposed snapshot and enforces budgets for metric series, per-label cardinality, and forbidden dimensions. It reads Prometheus exposition text or normalized JSON snapshots and emits deterministic JSON, Markdown, and SARIF-style findings for CI.

SignalBudget is not a dashboard, Prometheus exporter, or hosted metrics platform. Its product boundary is **repository-native telemetry governance before production**.

## Quick start

```bash
npm install
npm run build

node dist/cli.js analyze \
  --baseline fixtures/baseline.json \
  --proposed fixtures/proposed.json \
  --config fixtures/budget.json \
  --format markdown
```

The demo intentionally exits with status `1`: it adds a high-cardinality route dimension, exceeds the series budget, and introduces a forbidden `user_id` label.

## Parse Prometheus exposition

```bash
node dist/cli.js parse --input metrics.prom --output snapshot.json
```

The parser supports bounded Prometheus text input, `HELP` and `TYPE` metadata, quoted labels, counters, gauges, and histograms. It rejects malformed samples, duplicate labels, non-finite values, and oversized input instead of silently producing an incomplete contract.

## Budget contract

```json
{
  "failOn": "error",
  "rules": [
    {
      "metric": "http_requests_total",
      "maxSeries": 500,
      "maxCardinality": { "route": 50 },
      "forbiddenLabels": ["user_id"]
    }
  ]
}
```

## CI usage

```yaml
- name: Enforce telemetry budgets
  run: |
    npm ci
    npm run build
    node dist/cli.js analyze \
      --baseline observability/baseline.json \
      --proposed observability/proposed.json \
      --config observability/budget.json \
      --format sarif \
      --output signalbudget.sarif
```

The exit code is `0` for pass and warning-only results, and `1` when the configured severity threshold is violated. This makes cardinality drift reviewable in pull requests without a live Prometheus dependency.

## Why it exists

OpenTelemetry defines cardinality as the number of unique attribute combinations and explains that each combination consumes aggregation state. Existing exporters inspect an already-running Prometheus TSDB, while broad instrumentation scoring tools evaluate many quality dimensions. SignalBudget fills a narrower gap: a privacy-safe baseline/proposed contract with per-attribute budgets and deterministic diff findings before deployment.

## Architecture

The core contains a bounded exposition parser, normalized metric models, a baseline/proposed analyzer, a pure budget policy, and stable reporters. It has no network calls, no credentials, and no database. Future adapters can import OTLP protobuf, Prometheus API data, or cost models without changing the deterministic core.

## Development

```bash
npm run lint
npm run build
npm test
```

See [`docs/product-and-architecture.md`](docs/product-and-architecture.md), [`SECURITY.md`](SECURITY.md), and [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Roadmap

Planned extensions include OTLP protobuf ingestion, Prometheus API snapshots, cost estimation, historical budgets, GitHub annotations, Grafana integration, and framework-specific instrumentation adapters. The core will remain offline-first.

## License

Apache-2.0.
