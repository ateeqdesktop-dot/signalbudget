import type { BudgetReport } from "./types.js";

export function toJson(report: BudgetReport): string { return `${JSON.stringify(report, null, 2)}\n`; }

export function toMarkdown(report: BudgetReport): string {
  const lines = [`# SignalBudget report: \`${report.verdict}\``, "", "| Scope | Metrics | Series |", "|---|---:|---:|", `| Baseline | ${report.baseline.metricCount} | ${report.baseline.seriesCount} |`, `| Proposed | ${report.proposed.metricCount} | ${report.proposed.seriesCount} |`, "", "## Findings", "", "| Severity | Code | Metric | Label | Message | Remediation |", "|---|---|---|---|---|---|"];
  for (const item of report.findings) lines.push(`| **${item.severity}** | \`${item.code}\` | \`${item.metric}\` | \`${item.label ?? "-"}\` | ${item.message} | ${item.remediation} |`);
  if (report.findings.length === 0) lines.push("| - | - | - | - | No findings | Budgets are satisfied. |");
  return `${lines.join("\n")}\n`;
}

export function toSarif(report: BudgetReport): string {
  return `${JSON.stringify({ version: "2.1.0", runs: [{ tool: { driver: { name: "SignalBudget", version: "0.1.0" } }, results: report.findings.map((item) => ({ ruleId: item.code, level: item.severity === "error" ? "error" : "warning", message: { text: item.message } })) }], }, null, 2)}\n`;
}
