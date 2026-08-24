import { describe, expect, it } from "vitest";
import { analyze } from "../src/analyze.js";
import { normalizeSnapshot, parsePrometheusText } from "../src/parser.js";
import { toJson, toMarkdown, toSarif } from "../src/report.js";

const baseline = { metrics: [
  { name: "requests_total", labels: { route: "/users", status: "200" }, value: 1, kind: "counter" as const },
  { name: "requests_total", labels: { route: "/orders", status: "200" }, value: 2, kind: "counter" as const },
] };
const proposed = { metrics: [
  ...baseline.metrics,
  { name: "requests_total", labels: { route: "/users/42", status: "200" }, value: 3, kind: "counter" as const },
  { name: "requests_total", labels: { route: "/users/43", status: "200" }, value: 4, kind: "counter" as const },
  { name: "new_metric", labels: { user_id: "42" }, value: 1, kind: "gauge" as const },
] };
const config = { failOn: "error" as const, rules: [{ metric: "requests_total", maxSeries: 2, maxCardinality: { route: 2 } }, { metric: "*", forbiddenLabels: ["user_id"] }] };

describe("SignalBudget", () => {
  it("parses Prometheus exposition and preserves kinds", () => {
    const snapshot = parsePrometheusText("# HELP http_requests_total Requests\n# TYPE http_requests_total counter\nhttp_requests_total{method=\"GET\",route=\"/users\"} 3\n");
    expect(snapshot.metrics[0]).toMatchObject({ name: "http_requests_total", kind: "counter", labels: { method: "GET" } });
  });

  it("rejects malformed samples and duplicate labels", () => {
    expect(() => parsePrometheusText("broken line")).toThrow("invalid metric sample");
    expect(() => parsePrometheusText("m{a=\"1\",a=\"2\"} 1")).toThrow("duplicate label");
  });

  it("normalizes metric order deterministically", () => {
    const snapshot = normalizeSnapshot({ metrics: [...baseline.metrics].reverse() });
    expect(snapshot.metrics[0].labels.route).toBe("/orders");
  });

  it("finds series and label budget violations", () => {
    const report = analyze(baseline, proposed, config);
    expect(report.verdict).toBe("fail");
    expect(report.findings.some((item) => item.code === "SERIES_BUDGET")).toBe(true);
    expect(report.findings.some((item) => item.code === "LABEL_CARDINALITY")).toBe(true);
    expect(report.findings.some((item) => item.code === "NEW_METRIC")).toBe(true);
  });

  it("detects forbidden labels and removed metrics", () => {
    const report = analyze(proposed, baseline, config);
    expect(report.findings.some((item) => item.code === "REMOVED_METRIC")).toBe(true);
    const forbidden = analyze(baseline, { metrics: [{ name: "x", labels: { user_id: "1" }, value: 1, kind: "gauge" }] }, config);
    expect(forbidden.findings.some((item) => item.code === "FORBIDDEN_LABEL")).toBe(true);
  });

  it("renders stable JSON Markdown and SARIF", () => {
    const report = analyze(baseline, proposed, config);
    expect(toJson(report)).toContain('"schemaVersion": "1"');
    expect(toMarkdown(report)).toContain("SignalBudget report");
    expect(toSarif(report)).toContain('"version": "2.1.0"');
  });

  it("passes when budgets are satisfied", () => {
    const report = analyze(baseline, baseline, { failOn: "error", rules: [{ metric: "requests_total", maxSeries: 5 }] });
    expect(report.verdict).toBe("pass");
  });
});
