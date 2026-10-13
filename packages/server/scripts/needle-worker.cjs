// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
const { parentPort } = require("node:worker_threads");
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { performance } = require("node:perf_hooks");
process.env.NEEDLE_TELEMETRY = "0";
process.env.DO_NOT_TRACK = "1";
(async () => {
    const started = performance.now();
    const manifest = require("./manifest.json");
    const data = {};
    for (const [file, entry] of Object.entries(manifest.files)) {
        data[file] = fs.readFileSync(path.join(__dirname, file));
        if (createHash("sha256").update(data[file]).digest("hex") !== entry.sha256)
            throw new Error(`Needle checksum mismatch: ${file}`);
    }
    const module = await require("./needle.js")({ wasmBinary: data["needle.wasm"] });
    const weights = data["needle3.cact"];
    const ptr = module._malloc(weights.length);
    module.HEAPU8.set(weights, ptr);
    const loaded = module._needle_load(ptr, BigInt(weights.length));
    module._free(ptr);
    if (loaded < 0) throw new Error(module.UTF8ToString(module._needle_last_error()));
    parentPort.postMessage({ ready: true, coldMs: performance.now() - started });
    const embeddings = new Map();
    function embed(text) {
        const count = module.ccall(
            "needle_embed",
            "number",
            ["string", "number", "number", "number", "number"],
            [text, 0, 0, 0, 0]
        );
        if (count <= 0 || count > 65536) throw new Error("Needle embedding failed");
        const ptr = module._malloc(count * 4);
        try {
            const result = module.ccall(
                "needle_embed",
                "number",
                ["string", "number", "number", "number", "number"],
                [text, 0, 0, ptr, count]
            );
            if (result < 0) throw new Error(module.UTF8ToString(module._needle_last_error()));
            const vector = Array.from(new Float32Array(module.HEAPU8.buffer, ptr, count));
            const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
            return vector.map(value => value / norm);
        } finally {
            module._free(ptr);
        }
    }
    parentPort.on("message", job => {
        const started = performance.now();
        const output = module._malloc(65536);
        try {
            module._needle_reset();
            let tools = job.tools;
            if (tools.length > 5) {
                const query = embed((job.query || job.inputs[0]).slice(-2000));
                tools = tools
                    .map(tool => {
                        const key = JSON.stringify({
                            name: tool.name,
                            description: tool.description.slice(0, 200),
                        });
                        if (!embeddings.has(key)) embeddings.set(key, embed(key));
                        const vector = embeddings.get(key);
                        return {
                            tool,
                            score: vector.reduce((sum, value, index) => sum + value * (query[index] || 0), 0),
                        };
                    })
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 5)
                    .map(item => item.tool);
            }
            const retrievedTools = tools.map(tool => tool.name);
            if (tools.length > 1) {
                const compact = tools.map(tool => ({
                    name: tool.name,
                    description: tool.description,
                    parameters: { type: "object", properties: {} },
                }));
                const initialized = module.ccall(
                    "needle_init",
                    "number",
                    ["string", "string", "number"],
                    [job.system, JSON.stringify(compact), 0]
                );
                if (initialized < 0) throw new Error(module.UTF8ToString(module._needle_last_error()));
                const routed = module.ccall(
                    "needle_complete",
                    "number",
                    ["string", "number", "number", "number", "number", "number"],
                    [job.query || job.inputs[0], 0, 0, 256, output, 65536]
                );
                if (routed < 0) throw new Error(module.UTF8ToString(module._needle_last_error()));
                const route = JSON.parse(module.UTF8ToString(output));
                const names = new Set(
                    [...(route.function_calls || []), ...(route.suppressed_calls || [])].map(
                        call => call.name
                    )
                );
                const selected = tools.filter(tool => names.has(tool.name));
                if (selected.length) tools = selected;
                module._needle_reset();
            }
            const init = module.ccall(
                "needle_init",
                "number",
                ["string", "string", "number"],
                [job.system, JSON.stringify(tools), 0]
            );
            if (init < 0) throw new Error(module.UTF8ToString(module._needle_last_error()));
            let response;
            for (const input of job.inputs) {
                const result = module.ccall(
                    "needle_complete",
                    "number",
                    ["string", "number", "number", "number", "number", "number"],
                    [input, 0, 0, 512, output, 65536]
                );
                if (result < 0) throw new Error(module.UTF8ToString(module._needle_last_error()));
                response = JSON.parse(module.UTF8ToString(output));
            }
            parentPort.postMessage({
                id: job.id,
                response,
                retrievedTools,
                selectedTools: tools.map(tool => tool.name),
                elapsedMs: performance.now() - started,
                memoryBytes: process.memoryUsage().rss,
            });
        } catch (error) {
            parentPort.postMessage({ id: job.id, error: error.message });
        } finally {
            module._free(output);
            module._needle_reset();
        }
    });
})().catch(error => {
    parentPort.postMessage({ error: error.message });
    process.exitCode = 1;
});
