# Security policy

SignalBudget treats metric exposition and snapshots as untrusted input. Parsing is bounded by bytes and line count, labels are validated, values must be finite, and the tool never contacts a telemetry backend in the core. The project does not ingest raw request parameters; only metric names and label values are analyzed.

Do not commit production payloads, tokens, or private endpoint data. Report suspected vulnerabilities privately through GitHub security reporting with the affected version, impact, and minimal reproduction.
