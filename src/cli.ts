import { readFileSync, writeFileSync } from "node:fs";
import { analyze } from "./analyze.js";
import { normalizeSnapshot, parsePrometheusText } from "./parser.js";
import { toJson, toMarkdown, toSarif } from "./report.js";
import type { BudgetConfig } from "./types.js";

function arg(name: string, fallback?: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function required(name: string): string { const value = arg(name); if (!value) throw new Error(`missing ${name}`); return value; }

function main(): void {
  const command = process.argv[2];
  if (command === "parse") {
    const snapshot = normalizeSnapshot(parsePrometheusText(readFileSync(required("--input"), "utf8")));
    writeFileSync(arg("--output", "-") === "-" ? "/dev/stdout" : arg("--output")!, JSON.stringify(snapshot, null, 2));
    return;
  }
  if (command !== "analyze") throw new Error("usage: signalbudget analyze --baseline file --proposed file --config file [--format markdown|json|sarif]");
  const baseline = JSON.parse(readFileSync(required("--baseline"), "utf8"));
  const proposed = JSON.parse(readFileSync(required("--proposed"), "utf8"));
  const config = JSON.parse(readFileSync(required("--config"), "utf8")) as BudgetConfig;
  const report = analyze(baseline, proposed, config);
  const format = arg("--format", "markdown");
  const output = format === "json" ? toJson(report) : format === "sarif" ? toSarif(report) : toMarkdown(report);
  const destination = arg("--output", "-");
  if (destination === "-") process.stdout.write(output); else writeFileSync(destination!, output);
  if (report.verdict === "fail") process.exitCode = 1;
}

try { main(); } catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 2; }
