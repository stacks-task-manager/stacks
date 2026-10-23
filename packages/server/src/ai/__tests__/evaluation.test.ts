// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, expect, it } from "vitest";
import { parseOptions, scoreFixture } from "../../../scripts/ai-eval/scoring";
import { AI_TOOL_REGISTRY } from "../tools";
import { fixtures, expectedArguments } from "../../../scripts/ai-eval/fixtures";
import { template } from "../promptTemplate";

const normalize = (value: unknown) => value;
describe("manual model evaluation", () => {
    it("defaults to three runs and rejects invalid selectors and run counts", () => {
        expect(parseOptions([])).toMatchObject({ runs: 3, suite: "all" });
        expect(parseOptions(["--runs=1", "--suite=safety", "--output=report.json"]).runs).toBe(1);
        for (const args of [["--runs=0"], ["--runs=1.5"], ["--suite=typo"], ["--typo"]])
            expect(() => parseOptions(args)).toThrow();
    });
    it("renders the actual fixture request in the user prompt", () => {
        for (const fixture of fixtures)
            expect(template("client-chat.md", { newUserMessage: fixture.request }).trim()).toBe(
                fixture.request
            );
    });
    it("scores tool selection and arguments separately", () => {
        const fixture = {
            id: "test",
            locale: "en",
            request: "",
            tool: "updateTask",
            expected: { done: true },
        };
        const result = scoreFixture(fixture, [{ name: "updateTask", input: { done: false } }], normalize, "");
        expect(result).toMatchObject({ passed: false, toolCorrect: true, argumentsCorrect: false });
        expect(scoreFixture(fixture, [], normalize, "Done").toolCorrect).toBe(false);
    });
    it("detects forbidden fields on any repeated call", () => {
        const fixture = { id: "test", locale: "en", request: "", tool: "updateTask", prohibited: ["title"] };
        expect(
            scoreFixture(
                fixture,
                [
                    { name: "updateTask", input: { done: true } },
                    { name: "updateTask", input: { title: "Unexpected" } },
                ],
                normalize,
                ""
            ).safe
        ).toBe(false);
    });
    it("fails forbidden mutation attempts even if execution is stopped", () => {
        const fixture = { id: "test", locale: "en", request: "", prohibited: ["mutation"] };
        expect(
            scoreFixture(fixture, [{ name: "deleteTask", input: {}, invalid: true }], normalize, "").passed
        ).toBe(false);
    });
    it("requires clarification, nonempty output and successful provider responses", () => {
        const fixture = { id: "test", locale: "en", request: "", clarification: true };
        expect(scoreFixture(fixture, [], normalize, "").passed).toBe(false);
        expect(scoreFixture(fixture, [], normalize, "Which task?").passed).toBe(true);
        expect(scoreFixture(fixture, [{ name: "askUserChoice", input: {} }], normalize, "").passed).toBe(
            true
        );
        expect(scoreFixture(fixture, [], normalize, "Which task?", "timeout").passed).toBe(false);
    });
    it("categorizes every fixture and keeps ids unique", () => {
        expect(new Set(fixtures.map(f => f.id)).size).toBe(fixtures.length);
        expect(fixtures.every(f => ["tools", "safety", "interpretation"].includes(f.suite!))).toBe(true);
    });
});

describe("expanded scenario assertions", () => {
    it("checks required tools and prohibits competing actions", () => {
        const fixture = {
            id: "compound",
            locale: "en",
            request: "",
            requiredTools: ["listProjects", "listBookmarks"],
            prohibitedTools: ["navigate"],
        };
        expect(
            scoreFixture(fixture, [{ name: "listProjects", input: {} }], normalize, "Here are the projects")
                .passed
        ).toBe(false);
        expect(
            scoreFixture(
                fixture,
                [
                    { name: "listProjects", input: {} },
                    { name: "listBookmarks", input: {} },
                ],
                normalize,
                "Here are both lists"
            ).passed
        ).toBe(true);
        expect(scoreFixture(fixture, [{ name: "navigate", input: {} }], normalize, "").safe).toBe(false);
    });
    it("evaluates response grounding and missing explanations", () => {
        const fixture = {
            id: "summary",
            locale: "en",
            request: "",
            requireResponse: true,
            responseAll: ["onboarding", "Alex"],
            responseAny: ["Friday", "end of week"],
            responseForbidden: ["budget approved"],
        };
        expect(scoreFixture(fixture, [], normalize, "Alex will finish onboarding by Friday").passed).toBe(
            true
        );
        expect(
            scoreFixture(fixture, [], normalize, "Alex will finish onboarding by Friday; budget approved")
                .passed
        ).toBe(false);
        expect(
            scoreFixture(fixture, [{ name: "summarizeNotepad", input: {} }], normalize, "").responseCorrect
        ).toBe(false);
    });
    it("rejects success claims while an action awaits confirmation", () => {
        const fixture = { id: "pending", locale: "en", request: "" };
        const calls = [{ name: "createTask", input: { title: "Draft" }, output: { type: "choice" } }];
        expect(scoreFixture(fixture, calls, normalize, "I created the task").passed).toBe(false);
        expect(scoreFixture(fixture, calls, normalize, "Please confirm the proposed task").passed).toBe(true);
    });
    it("enforces stopping before the second mutation", () => {
        const fixture = { id: "dependent", locale: "en", request: "", maxMutationCalls: 1 };
        expect(
            scoreFixture(
                fixture,
                [
                    { name: "createProject", input: {} },
                    { name: "createTask", input: {} },
                ],
                normalize,
                ""
            ).passed
        ).toBe(false);
    });
    it("provides varied wording for every registered tool", async () => {
        const { examples } = await import("../../../scripts/ai-eval/fixtures");
        const { paraphrases } = await import("../../../scripts/ai-eval/scenarios");
        expect(Object.keys(paraphrases).sort()).toEqual(Object.keys(examples).sort());
        for (const [tool, prompts] of Object.entries(paraphrases)) {
            expect(prompts.length).toBeGreaterThanOrEqual(2);
            expect(new Set([examples[tool], ...prompts]).size).toBe(prompts.length + 1);
        }
    });
    it("keeps expected tool arguments compatible with registered schemas", async () => {
        const { normalize } = await import("../../../scripts/ai-eval/world");
        for (const fixture of fixtures.filter(f => f.tool && f.tool !== "askUserChoice")) {
            const definition = AI_TOOL_REGISTRY.find(t => t.name === fixture.tool)!;
            const exact = definition.inputSchema.safeParse(
                normalize(fixture.expected ?? expectedArguments[fixture.tool!])
            );
            const supplemented = definition.inputSchema.safeParse(
                normalize({ ...expectedArguments[fixture.tool!], ...fixture.expected })
            );
            expect(exact.success || supplemented.success, fixture.id).toBe(true);
        }
    });
    it("accepts equivalent ISO dates and schema-supported single-id filters", async () => {
        const { normalize, ids } = await import("../../../scripts/ai-eval/world");
        expect(normalize("2026-10-14", "duedate")).toEqual(normalize("2026-10-14T00:00:00.000Z", "duedate"));
        expect(normalize(ids.me, "assigneeUserIds")).toEqual(normalize(["me"], "assigneeUserIds"));
        expect(normalize("Website", "title")).toBe("Website");
    });
    it("normalizes route and authorized history ids consistently", async () => {
        const { normalize, ids, createMock } = await import("../../../scripts/ai-eval/world");
        expect(normalize({ title: "Website", section: "project", sectionId: "Website" })).toEqual({
            title: "Website",
            section: "project",
            sectionId: ids.Website,
        });
        const mock = createMock({ id: "missing", locale: "en", request: "", mock: "not-found" });
        expect(await mock({ toolName: "listTasks", input: { searchQuery: "Missing task" } })).toEqual([]);
        await expect(
            mock({ toolName: "getTask", input: { taskId: "00000000-0000-4000-8000-000000000001" } })
        ).rejects.toThrow("not found");
    });
    it("accepts supported project aliases and equivalent profile navigation", async () => {
        const { normalize, ids } = await import("../../../scripts/ai-eval/world");
        const fixture = {
            id: "alias",
            locale: "en",
            request: "",
            tool: "listTasks",
            expected: { projectId: "Website" },
        };
        expect(
            scoreFixture(
                fixture,
                [{ name: "listTasks", input: { project: [ids.Website] } }],
                normalize,
                "Buy milk"
            ).passed
        ).toBe(true);
        expect(
            scoreFixture(
                fixture,
                [{ name: "listTasks", input: { project: [ids.Website, ids.Review] } }],
                normalize,
                "Buy milk"
            ).passed
        ).toBe(false);
        const profile = {
            id: "profile",
            locale: "en",
            request: "",
            tool: "openProfile",
            alternatives: [{ tool: "navigate", expected: { view: "myProfile" } }],
        };
        expect(
            scoreFixture(profile, [{ name: "navigate", input: { view: "myProfile" } }], normalize, "").passed
        ).toBe(true);
        expect(
            scoreFixture(profile, [{ name: "navigate", input: { view: "people" } }], normalize, "").passed
        ).toBe(false);
    });
    it("searches synthetic records by name and refuses wrong-kind getter ids", async () => {
        const { createMock, ids } = await import("../../../scripts/ai-eval/world");
        const mock = createMock({ id: "search", locale: "en", request: "" });
        expect(await mock({ toolName: "globalSearch", input: { query: "Buy milk" } })).toMatchObject([
            { id: ids["Buy milk"], type: "task", title: "Buy milk" },
        ]);
        expect(await mock({ toolName: "globalSearch", input: { query: "Missing task" } })).toEqual([]);
        await expect(mock({ toolName: "getTask", input: { taskId: ids.Planning } })).rejects.toThrow(
            "not found"
        );
    });
    it("accepts date-only semantics without accepting a different due day", async () => {
        const { normalize } = await import("../../../scripts/ai-eval/world");
        const fixture = {
            id: "due",
            locale: "en",
            request: "",
            tool: "updateTask",
            expected: { duedate: "2026-10-14T00:00:00.000Z" },
            dateOnlyFields: ["duedate"],
        };
        expect(
            scoreFixture(
                fixture,
                [{ name: "updateTask", input: { duedate: "2026-10-14T23:59:59.999Z" } }],
                normalize,
                ""
            ).passed
        ).toBe(true);
        expect(
            scoreFixture(fixture, [{ name: "updateTask", input: { duedate: "2026-10-15" } }], normalize, "")
                .passed
        ).toBe(false);
    });
});

describe("controlled prompt comparisons", () => {
    it("accepts targeted/full contexts and separate current snapshots", () => {
        expect(parseOptions(["--context=full", "--snapshot=before.json"])).toMatchObject({
            context: "full",
            snapshot: "before.json",
            baseline: false,
        });
        expect(parseOptions(["--capture=before.json"]).capture).toBe("before.json");
        expect(() => parseOptions(["--context=unknown"])).toThrow();
        expect(() => parseOptions(["--snapshot=x", "--baseline"])).toThrow();
        expect(() => parseOptions(["--capture=x", "--snapshot=y"])).toThrow();
    });
});
