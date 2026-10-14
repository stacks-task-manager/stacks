// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import type { EvaluationCall } from "./scoring";

export type ReportRow = {
    fixture: string;
    run: number;
    suite?: string;
    request?: string;
    responseText: string;
    modelSteps?: { text: string; finishReason: string }[];
    passed: boolean;
    reasons: string[];
    calls: EvaluationCall[];
    latencyMs: number;
    payloadBytes?: number;
    error?: string;
    expectations?: unknown;
    history?: unknown;
    route?: unknown;
    usage?: unknown;
};
export type EvaluationReport = {
    model: string;
    status: string;
    planned: number;
    rows: ReportRow[];
    disableThinking?: boolean;
    createdAt?: string;
    temperature?: number;
    baseline?: boolean;
};
export const escapeHtml = (value: unknown): string =>
    String(value ?? "").replace(
        /[&<>"']/g,
        ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]!)
    );
const json = (value: unknown) => escapeHtml(JSON.stringify(value, null, 2));

/** All model/tool text is escaped. The report loads no external assets and makes no network requests. */
export function renderEvaluationHtml(report: EvaluationReport): string {
    const completed = report.rows.length;
    const errors = report.rows.filter(r => r.error).length;
    const passed = report.rows.filter(r => r.passed).length;
    const rows = report.rows
        .map((row, index) => {
            const status = row.error ? "error" : row.passed ? "pass" : "fail";
            const choices = row.calls.filter(
                c =>
                    c.output &&
                    typeof c.output === "object" &&
                    "type" in c.output &&
                    c.output.type === "choice"
            );
            return `<article data-status="${status}" data-suite="${escapeHtml(
                row.suite
            )}" data-search="${escapeHtml(
                `${row.fixture} ${row.request ?? ""} ${row.responseText}`.toLowerCase()
            )}" data-id="${escapeHtml(row.fixture)}" data-run="${row.run}">
<header class="case-header"><h2>${escapeHtml(row.fixture)} <small>Run ${
                row.run
            }</small></h2><span class="badge ${status}">${
                status === "error"
                    ? "Provider error"
                    : status === "pass"
                    ? "Assertions passed"
                    : "Assertions failed"
            }</span></header>
<p class="muted">${escapeHtml(row.suite)} · ${row.latencyMs.toLocaleString("en-US")} ms · ${
                row.payloadBytes ?? "?"
            } payload bytes</p>
<div class="conversation"><section><h3>User prompt</h3><p class="text">${escapeHtml(
                row.request ?? "Prompt unavailable in this older report"
            )}</p></section>
<section><h3>Assistant response</h3><p class="text">${escapeHtml(
                row.responseText ||
                    (choices.length
                        ? "No plain-text reply; the assistant presented the choice below."
                        : "No completed response recorded.")
            )}</p>
${choices
    .map(c => `<h4>Choice / confirmation widget</h4><pre>${json(c.output)}</pre>`)
    .join("")}</section></div>
${row.error ? `<p class="error-message">${escapeHtml(row.error)}</p>` : ""}
${
    row.reasons.length
        ? `<ul class="reasons">${row.reasons.map(reason => `<li>${escapeHtml(reason)}</li>`).join("")}</ul>`
        : ""
}
<details><summary>Expected behavior</summary><pre>${json(
                row.expectations ?? "Not recorded in this older report"
            )}</pre></details>
<details><summary>Tool calls (${row.calls.length}) and results</summary><pre>${json(
                row.calls
            )}</pre></details>
<details><summary>Conversation context and model steps</summary><pre>${json({
                history: row.history,
                route: row.route,
                steps: row.modelSteps,
                usage: row.usage,
            })}</pre></details>
<div class="review"><label for="rating-${index}">Your evaluation</label><select id="rating-${index}" class="rating"><option value="unreviewed">Unreviewed</option><option value="good">Good</option><option value="needs-work">Needs work</option><option value="incorrect">Incorrect</option></select>
<label class="notes-label" for="notes-${index}">Review notes</label><textarea id="notes-${index}" class="notes" placeholder="Accuracy, clarity, missing steps, or unwanted actions"></textarea></div></article>`;
        })
        .join("\n");
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Stacks LLM evaluation</title>
<style>
:root{color-scheme:light;font-family:system-ui,sans-serif;color:#17243b;background:#f3f6fa}*{box-sizing:border-box}body{margin:0}main{max-width:1160px;margin:auto;padding:32px 22px}h1{margin:0 0 12px}h2{font-size:19px;margin:0;overflow-wrap:anywhere}h3{font-size:14px;color:#45546c;margin:0 0 10px}h4{font-size:14px}small,.muted{color:#65738a;font-weight:normal}small{font-size:13px}.banner,article,.stats{background:white;border:1px solid #dce3ed;border-radius:12px;padding:22px;margin:18px 0}.banner{border-left:5px solid #d99b22}.stats{display:flex;flex-wrap:wrap;gap:22px}.stats strong{display:block;font-size:23px}.stats span{font-size:13px;color:#65738a}.filters{display:flex;gap:10px;flex-wrap:wrap;position:sticky;top:0;background:#f3f6fa;padding:14px 0;z-index:1}input,select,button,textarea{font:inherit;border:1px solid #c3ccda;border-radius:6px;padding:9px;background:white;color:inherit}input{flex:1;min-width:180px}button{cursor:pointer;background:#2343a3;color:white;border-color:#2343a3}.case-header{display:flex;gap:12px;justify-content:space-between;align-items:start}.badge{font-size:12px;border-radius:30px;padding:6px 10px;white-space:nowrap}.pass{background:#def3e5;color:#166534}.fail,.error{background:#fee2e2;color:#991b1b}.conversation{display:grid;grid-template-columns:1fr 1.3fr;gap:16px}.conversation section{background:#f7f9fc;border-radius:8px;padding:16px;min-width:0}.text{white-space:pre-wrap;overflow-wrap:anywhere;margin:0;line-height:1.6}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.5 ui-monospace,monospace;background:#f5f7fa;padding:14px;border-radius:6px;max-height:480px;overflow:auto}details{margin:14px 0}summary{cursor:pointer;font-size:14px}.reasons,.error-message{color:#991b1b}.review{border-top:1px solid #e1e7ef;padding-top:16px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}.notes-label{width:100%;font-size:13px}.notes{width:100%;min-height:68px;resize:vertical}[hidden]{display:none!important}@media(max-width:700px){.conversation{grid-template-columns:1fr}.case-header{flex-direction:column}}@media print{.filters,.review{display:none}.conversation{grid-template-columns:1fr}article{break-inside:avoid}pre{max-height:none}}
</style></head><body><main><h1>Stacks · LLM response review</h1>
<p class="muted">Model: <strong id="model">${escapeHtml(report.model)}</strong> · ${escapeHtml(
        report.createdAt ?? "Time unavailable"
    )} · ${escapeHtml(report.status)} · Temperature: ${report.temperature ?? "?"} · ${
        report.baseline ? "Captured baseline prompts" : "Current prompts"
    }</p>
<p>Thinking: ${
        report.disableThinking === undefined
            ? "Not recorded in this older report"
            : report.disableThinking
            ? "Disable requested via chat_template_kwargs (server support required)"
            : "Server default"
    }.</p>
<div class="stats"><div><strong>${completed}/${
        report.planned
    }</strong><span>Runs attempted</span></div><div><strong>${passed}</strong><span>Assertions passed</span></div><div><strong>${errors}</strong><span>Provider errors</span></div><div><strong>${Math.max(
        0,
        report.planned - completed
    )}</strong><span>Unevaluated runs</span></div></div>
<div class="banner">${
        report.status !== "complete"
            ? "This report is incomplete. Missing runs and provider errors give no evidence of model accuracy. "
            : ""
    }Automatic checks cover specific assertions; use the replies and tool traces below to judge quality. Synthetic tools only: no real writes execute. Review notes stay in this page's memory; export them before closing or refreshing.</div>
<div class="filters"><input id="search" type="search" placeholder="Search prompts and responses" aria-label="Search prompts and responses"><select id="status" aria-label="Filter result"><option value="all">All results</option><option value="pass">Assertions passed</option><option value="fail">Assertions failed</option><option value="error">Provider errors</option></select><select id="suite" aria-label="Filter suite"><option value="all">All suites</option><option value="tools">Tools</option><option value="interpretation">Interpretation</option><option value="safety">Safety</option></select><button id="export">Export your review</button></div><p id="shown" class="muted"></p>${
        rows || "<p>No finished runs yet.</p>"
    }</main>
<script>
const cards = Array.from(document.querySelectorAll('article'));
const search = document.getElementById('search');
const status = document.getElementById('status');
const suite = document.getElementById('suite');
function filter() {
    let visible = 0;
    cards.forEach(card => {
        card.hidden = !(card.dataset.search.includes(search.value.toLowerCase()) && (status.value === 'all' || status.value === card.dataset.status) && (suite.value === 'all' || suite.value === card.dataset.suite));
        if (!card.hidden) visible++;
    });
    document.getElementById('shown').textContent = visible + ' of ' + cards.length + ' runs shown';
}
[search, status, suite].forEach(control => control.addEventListener('input', filter));
document.getElementById('export').addEventListener('click', () => {
    const review = { model: document.getElementById('model').textContent, exportedAt: new Date().toISOString(), rows: cards.map(card => ({ fixture: card.dataset.id, run: Number(card.dataset.run), rating: card.querySelector('.rating').value, notes: card.querySelector('.notes').value })) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(review, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'stacks-llm-review.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
filter();
</script></body></html>`;
}
