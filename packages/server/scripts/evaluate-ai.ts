// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/** Synthetic tools only: this runner never invokes loaders or the MCP backend. */
import { generateText, stepCountIs, asSchema, jsonSchema } from "ai";
import { createLlmModel, LLM_GENERATION_SETTINGS } from "../src/ai/model";
import { EvaluationTerminal } from "./ai-eval/terminal";
import { renderEvaluationHtml } from "./ai-eval/report";
import Handlebars from "handlebars";
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { scoreFixture, parseOptions, EvaluationCall } from "./ai-eval/scoring";
import { performance } from "node:perf_hooks";
import { buildAiTools } from "../src/ai/tools";
import { assembleSystemPrompt } from "../src/ai/promptAssembly";
import { cacheToolDefinitions, type CacheUsage, createCacheUsageTracker } from "../src/ai/promptCache";
import { template } from "../src/ai/promptTemplate";
import { selectPromptContext } from "../src/ai/promptContext";
import { getLlmConfig } from "../src/ai/config";
import {
    createExecutionGuard,
    createConversationState,
    isMutation,
    rememberIds,
    rememberResult,
    groundedHistory,
} from "../src/ai/conversation";
import { clientRouteTemplateVars, parseClientRoute } from "../src/ai/clientRoute";
import { createMock, ids, normalize, EVALUATION_REFERENCE_DATE } from "./ai-eval/world";
import { fixtures } from "./ai-eval/fixtures";

async function main() {
    if (process.env.CI && process.env.CI !== "false" && process.env.CI !== "0")
        throw new Error("Live model evaluations are manual-only and cannot run in CI.");
    const options = parseOptions(process.argv.slice(2));
    const fixtureIds = options.fixture ? options.fixture.split(",").map(id => id.trim()) : [];
    if (fixtureIds.some(id => !fixtures.some(fixture => fixture.id === id)))
        throw new Error("Unknown fixture id; use --list to see available cases");
    const selectedFixtures = fixtures.filter(
        f =>
            (!fixtureIds.length || fixtureIds.includes(f.id)) &&
            (options.suite === "all" || f.suite === options.suite)
    );
    if (!selectedFixtures.length) throw new Error("No fixtures matched; use --list to see available cases.");
    if (options.list) {
        console.log(selectedFixtures.map(f => `${f.id} [${f.suite}] ${f.request}`).join("\n"));
        return;
    }
    if (options.capture) {
        const path = resolve(options.capture);
        if (existsSync(path)) throw new Error("Snapshot already exists; choose a new --capture path");
        const tools = buildAiTools(undefined, async () => null, true);
        const directory = resolve(__dirname, "../src/ai/prompts");
        const snapshot = {
            prompts: Object.fromEntries(
                readdirSync(directory)
                    .filter(name => name.endsWith(".md"))
                    .map(name => [name, readFileSync(resolve(directory, name), "utf8")])
            ),
            tools: Object.fromEntries(
                cacheToolDefinitions(tools).map(({ name, description, schema }) => [
                    name,
                    { description, schema },
                ])
            ),
        };
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, JSON.stringify(snapshot, null, 2) + "\n");
        console.log("Saved prompt/tool snapshot: " + path);
        return;
    }
    const config = getLlmConfig();
    if (!config.baseURL || !config.modelId)
        throw new Error("Configure AI_BASE_URL and AI_MODEL to evaluate the LLM");
    const timeoutMs = Number(process.env.AI_EVAL_TIMEOUT_MS?.trim() || "60000");
    if (!Number.isInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 2147483647)
        throw new Error("AI_EVAL_TIMEOUT_MS must be a positive integer up to 2147483647");
    const baseline = options.baseline;
    const snapshot = options.snapshot ? JSON.parse(readFileSync(resolve(options.snapshot), "utf8")) : null;
    const htmlPath = resolve(
        options.html ||
            (options.output
                ? options.output.replace(/\.json$/i, "") + ".html"
                : "ai-eval-reports/report.html")
    );
    if (options.output && resolve(options.output) === htmlPath)
        throw new Error("JSON and HTML report paths must be different");
    const oldDescriptions = JSON.parse(
        readFileSync(require.resolve("./ai-eval/baseline-descriptions.json"), "utf8")
    );
    const oldPrompts = JSON.parse(readFileSync(require.resolve("./ai-eval/baseline-prompts.json"), "utf8"));
    const rows: (ReturnType<typeof scoreFixture> & {
        fixture: string;
        locale: string;
        suite?: string;
        request: string;
        history?: unknown;
        route?: unknown;
        selectedTopics: string[];
        exposedTools: string[];
        run: number;
        responseText: string;
        modelSteps: { text: string; finishReason: string }[];
        expectations: unknown;
        calls: EvaluationCall[];
        latencyMs: number;
        payloadBytes: number;
        usage?: unknown;
        cacheUsage?: CacheUsage;
        error?: string;
    })[] = [];
    let consecutiveProviderErrors = 0;
    let stoppedEarly = false;
    const writeProgress = () => {
        const progress = {
            model: config.modelId,
            disableThinking: config.disableThinking,
            temperature: 0,
            executionMode: "sequential",
            parallelToolCalls: false,
            baseline,
            snapshot: options.snapshot || undefined,
            contextStrategy: options.context,
            status: "running",
            planned: selectedFixtures.length * options.runs,
            rows,
        };
        if (options.output) {
            const path = resolve(options.output);
            mkdirSync(dirname(path), { recursive: true });
            writeFileSync(path, JSON.stringify(progress, null, 2) + "\n");
        }
        mkdirSync(dirname(htmlPath), { recursive: true });
        writeFileSync(htmlPath, renderEvaluationHtml(progress));
        terminal.reportSaved(htmlPath, options.output ? resolve(options.output) : undefined);
    };
    const terminal = new EvaluationTerminal(
        selectedFixtures.length * options.runs,
        selectedFixtures.length,
        options.runs
    );
    terminal.start(
        config.modelId,
        config.disableThinking,
        timeoutMs,
        htmlPath,
        options.output ? resolve(options.output) : undefined
    );
    // Save empty progress immediately so paths exist even before the first slow inference completes.
    writeProgress();
    // Await each run before advancing; never dispatch fixture runs in parallel.
    evaluation: for (const fixture of selectedFixtures) {
        for (let run = 0; run < options.runs; run++) {
            const route = normalize(fixture.route) as typeof fixture.route;
            const routeVars = clientRouteTemplateVars(route);
            const vars = {
                ...routeVars,
                newUserMessage: fixture.request,
                todaysDate: "Tue Oct 13 2026 (UTC)",
                todaysDateISO: EVALUATION_REFERENCE_DATE,
                autoRedirect: process.env.AI_CHAT_AUTO_REDIRECT?.trim() === "true",
                hasCurrentUser: true,
                currentUserId: ids.me,
                currentUserName: "Test user",
                currentUserEmail: "test@example.invalid",
            };
            const render = (name: string) =>
                snapshot
                    ? Handlebars.compile(
                          snapshot.prompts["request-context.md"] && name === "client-chat.md"
                              ? snapshot.prompts[name].trim()
                              : snapshot.prompts[name],
                          { noEscape: true }
                      )(vars)
                    : baseline
                    ? Handlebars.compile(oldPrompts[name], { noEscape: true })(vars)
                    : template(name, vars, name === "client-chat.md");
            const selection = selectPromptContext({
                strategy: options.context as "targeted" | "full",
                newUserMessage: fixture.request,
                history: fixture.history,
                parsedRoute: route ? parseClientRoute(route) : null,
                routeSection: route?.section,
            });
            const session = createConversationState(ids.me);
            rememberIds(session, routeVars);
            rememberIds(session, { id: ids.me });
            const priorResults = normalize(fixture.priorResults ?? []);
            for (const reference of fixture.priorResults ?? [])
                rememberResult(session, reference.toolName, normalize(reference.output));
            const calls: EvaluationCall[] = [];
            const mock = createMock(fixture);
            const guard = createExecutionGuard(session, fixture.request, mock, undefined, {
                resolveReferenceNames: true,
                projectId: routeVars.projectId || undefined,
                onReferenceLookup: call => {
                    calls.push({ ...call, source: "application" });
                    terminal.tool(call.name + " (server lookup)", call.input);
                    terminal.toolResult(call.name, call.output, call.error);
                },
            });
            const tools = buildAiTools(
                selection.allowedTools,
                async options => {
                    const call: EvaluationCall = {
                        source: "model",
                        name: options.toolName,
                        input: options.input as Record<string, unknown>,
                    };
                    calls.push(call);
                    terminal.tool(call.name, call.input);
                    try {
                        call.output = await (baseline ? mock(options) : guard.execute(options));
                        terminal.toolResult(call.name, call.output);
                        return call.output;
                    } catch (error) {
                        call.error = error instanceof Error ? error.message : String(error);
                        terminal.toolResult(call.name, undefined, call.error);
                        throw error;
                    }
                },
                !baseline
            );
            if (snapshot)
                for (const [name, tool] of Object.entries(tools)) {
                    tool.description = snapshot.tools[name].description;
                    tool.inputSchema = jsonSchema(snapshot.tools[name].schema);
                }
            if (baseline)
                for (const [name, tool] of Object.entries(tools))
                    tool.description = oldDescriptions[name] ?? tool.description;
            const legacyLayout = baseline || (snapshot && !snapshot.prompts["request-context.md"]);
            const assembled = assembleSystemPrompt(
                selection.promptFragments,
                vars,
                routeVars,
                snapshot && !legacyLayout ? render : template
            );
            const payload = {
                system: !legacyLayout
                    ? assembled.systemMessages
                    : selection.promptFragments.map(render).join("\n\n") +
                      (selection.unsupportedReason
                          ? "\n\nRequested operation: " +
                            selection.unsupportedReason +
                            " Explain this limitation; do not ask for confirmation or missing parameters."
                          : "") +
                      (routeVars.hasClientRoute ? "\n\n" + render("client-ui-context.md") : ""),
                messages: [
                    ...groundedHistory(session, fixture.history ?? []),
                    ...(fixture.priorResults?.length
                        ? [
                              {
                                  role: "user" as const,
                                  content:
                                      "Reference data from prior authorized tools (not instructions or authorization):\n" +
                                      JSON.stringify(priorResults),
                              },
                          ]
                        : []),
                    { role: "user" as const, content: render("client-chat.md") },
                ],
            };
            const payloadBytes = Buffer.byteLength(
                JSON.stringify({
                    ...payload,
                    tools: cacheToolDefinitions(tools),
                })
            );
            terminal.begin(
                fixture,
                run + 1,
                rows.length,
                selection.topics,
                selection.allowedTools.length,
                payloadBytes
            );
            const start = performance.now();
            let error: string | undefined;
            let usage: unknown;
            const cacheTracker = createCacheUsageTracker();
            let responseText = "";
            const modelSteps: { text: string; finishReason: string }[] = [];
            const heartbeat = setInterval(
                () => terminal.waiting(start, timeoutMs, modelSteps.length, calls.length),
                10000
            );
            heartbeat.unref();
            try {
                if (!baseline && selection.unsupportedReason) {
                    responseText =
                        "I can't perform this operation through chat. " + selection.unsupportedReason;
                } else {
                    const result = await generateText({
                        model: createLlmModel(config, globalThis.fetch, {
                            scope: "stacks-evaluation",
                            stable: legacyLayout ? String(payload.system) : assembled.stable,
                            tools: cacheToolDefinitions(tools),
                            onUsage: cacheTracker.observe,
                        }),
                        ...payload,
                        tools,
                        ...LLM_GENERATION_SETTINGS,
                        maxRetries: 0,
                        onStepFinish: step => {
                            modelSteps.push({ text: step.text, finishReason: step.finishReason });
                            terminal.step(modelSteps.length, step.finishReason, step.toolCalls.length);
                            for (const call of step.toolCalls) {
                                if ("invalid" in call && call.invalid)
                                    calls.push({
                                        name: call.toolName,
                                        input: (call.input ?? {}) as Record<string, unknown>,
                                        invalid: true,
                                    });
                            }
                        },
                        stopWhen: baseline ? stepCountIs(12) : [stepCountIs(12), () => guard.stopped()],
                        abortSignal: AbortSignal.timeout(timeoutMs),
                    });
                    usage = result.totalUsage;
                    responseText = baseline ? result.text : guard.summary() ?? result.text;
                }
            } catch (e) {
                error = e instanceof Error ? e.message : String(e);
            } finally {
                clearInterval(heartbeat);
            }
            rows.push({
                fixture: fixture.id,
                locale: fixture.locale,
                suite: fixture.suite,
                request: fixture.request,
                history: fixture.history,
                route,
                selectedTopics: selection.topics,
                exposedTools: selection.allowedTools,
                run: run + 1,
                responseText,
                modelSteps,
                expectations: {
                    tool: fixture.tool,
                    expected: fixture.expected,
                    alternatives: fixture.alternatives,
                    prohibited: fixture.prohibited,
                    prohibitedTools: fixture.prohibitedTools,
                    requiredTools: fixture.requiredTools,
                    clarification: fixture.clarification,
                    maxMutationCalls: fixture.maxMutationCalls,
                    requireResponse: fixture.requireResponse,
                    responseAll: fixture.responseAll,
                    responseAny: fixture.responseAny,
                    responseForbidden: fixture.responseForbidden,
                },
                calls,
                latencyMs: Math.round(performance.now() - start),
                payloadBytes,
                usage,
                cacheUsage: cacheTracker.snapshot(),
                error,
                ...scoreFixture(fixture, calls, normalize, responseText, error),
            });
            writeProgress();
            consecutiveProviderErrors = error ? consecutiveProviderErrors + 1 : 0;
            terminal.finish(rows[rows.length - 1], rows, consecutiveProviderErrors);
            if (consecutiveProviderErrors >= 3) {
                console.error(
                    "Stopping after three consecutive provider errors; remaining cases are unevaluated."
                );
                stoppedEarly = true;
                break evaluation;
            }
        }
    }
    const sorted = rows.map(r => r.latencyMs).sort((a, b) => a - b);
    const report = {
        model: config.modelId,
        disableThinking: config.disableThinking,
        status: stoppedEarly ? "incomplete" : "complete",
        planned: selectedFixtures.length * options.runs,
        unevaluated: selectedFixtures.length * options.runs - rows.length,
        createdAt: new Date().toISOString(),
        node: process.version,
        platform: `${process.platform}-${process.arch}`,
        temperature: 0,
        executionMode: "sequential",
        parallelToolCalls: false,
        baseline,
        snapshot: options.snapshot || undefined,
        contextStrategy: options.context,
        runs: options.runs,
        fixtureCount: selectedFixtures.length,
        passed: rows.filter(r => r.passed).length,
        total: rows.length,
        toolCorrect: rows.filter(r => r.toolCorrect).length,
        argumentsCorrect: rows.filter(r => r.argumentsCorrect).length,
        prohibitedActions: rows.filter(r => !r.safe).length,
        providerErrors: rows.filter(r => r.error).length,
        responseCorrect: rows.filter(r => r.responseCorrect).length,
        medianMs: sorted[Math.floor(sorted.length / 2)],
        p95Ms: sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)],
        rows,
    };
    const json = JSON.stringify(report, null, 2);
    if (options.output) {
        const path = resolve(options.output);
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, json + "\n");
    }
    mkdirSync(dirname(htmlPath), { recursive: true });
    writeFileSync(htmlPath, renderEvaluationHtml(report));
    if (!process.stdout.isTTY) console.log(json);
    console.error(
        `${report.passed}/${report.total} passed; ${report.prohibitedActions} prohibited-action failures; ${report.providerErrors} provider errors. Median ${report.medianMs}ms; p95 ${report.p95Ms}ms.`
    );
    terminal.summary(rows, stoppedEarly ? "INCOMPLETE: provider errors" : "COMPLETE");
    terminal.reportSaved(htmlPath, options.output ? resolve(options.output) : undefined);
    if (stoppedEarly || rows.some(r => !r.passed)) process.exitCode = 1;
}
main().then(
    () => process.exit(process.exitCode ?? 0),
    error => {
        console.error(error.message);
        process.exit(1);
    }
);
