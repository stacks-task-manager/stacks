// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, expect, it } from "vitest";
import { renderEvaluationHtml, EvaluationReport } from "../../../scripts/ai-eval/report";
import { parseOptions } from "../../../scripts/ai-eval/scoring";
const report: EvaluationReport = {
    model: "Qwen",
    status: "complete",
    planned: 1,
    disableThinking: true,
    temperature: 0,
    rows: [
        {
            fixture: "summary",
            run: 1,
            suite: "interpretation",
            request: "Summarize Planning",
            responseText: "Alex will finish onboarding on Friday",
            passed: true,
            reasons: [],
            calls: [],
            latencyMs: 42,
            expectations: { responseAll: ["Alex", "Friday"] },
        },
    ],
};
describe("HTML evaluation report", () => {
    it("includes prompts, replies, expectations and review controls", () => {
        const html = renderEvaluationHtml(report);
        for (const text of [
            "Summarize Planning",
            "Alex will finish",
            "Expected behavior",
            "Disable requested",
            "Export your review",
            "Review notes",
            "Assertions passed",
        ])
            expect(html).toContain(text);
        expect(html).not.toMatch(/<script[^>]+src=|<link[^>]+href=/);
    });
    it("escapes model content and tool output instead of rendering it as HTML", () => {
        const payload = '<img src=x onerror="alert(1)"><script>alert(1)</script>';
        const html = renderEvaluationHtml({
            ...report,
            model: payload,
            rows: [
                {
                    ...report.rows[0],
                    request: payload,
                    responseText: payload,
                    calls: [{ name: "getTask", input: { query: payload }, output: { text: payload } }],
                },
            ],
        });
        expect(html).not.toContain("<img");
        expect(html).not.toContain("<script>alert(1)");
        expect(html).toContain("&lt;img");
    });
    it("marks provider errors and unevaluated cases without implying model quality", () => {
        const html = renderEvaluationHtml({
            ...report,
            status: "incomplete",
            planned: 3,
            rows: [
                {
                    ...report.rows[0],
                    passed: false,
                    error: "Timed out",
                    responseText: "",
                    reasons: ["Provider error"],
                },
            ],
        });
        expect(html).toContain("This report is incomplete");
        expect(html).toContain("No completed response recorded");
        expect(html).toContain("<strong>2</strong><span>Unevaluated runs");
    });
    it("shows confirmation widgets when there is no plain-text reply", () => {
        const html = renderEvaluationHtml({
            ...report,
            rows: [
                {
                    ...report.rows[0],
                    responseText: "",
                    calls: [
                        {
                            name: "createTask",
                            input: { title: "Draft" },
                            output: { type: "choice", question: "Confirm Draft?" },
                        },
                    ],
                },
            ],
        });
        expect(html).toContain("Confirm Draft?");
        expect(html).toContain("No plain-text reply");
    });
    it("supports an explicit HTML destination", () => {
        expect(parseOptions(["--html=review.html"]).html).toBe("review.html");
    });
});
