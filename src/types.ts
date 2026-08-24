export type MetricKind = "counter" | "gauge" | "histogram" | "unknown";
export type Severity = "error" | "warning" | "info";

export interface MetricSample {
  name: string;
  labels: Record<string, string>;
  value: number;
  kind: MetricKind;
  help?: string;
}

export interface MetricSnapshot {
  metrics: MetricSample[];
  generatedAt?: string;
}

export interface BudgetRule {
  metric: string;
  maxSeries?: number;
  maxCardinality?: Record<string, number>;
  forbiddenLabels?: string[];
}

export interface Finding {
  id: string;
  severity: Severity;
  metric: string;
  label?: string;
  code: "SERIES_BUDGET" | "LABEL_CARDINALITY" | "FORBIDDEN_LABEL" | "NEW_METRIC" | "REMOVED_METRIC";
  message: string;
  remediation: string;
}

export interface BudgetConfig {
  rules: BudgetRule[];
  failOn: Severity;
}

export interface BudgetReport {
  schemaVersion: "1";
  verdict: "pass" | "warn" | "fail";
  baseline: { metricCount: number; seriesCount: number };
  proposed: { metricCount: number; seriesCount: number };
  findings: Finding[];
}
