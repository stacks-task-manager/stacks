// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { pathToFileURL } from "node:url";
import type { Fixture } from "./fixtures";
import type { ReportRow } from "./report";

export function formatDuration(ms: number): string {
    const seconds = Math.max(0, Math.round(ms / 1000));
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m ${seconds % 60}s`;
}

/** Prevent model text from emitting terminal control sequences; full text stays in the reports. */
export function terminalText(value: unknown, limit = 1600): string {
    const text = String(value ?? "")
        .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "")
        .replace(/[\x00-\x08\x0b-\x1f\x7f-\x9f]/g, "");
    return text.length > limit ? `${text.slice(0, limit)}… [truncated; full content in report]` : text;
}

export class EvaluationTerminal {
    private readonly startedAt: number;
    constructor(
        private readonly planned: number,
        private readonly fixtures: number,
        private readonly runs: number,
        private readonly write: (line: string) => void = line => console.error(line),
        private readonly now: () => number = () => performance.now()
    ) {
        this.startedAt = now();
    }
    start(model: string, disableThinking: boolean, timeoutMs: number, htmlPath: string, jsonPath?: string) {
        this.write(`\nStacks LLM evaluation | ${terminalText(model)}`);
        this.write(
            `${this.fixtures} prompts × ${this.runs} repetitions = ${this.planned} runs | sequential | no automatic retries`
        );
        this.write(
            `Thinking: ${
                disableThinking ? "disable requested (server support required)" : "server default"
            } | timeout: ${formatDuration(timeoutMs)} per run`
        );
        this.write(`HTML: ${htmlPath}${jsonPath ? `\nJSON: ${jsonPath}` : ""}`);
        this.write(
            "Ctrl+C stops the suite. Finished attempts are saved; the current in-flight run is not.\n"
        );
    }
    reportSaved(htmlPath: string, jsonPath?: string) {
        this.write(`  Latest HTML report: ${htmlPath}`);
        this.write(`  Open report: ${pathToFileURL(htmlPath).href}`);
        if (jsonPath) this.write(`  Latest JSON report: ${jsonPath}`);
    }
    begin(
        fixture: Fixture,
        run: number,
        completed: number,
        topics: string[],
        toolCount: number,
        payloadBytes: number
    ) {
        this.write(
            `\n[${completed + 1}/${this.planned}] ${terminalText(fixture.id)} | ${
                fixture.suite
            } | repetition ${run}/${this.runs}`
        );
        this.write(`  ASK: ${terminalText(fixture.request)}`);
        const expected = [fixture.tool, ...(fixture.requiredTools ?? [])].filter(Boolean).join(", ");
        this.write(
            `  EXPECT: ${
                expected || (fixture.clarification ? "clarification; no mutation" : "safe response")
            } ${fixture.expected ? terminalText(JSON.stringify(fixture.expected), 700) : ""}`
        );
        if (fixture.prohibited?.length || fixture.prohibitedTools?.length)
            this.write(
                `  FORBIDDEN: ${[...(fixture.prohibited ?? []), ...(fixture.prohibitedTools ?? [])].join(
                    ", "
                )}`
            );
        if (fixture.history?.length || fixture.route)
            this.write(
                `  CONTEXT: ${fixture.history?.length ?? 0} history messages${
                    fixture.route ? ` | route ${terminalText(JSON.stringify(fixture.route), 300)}` : ""
                }`
            );
        this.write(
            `  Topics: ${topics.join(", ")} | exposed tools: ${toolCount} | payload: ${(
                payloadBytes / 1024
            ).toFixed(1)} KiB`
        );
    }
    tool(name: string, input: unknown) {
        this.write(`  TOOL → ${terminalText(name)} ${terminalText(JSON.stringify(input), 700)}`);
    }
    toolResult(name: string, output: unknown, error?: string) {
        const choice = output && typeof output === "object" && "type" in output && output.type === "choice";
        this.write(
            `  TOOL ← ${terminalText(name)}: ${
                error
                    ? `ERROR ${terminalText(error, 500)}`
                    : choice
                    ? "choice/confirmation requested; no action executed"
                    : "synthetic result returned"
            }`
        );
        if (choice && "question" in output) this.write(`  CHOICE: ${terminalText(output.question, 900)}`);
    }
    step(index: number, reason: string, toolCount: number) {
        this.write(`  Model step ${index} finished | ${terminalText(reason)} | ${toolCount} tool calls`);
    }
    waiting(start: number, timeoutMs: number, steps: number, tools: number) {
        const elapsed = this.now() - start;
        this.write(
            `  Waiting… ${formatDuration(elapsed)} in this run | ${formatDuration(
                Math.max(0, timeoutMs - elapsed)
            )} until timeout | ${steps} finished steps, ${tools} tool calls | suite elapsed ${formatDuration(
                this.now() - this.startedAt
            )}`
        );
    }
    finish(row: ReportRow, rows: ReportRow[], consecutiveErrors: number) {
        const status = row.error
            ? "PROVIDER ERROR (quality unmeasured)"
            : row.passed
            ? "PASS (assertions)"
            : "FAIL (assertions)";
        this.write(`  ${status} | inference ${formatDuration(row.latencyMs)} (${row.latencyMs} ms)`);
        if (row.responseText.trim()) this.write(`  RESPONSE: ${terminalText(row.responseText)}`);
        else
            this.write(
                `  RESPONSE: ${
                    row.calls.some(
                        c =>
                            c.output &&
                            typeof c.output === "object" &&
                            "type" in c.output &&
                            c.output.type === "choice"
                    )
                        ? "choice widget only; see CHOICE above and report"
                        : "no completed plain-text response"
                }`
            );
        for (const reason of row.reasons) this.write(`  - ${terminalText(reason, 500)}`);
        const attempts = rows.filter(r => r.fixture === row.fixture);
        this.write(
            `  This prompt: ${attempts.filter(r => !r.passed).length} failed / ${
                attempts.length
            } attempted (${attempts.filter(r => r.error).length} provider errors).`
        );
        if (consecutiveErrors)
            this.write(`  Consecutive provider errors: ${consecutiveErrors}/3; the suite stops at 3.`);
        this.summary(rows);
        if (row.error)
            this.write(
                "  Check inference availability if errors continue; /models alone does not prove readiness."
            );
        else if (!row.passed)
            this.write(
                "  The model responded. Inspect the failure reasons; assertion failures do not stop the suite."
            );
    }
    summary(rows: ReportRow[], finalStatus?: string) {
        const elapsed = this.now() - this.startedAt;
        const passed = rows.filter(r => r.passed).length;
        const providerErrors = rows.filter(r => r.error).length;
        const assertionFailures = rows.filter(r => !r.passed && !r.error).length;
        const fraction = this.planned ? rows.length / this.planned : 0;
        const bar = "#".repeat(Math.round(fraction * 20)).padEnd(20, "-");
        const eta = rows.length
            ? formatDuration((elapsed / rows.length) * (this.planned - rows.length))
            : "not available yet";
        this.write(
            `  [${bar}] ${(fraction * 100).toFixed(1)}% | ${rows.length}/${
                this.planned
            } | passed ${passed} | assertion failures ${assertionFailures} | provider errors ${providerErrors}`
        );
        this.write(
            `  Elapsed ${formatDuration(elapsed)}${
                finalStatus
                    ? ` | ${finalStatus} | unevaluated ${this.planned - rows.length}`
                    : ` | estimated remaining ${eta} (rough; prompt complexity varies)`
            }`
        );
        if (finalStatus) {
            const failed = Array.from(new Set(rows.filter(r => !r.passed).map(r => r.fixture)));
            this.write(
                `  Prompts with failures: ${failed.length}/${
                    new Set(rows.map(r => r.fixture)).size
                } attempted prompts`
            );
            for (const id of failed.slice(0, 10)) {
                const attempts = rows.filter(r => r.fixture === id);
                this.write(
                    `  ${terminalText(id)}: ${attempts.filter(r => !r.passed).length}/${
                        attempts.length
                    } failed`
                );
            }
            if (failed.length > 10) this.write("  More failed prompts are listed in the reports.");
        }
    }
}
