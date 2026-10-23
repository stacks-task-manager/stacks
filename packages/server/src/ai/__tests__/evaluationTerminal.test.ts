// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, expect, it } from "vitest";
import { EvaluationTerminal, formatDuration, terminalText } from "../../../scripts/ai-eval/terminal";
import type { ReportRow } from "../../../scripts/ai-eval/report";
const row: ReportRow = {
    fixture: "listProjects",
    run: 1,
    suite: "tools",
    request: "List my projects",
    responseText: "Website",
    passed: true,
    reasons: [],
    calls: [],
    latencyMs: 1500,
};
describe("evaluation terminal progress", () => {
    it("formats long durations and removes terminal control sequences", () => {
        expect(formatDuration(1500)).toBe("2s");
        expect(formatDuration(65000)).toBe("1m 5s");
        expect(formatDuration(3661000)).toBe("1h 1m 1s");
        expect(terminalText("\u001b[31mHello\u001b[0m\r\u0007")).toBe("Hello");
        expect(terminalText("abcdef", 3)).toContain("abc… [truncated");
    });
    it("shows the prompt, response, cumulative counts and rough ETA", () => {
        let now = 0;
        const lines: string[] = [];
        const terminal = new EvaluationTerminal(
            6,
            2,
            3,
            line => lines.push(line),
            () => now
        );
        terminal.start("Qwen", true, 60000, "/report.html", "/report.json");
        terminal.begin(
            {
                id: "listProjects",
                locale: "en",
                suite: "tools",
                request: "List my projects",
                tool: "listProjects",
            },
            1,
            0,
            ["projects"],
            10,
            1024
        );
        now = 10000;
        terminal.waiting(0, 60000, 1, 2);
        terminal.finish(row, [row], 0);
        const output = lines.join("\n");
        for (const expected of [
            "[1/6]",
            "ASK: List my projects",
            "RESPONSE: Website",
            "PASS (assertions)",
            "16.7%",
            "passed 1",
            "estimated remaining 50s",
            "50s until timeout",
            "no automatic retries",
        ])
            expect(output).toContain(expected);
    });
    it("distinguishes provider errors, assertion failures and repeated prompt failures", () => {
        const lines: string[] = [];
        const terminal = new EvaluationTerminal(
            6,
            2,
            3,
            line => lines.push(line),
            () => 0
        );
        const failure = { ...row, passed: false, reasons: ["Expected tool: listProjects"] };
        const providerError = {
            ...row,
            run: 2,
            responseText: "",
            passed: false,
            error: "Timed out",
            reasons: ["Provider error: Timed out"],
        };
        terminal.finish(providerError, [failure, providerError], 1);
        terminal.summary([failure, providerError], "INCOMPLETE: provider errors");
        const output = lines.join("\n");
        for (const expected of [
            "quality unmeasured",
            "assertion failures 1",
            "provider errors 1",
            "2 failed / 2 attempted",
            "Consecutive provider errors: 1/3",
            "unevaluated 4",
            "listProjects: 2/2 failed",
        ])
            expect(output).toContain(expected);
    });
    it("reports choice widgets without claiming writes executed", () => {
        const lines: string[] = [];
        const terminal = new EvaluationTerminal(1, 1, 1, line => lines.push(line));
        const choice = { type: "choice", question: "Confirm creating Draft?" };
        terminal.tool("createTask", { title: "Draft" });
        terminal.toolResult("createTask", choice);
        terminal.finish(
            { ...row, responseText: "", calls: [{ name: "createTask", input: {}, output: choice }] },
            [row],
            0
        );
        expect(lines.join("\n")).toContain("no action executed");
        expect(lines.join("\n")).toContain("Confirm creating Draft?");
        expect(lines.join("\n")).toContain("choice widget only");
    });
    it("prints the saved HTML path, encoded file link and optional JSON path", () => {
        const lines: string[] = [];
        const terminal = new EvaluationTerminal(1, 1, 1, line => lines.push(line));
        terminal.reportSaved("/tmp/AI reports/current.html", "/tmp/AI reports/current.json");
        expect(lines.join("\n")).toContain("Latest HTML report: /tmp/AI reports/current.html");
        expect(lines.join("\n")).toContain("file:///tmp/AI%20reports/current.html");
        expect(lines.join("\n")).toContain("Latest JSON report: /tmp/AI reports/current.json");
    });
});
