// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Browser UI for inspecting AI chat debug turns.
 */
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { clearAiChatDebugTurns, readAiChatDebugTurns } from "./debugLog";

const app = new Hono();
const port = Number(process.env.AI_CHAT_DEBUG_PORT ?? 3025);

app.get("/", c => c.html(indexHtml()));

app.get("/api/turns", async c => {
    const limit = Number(c.req.query("limit") ?? 200);
    const turns = await readAiChatDebugTurns(Number.isFinite(limit) ? limit : 200);
    return c.json(
        turns.map(turn => ({
            id: turn.id,
            startedAt: turn.startedAt,
            finishedAt: turn.finishedAt,
            status: turn.status,
            modelId: turn.modelId,
            user: turn.user,
            message: turn.request.newUserMessage,
            topics: turn.promptSelection?.topics ?? [],
            tools: turn.tools.map(tool => ({
                toolName: tool.toolName,
                success: tool.success,
                timestamp: tool.timestamp,
            })),
            responsePreview: (turn.responseText ?? turn.error ?? "").slice(0, 240),
        }))
    );
});

app.get("/api/turns/:id", async c => {
    const turns = await readAiChatDebugTurns();
    const turn = turns.find(candidate => candidate.id === c.req.param("id"));
    if (!turn) {
        return c.json({ error: "Turn not found" }, 404);
    }
    return c.json(turn);
});

app.delete("/api/turns", async c => {
    await clearAiChatDebugTurns();
    return c.json({ ok: true });
});

serve({ fetch: app.fetch, port });

console.log(`AI chat debug viewer running at http://localhost:${port}`);

function indexHtml() {
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Stacks AI Chat Debug</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: #0f172a;
      --panel: #111827;
      --panel-2: #1f2937;
      --text: #e5e7eb;
      --muted: #9ca3af;
      --line: #374151;
      --accent: #38bdf8;
      --danger: #fb7185;
      --ok: #34d399;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: var(--bg);
      color: var(--text);
    }
    button, input {
      font: inherit;
    }
    .app {
      display: grid;
      grid-template-columns: minmax(320px, 420px) 1fr;
      height: 100vh;
      min-height: 0;
    }
    .sidebar {
      border-right: 1px solid var(--line);
      min-height: 0;
      display: flex;
      flex-direction: column;
      background: #0b1220;
    }
    .toolbar {
      display: grid;
      grid-template-columns: 1fr auto auto;
      gap: 8px;
      padding: 12px;
      border-bottom: 1px solid var(--line);
    }
    input {
      width: 100%;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: var(--panel);
      color: var(--text);
      padding: 8px 10px;
    }
    button {
      border: 1px solid var(--line);
      border-radius: 6px;
      background: var(--panel-2);
      color: var(--text);
      padding: 8px 10px;
      cursor: pointer;
    }
    button:hover { border-color: var(--accent); }
    .turns {
      overflow: auto;
      min-height: 0;
    }
    .turn {
      width: 100%;
      display: block;
      text-align: left;
      border: 0;
      border-bottom: 1px solid var(--line);
      border-radius: 0;
      background: transparent;
      padding: 12px;
    }
    .turn.active { background: #172033; }
    .turn-title {
      display: flex;
      gap: 8px;
      align-items: center;
      margin-bottom: 6px;
    }
    .status {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex: 0 0 auto;
      background: var(--ok);
    }
    .status.error { background: var(--danger); }
    .message {
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .meta, .preview {
      color: var(--muted);
      font-size: 12px;
      line-height: 1.4;
    }
    .main {
      min-width: 0;
      min-height: 0;
      overflow: auto;
      padding: 18px;
    }
    .empty {
      color: var(--muted);
      padding: 36px;
      text-align: center;
    }
    .header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 16px;
    }
    h1 {
      margin: 0 0 6px;
      font-size: 20px;
      letter-spacing: 0;
    }
    h2 {
      font-size: 14px;
      margin: 18px 0 8px;
      color: var(--accent);
      letter-spacing: 0;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
    .box {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      padding: 12px;
      min-width: 0;
    }
    pre {
      margin: 0;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
      line-height: 1.45;
      color: #d1d5db;
    }
    .tool {
      border: 1px solid var(--line);
      border-radius: 8px;
      margin-bottom: 10px;
      overflow: hidden;
    }
    .tool-head {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 12px;
      background: var(--panel-2);
      font-size: 13px;
    }
    .tool-body {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0;
    }
    .tool-body > div {
      padding: 12px;
      border-top: 1px solid var(--line);
      min-width: 0;
    }
    .tool-body > div + div {
      border-left: 1px solid var(--line);
    }
    @media (max-width: 900px) {
      .app { grid-template-columns: 1fr; height: auto; min-height: 100vh; }
      .sidebar { height: 42vh; border-right: 0; border-bottom: 1px solid var(--line); }
      .grid, .tool-body { grid-template-columns: 1fr; }
      .tool-body > div + div { border-left: 0; }
    }
  </style>
</head>
<body>
  <div class="app">
    <aside class="sidebar">
      <div class="toolbar">
        <input id="filter" placeholder="Filter turns" />
        <button id="refresh">Refresh</button>
        <button id="clear">Clear</button>
      </div>
      <div id="turns" class="turns"></div>
    </aside>
    <main id="detail" class="main">
      <div class="empty">No AI chat debug turns yet.</div>
    </main>
  </div>
  <script>
    const state = { turns: [], selectedId: null, filter: "" };
    const turnsEl = document.getElementById("turns");
    const detailEl = document.getElementById("detail");
    const filterEl = document.getElementById("filter");

    function fmtDate(value) {
      return value ? new Date(value).toLocaleString() : "";
    }

    function text(value) {
      return value == null ? "" : String(value);
    }

    function json(value) {
      return JSON.stringify(value, null, 2);
    }

    function el(tag, attrs = {}, children = []) {
      const node = document.createElement(tag);
      for (const [key, value] of Object.entries(attrs)) {
        if (key === "class") node.className = value;
        else if (key === "text") node.textContent = text(value);
        else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2), value);
        else node.setAttribute(key, value);
      }
      for (const child of children) node.append(child);
      return node;
    }

    function pre(value) {
      return el("pre", { text: typeof value === "string" ? value : json(value) });
    }

    function renderTurns() {
      const q = state.filter.trim().toLowerCase();
      const turns = q
        ? state.turns.filter(turn => json(turn).toLowerCase().includes(q))
        : state.turns;
      turnsEl.replaceChildren(
        ...turns.map(turn => el("button", {
          class: "turn" + (turn.id === state.selectedId ? " active" : ""),
          onclick: () => selectTurn(turn.id),
        }, [
          el("div", { class: "turn-title" }, [
            el("span", { class: "status" + (turn.status === "error" ? " error" : "") }),
            el("span", { class: "message", text: turn.message || "(empty message)" }),
          ]),
          el("div", { class: "meta", text: fmtDate(turn.startedAt) + " · " + (turn.modelId || "unknown model") }),
          el("div", { class: "meta", text: "topics: " + (turn.topics || []).join(", ") + " · tools: " + (turn.tools || []).length }),
          el("div", { class: "preview", text: turn.responsePreview }),
        ]))
      );
      if (!turns.length) turnsEl.append(el("div", { class: "empty", text: "No matching turns." }));
    }

    function renderDetail(turn) {
      if (!turn) {
        detailEl.replaceChildren(el("div", { class: "empty", text: "Select a turn." }));
        return;
      }
      detailEl.replaceChildren(
        el("div", { class: "header" }, [
          el("div", {}, [
            el("h1", { text: turn.request?.newUserMessage || "(empty message)" }),
            el("div", { class: "meta", text: fmtDate(turn.startedAt) + " → " + fmtDate(turn.finishedAt) }),
            el("div", { class: "meta", text: "status: " + turn.status + " · model: " + (turn.modelId || "") + " · baseURL: " + (turn.baseURL || "") }),
            el("div", { class: "meta", text: "user: " + (turn.user?.name || turn.user?.email || turn.user?.id || "unknown") }),
          ]),
          el("button", { onclick: () => navigator.clipboard?.writeText(json(turn)), text: "Copy JSON" }),
        ]),
        el("div", { class: "grid" }, [
          section("Prompt Selection", turn.promptSelection),
          section("Client Route", turn.request?.clientRoute || null),
        ]),
        section("System Prompt", turn.systemPrompt || ""),
        section("Messages Sent To Model", turn.messages || []),
        toolsSection(turn.tools || []),
        section("Final Response", turn.responseText || ""),
        turn.error ? section("Error", turn.error) : el("div")
      );
    }

    function section(title, value) {
      return el("section", { class: "box" }, [
        el("h2", { text: title }),
        pre(value),
      ]);
    }

    function toolsSection(tools) {
      return el("section", {}, [
        el("h2", { text: "Tool Calls" }),
        ...(tools.length ? tools.map(tool => el("div", { class: "tool" }, [
          el("div", { class: "tool-head" }, [
            el("strong", { text: tool.toolName || "(unknown tool)" }),
            el("span", { text: (tool.success ? "ok" : "error") + " · " + fmtDate(tool.timestamp) }),
          ]),
          el("div", { class: "tool-body" }, [
            el("div", {}, [el("h2", { text: "Args" }), pre(tool.input)]),
            el("div", {}, [el("h2", { text: "Response" }), pre(tool.success ? tool.output : tool.error)]),
          ]),
        ])) : [el("div", { class: "box" }, [pre("No tool calls.")])]),
      ]);
    }

    async function loadTurns() {
      const response = await fetch("/api/turns");
      state.turns = await response.json();
      if (!state.selectedId && state.turns[0]) state.selectedId = state.turns[0].id;
      renderTurns();
      if (state.selectedId) await selectTurn(state.selectedId, false);
    }

    async function selectTurn(id, renderList = true) {
      state.selectedId = id;
      const response = await fetch("/api/turns/" + encodeURIComponent(id));
      renderDetail(response.ok ? await response.json() : null);
      if (renderList) renderTurns();
    }

    document.getElementById("refresh").addEventListener("click", loadTurns);
    document.getElementById("clear").addEventListener("click", async () => {
      if (!confirm("Clear all AI chat debug turns?")) return;
      await fetch("/api/turns", { method: "DELETE" });
      state.selectedId = null;
      await loadTurns();
    });
    filterEl.addEventListener("input", () => {
      state.filter = filterEl.value;
      renderTurns();
    });
    loadTurns();
    setInterval(loadTurns, 5000);
  </script>
</body>
</html>`;
}
