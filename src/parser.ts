import type { MetricKind, MetricSample, MetricSnapshot } from "./types.js";

const MAX_BYTES = 5_000_000;
const MAX_LINES = 200_000;
const SAMPLE = /^([a-zA-Z_:][a-zA-Z0-9_:]*)(?:\{([^}]*)\})?\s+([-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?)\s*$/;
const LABEL = /^([a-zA-Z_][a-zA-Z0-9_]*)="((?:\\.|[^"\\])*)"$/;

function parseLabels(raw: string | undefined): Record<string, string> {
  if (!raw) return {};
  const labels: Record<string, string> = {};
  for (const token of raw.split(",")) {
    const match = token.trim().match(LABEL);
    if (!match) throw new Error(`invalid label expression: ${token}`);
    if (labels[match[1]]) throw new Error(`duplicate label: ${match[1]}`);
    labels[match[1]] = match[2].replaceAll('\\"', '"').replaceAll("\\\\", "\\");
  }
  return labels;
}

export function parsePrometheusText(text: string): MetricSnapshot {
  if (Buffer.byteLength(text, "utf8") > MAX_BYTES) throw new Error("metrics input exceeds 5 MB");
  const kinds = new Map<string, MetricKind>();
  const helps = new Map<string, string>();
  const metrics: MetricSample[] = [];
  const lines = text.split(/\r?\n/);
  if (lines.length > MAX_LINES) throw new Error("metrics input exceeds 200,000 lines");
  for (const line of lines) {
    if (!line.trim()) continue;
    if (line.startsWith("# HELP ")) {
      const [, name, help] = line.match(/^# HELP (\S+)\s*(.*)$/) ?? [];
      if (name) helps.set(name, help);
      continue;
    }
    if (line.startsWith("# TYPE ")) {
      const [, name, kind] = line.match(/^# TYPE (\S+)\s+(counter|gauge|histogram|summary|untyped)$/) ?? [];
      if (name) {
        const normalized: MetricKind = kind === "summary" || kind === "untyped" ? "unknown" : kind as MetricKind;
        kinds.set(name, normalized);
      }
      continue;
    }
    if (line.startsWith("#")) continue;
    const match = line.match(SAMPLE);
    if (!match) throw new Error(`invalid metric sample: ${line.slice(0, 160)}`);
    const value = Number(match[3]);
    if (!Number.isFinite(value)) throw new Error(`non-finite metric value: ${match[3]}`);
    metrics.push({ name: match[1], labels: parseLabels(match[2]), value, kind: kinds.get(match[1]) ?? "unknown", help: helps.get(match[1]) });
  }
  return { metrics };
}

export function normalizeSnapshot(snapshot: MetricSnapshot): MetricSnapshot {
  const metrics = [...snapshot.metrics].sort((a, b) => `${a.name}:${JSON.stringify(a.labels)}`.localeCompare(`${b.name}:${JSON.stringify(b.labels)}`));
  return { ...snapshot, metrics };
}
