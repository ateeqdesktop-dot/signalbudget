# Contributing

SignalBudget keeps parsing and policy evaluation deterministic and offline-first. Before opening a pull request, run `npm run lint`, `npm run build`, and `npm test`.

New input formats should normalize into `MetricSnapshot`. New policies should emit stable finding codes and actionable remediation. Parser changes need tests for valid metadata, malformed samples, duplicate labels, non-finite values, and input bounds. Do not add network access or raw production payloads to fixtures without a documented threat-model update.
