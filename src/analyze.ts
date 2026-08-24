import { createHash } from "node:crypto";
import type { BudgetConfig, BudgetReport, Finding, MetricSample, MetricSnapshot } from "./types.js";

function groups(snapshot: MetricSnapshot): Map<string, MetricSample[]> {
  const output = new Map<string, MetricSample[]>();
  for (const sample of snapshot.metrics) output.set(sample.name, [...(output.get(sample.name) ?? []), sample]);
  return output;
}

function finding(code: Finding["code"], severity: Finding["severity"], metric: string, message: string, remediation: string, label?: string): Finding {
  const seed = `${code}|${metric}|${label ?? ""}|${message}`;
  return { id: createHash("sha256").update(seed).digest("hex").slice(0, 16), code, severity, metric, label, message, remediation };
}

export function analyze(baseline: MetricSnapshot, proposed: MetricSnapshot, config: BudgetConfig): BudgetReport {
  const baselineGroups = groups(baseline);
  const proposedGroups = groups(proposed);
  const findings: Finding[] = [];
  for (const [metric, samples] of proposedGroups) {
    const rule = config.rules.find((item) => item.metric === metric || item.metric === "*");
    const series = samples.length;
    if (!baselineGroups.has(metric)) findings.push(finding("NEW_METRIC", "info", metric, "metric is new in the proposed snapshot", "Document ownership and assign a cardinality budget before rollout."));
    if (rule?.maxSeries !== undefined && series > rule.maxSeries) findings.push(finding("SERIES_BUDGET", "error", metric, `series count ${series} exceeds budget ${rule.maxSeries}`, "Reduce dimensions, aggregate upstream, or raise the budget with evidence."));
    const labels = new Set(samples.flatMap((sample) => Object.keys(sample.labels)));
    for (const label of labels) {
      const values = new Set(samples.map((sample) => sample.labels[label]).filter((value): value is string => value !== undefined));
      const limit = rule?.maxCardinality?.[label];
      if (limit !== undefined && values.size > limit) findings.push(finding("LABEL_CARDINALITY", "error", metric, `label ${label} has cardinality ${values.size}, above budget ${limit}`, "Replace unbounded identifiers with bounded categories or drop the label.", label));
      if (rule?.forbiddenLabels?.includes(label)) findings.push(finding("FORBIDDEN_LABEL", "error", metric, `label ${label} is forbidden by policy`, "Remove the label or create a reviewed exception with a bounded alternative.", label));
    }
  }
  for (const metric of baselineGroups.keys()) if (!proposedGroups.has(metric)) findings.push(finding("REMOVED_METRIC", "warning", metric, "metric is absent from the proposed snapshot", "Confirm dashboards and alerts no longer depend on this metric before rollout."));
  findings.sort((a, b) => a.id.localeCompare(b.id));
  const threshold = config.failOn === "error" ? "error" : config.failOn === "warning" ? "warning" : "info";
  const rank = { info: 0, warning: 1, error: 2 };
  const verdict = findings.some((item) => rank[item.severity] >= rank[threshold]) ? "fail" : findings.some((item) => item.severity === "warning") ? "warn" : "pass";
  return { schemaVersion: "1", verdict, baseline: { metricCount: baselineGroups.size, seriesCount: baseline.metrics.length }, proposed: { metricCount: proposedGroups.size, seriesCount: proposed.metrics.length }, findings };
}
