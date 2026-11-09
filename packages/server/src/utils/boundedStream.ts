// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { open, unlink } from "node:fs/promises";
import { createHash } from "node:crypto";

export interface BoundedStreamResult {
    size: number;
    hash: string;
}

export class StreamLimitExceededError extends RangeError {
    constructor() {
        super("Upload exceeds the maximum size");
        this.name = "StreamLimitExceededError";
    }
}

/** Write request bytes sequentially to a private file while enforcing the actual byte ceiling. */
export async function writeBoundedStreamToFile(
    stream: ReadableStream<Uint8Array>,
    filePath: string,
    maxBytes: number,
    onProgress: (bytes: number) => void = () => undefined,
    deadlineMs = 60_000,
    signal?: AbortSignal
): Promise<BoundedStreamResult> {
    const reader = stream.getReader();
    let file: Awaited<ReturnType<typeof open>> | undefined;
    let total = 0;
    const hash = createHash("sha256");
    let timer: ReturnType<typeof setTimeout> | undefined;
    let abortHandler: (() => void) | undefined;
    try {
        if (signal?.aborted) throw new Error("Upload aborted");
        file = await open(filePath, "wx", 0o600);
        const deadline = new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error("Upload deadline exceeded")), deadlineMs);
        });
        const aborted = new Promise<never>((_, reject) => {
            abortHandler = () => reject(new Error("Upload aborted"));
            signal?.addEventListener("abort", abortHandler, { once: true });
            if (signal?.aborted) abortHandler();
        });
        return await Promise.race([
            (async () => {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    if (!value) continue;
                    total += value.byteLength;
                    if (total > maxBytes) throw new StreamLimitExceededError();
                    hash.update(value);
                    let offset = 0;
                    while (offset < value.byteLength) {
                        const { bytesWritten } = await file!.write(value, offset, value.byteLength - offset);
                        if (bytesWritten === 0) throw new Error("Upload temp file write made no progress");
                        offset += bytesWritten;
                    }
                    onProgress(total);
                }
                if (total === 0) throw new RangeError("Upload cannot be empty");
                await file!.sync();
                return { size: total, hash: hash.digest("hex") };
            })(),
            deadline,
            aborted,
        ]);
    } catch (error) {
        await reader.cancel(error).catch(() => undefined);
        if (file) await unlink(filePath).catch(() => undefined);
        throw error;
    } finally {
        if (timer) clearTimeout(timer);
        if (abortHandler) signal?.removeEventListener("abort", abortHandler);
        reader.releaseLock();
        await file?.close();
    }
}
