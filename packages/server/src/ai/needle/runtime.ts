// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Worker } from "node:worker_threads";
import { existsSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type NeedleCall = { name: string; arguments: Record<string, unknown> };
export type NeedleResponse = {
    type: "call" | "respond";
    success: boolean;
    function_calls: NeedleCall[];
    suppressed_calls?: NeedleCall[];
    confidence?: number | null;
    validation?: { ungrounded?: string[]; negation?: boolean };
};
export type NeedleJob = { tools: unknown[]; system: string; inputs: string[]; query?: string };
export type NeedleResult = {
    response: NeedleResponse;
    retrievedTools?: string[];
    selectedTools?: string[];
    elapsedMs: number;
    memoryBytes: number;
};
let worker: Worker | undefined;
let ready = false;
let starting: Promise<void> | undefined;
let queue: Promise<unknown> = Promise.resolve();
export function isNeedleReady() {
    return ready;
}
function runtimePath() {
    const candidates = [
        path.join(__dirname, "../../../needle-runtime"),
        path.join(__dirname, "needle-runtime"),
        path.join(process.cwd(), "needle-runtime"),
        path.join(process.cwd(), "packages/server/needle-runtime"),
    ];
    return candidates.find(p => existsSync(path.join(p, "worker.cjs")));
}
export async function initializeNeedle(): Promise<void> {
    if (ready) return;
    if (starting) return starting;
    starting = (async () => {
        const dir = runtimePath();
        if (!dir) throw new Error("Needle assets missing; run yarn workspace @stacks/server needle:prepare");
        const instance = new Worker(path.join(dir, "worker.cjs"));
        worker = instance;
        instance.unref();
        instance.on("error", () => {
            if (worker === instance) {
                ready = false;
                worker = undefined;
            }
        });
        instance.on("exit", () => {
            if (worker === instance) {
                ready = false;
                worker = undefined;
            }
        });
        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
                finish(new Error("Needle initialization timed out"));
            }, 30000);
            const finish = (error?: Error) => {
                clearTimeout(timeout);
                instance.off("message", message);
                instance.off("error", fail);
                instance.off("exit", exited);
                if (error) {
                    ready = false;
                    if (worker === instance) worker = undefined;
                    void instance.terminate();
                    reject(error);
                } else resolve();
            };
            const fail = (error: Error) => finish(error);
            const exited = () => finish(new Error("Needle worker exited during initialization"));
            const message = (event: { ready?: boolean; error?: string }) => {
                if (event.ready) {
                    ready = true;
                    finish();
                } else if (event.error) finish(new Error(event.error));
            };
            instance.on("message", message);
            instance.once("error", fail);
            instance.once("exit", exited);
        });
    })();
    try {
        await starting;
    } finally {
        starting = undefined;
    }
}
export function planWithNeedle(job: NeedleJob): Promise<NeedleResult> {
    const run = queue.then(async () => {
        await initializeNeedle();
        const instance = worker!;
        const id = randomUUID();
        instance.ref();
        return new Promise<NeedleResult>((resolve, reject) => {
            const finish = (error?: Error, result?: NeedleResult) => {
                clearTimeout(timeout);
                instance.off("message", message);
                instance.off("error", fail);
                instance.off("exit", exited);
                instance.unref();
                if (error) {
                    ready = false;
                    if (worker === instance) worker = undefined;
                    void instance.terminate();
                    reject(error);
                } else resolve(result!);
            };
            const fail = (error: Error) => finish(error);
            const exited = () => finish(new Error("Needle worker exited"));
            const timeout = setTimeout(() => {
                ready = false;
                worker = undefined;
                void instance.terminate();
                finish(new Error("Needle inference timed out"));
            }, 30000);
            const message = (event: NeedleResult & { id?: string; error?: string }) => {
                if (event.id === id) finish(event.error ? new Error(event.error) : undefined, event);
            };
            instance.on("message", message);
            instance.once("error", fail);
            instance.once("exit", exited);
            instance.postMessage({ ...job, id });
        });
    });
    queue = run.catch(() => undefined);
    return run;
}
export async function stopNeedle() {
    ready = false;
    const instance = worker;
    worker = undefined;
    if (instance) await instance.terminate();
}
