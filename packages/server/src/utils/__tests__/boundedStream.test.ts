import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { writeBoundedStreamToFile } from "../boundedStream";

describe("writeBoundedStreamToFile", () => {
    let directory: string;
    let filePath: string;
    afterEach(() => {
        if (directory) rmSync(directory, { recursive: true, force: true });
    });
    const destination = () => {
        directory = mkdtempSync(join(tmpdir(), "stacks-upload-test-"));
        filePath = join(directory, "upload.tmp");
        return filePath;
    };

    it("accepts a stream exactly at the limit and reports actual bytes", async () => {
        const progress = vi.fn();
        const path = destination();
        const result = await writeBoundedStreamToFile(
            new Blob(["12345"]).stream() as ReadableStream<Uint8Array>,
            path,
            5,
            progress
        );
        expect(result).toEqual({
            size: 5,
            hash: createHash("sha256").update("12345").digest("hex"),
        });
        expect(readFileSync(path, "utf8")).toBe("12345");
        expect(statSync(path).mode & 0o777).toBe(0o600);
        expect(progress).toHaveBeenLastCalledWith(5);
    });

    it("accepts an upload exactly at the production 25 MiB limit", async () => {
        const maxBytes = 25 * 1024 * 1024;
        let emitted = 0;
        const stream = new ReadableStream<Uint8Array>({
            pull(controller) {
                const size = Math.min(64 * 1024, maxBytes - emitted);
                if (size === 0) {
                    controller.close();
                    return;
                }
                emitted += size;
                controller.enqueue(new Uint8Array(size));
            },
        });
        const path = destination();

        await expect(writeBoundedStreamToFile(stream, path, maxBytes)).resolves.toMatchObject({
            size: maxBytes,
        });
        expect(statSync(path).size).toBe(maxBytes);
    });

    it("rejects the first byte over the production 25 MiB limit", async () => {
        const maxBytes = 25 * 1024 * 1024;
        let emitted = 0;
        let cancelled = false;
        const stream = new ReadableStream<Uint8Array>({
            pull(controller) {
                const size = Math.min(64 * 1024, maxBytes + 1 - emitted);
                if (size === 0) return new Promise(() => undefined);
                emitted += size;
                controller.enqueue(new Uint8Array(size));
            },
            cancel() {
                cancelled = true;
            },
        });
        const path = destination();

        await expect(writeBoundedStreamToFile(stream, path, maxBytes)).rejects.toThrow(
            "Upload exceeds the maximum size"
        );
        expect(cancelled).toBe(true);
        expect(() => statSync(path)).toThrow();
    });

    it("rejects the first chunk over the limit and cancels the source", async () => {
        let cancelled = false;
        const stream = new ReadableStream<Uint8Array>({
            pull(controller) {
                controller.enqueue(new Uint8Array(4));
            },
            cancel() {
                cancelled = true;
            },
        });
        await expect(writeBoundedStreamToFile(stream, destination(), 3)).rejects.toThrow(
            "Upload exceeds the maximum size"
        );
        expect(cancelled).toBe(true);
        expect(() => statSync(filePath)).toThrow();
    });

    it("cancels a stalled stream when the total upload deadline expires", async () => {
        let cancelled = false;
        const stream = new ReadableStream<Uint8Array>({
            pull() {
                return new Promise(() => undefined);
            },
            cancel() {
                cancelled = true;
            },
        });
        await expect(writeBoundedStreamToFile(stream, destination(), 10, undefined, 10)).rejects.toThrow(
            "Upload deadline exceeded"
        );
        expect(cancelled).toBe(true);
        expect(() => statSync(filePath)).toThrow();
    });

    it("cancels a stalled stream and removes its partial file when the request is aborted", async () => {
        let cancelled = false;
        const controller = new AbortController();
        const stream = new ReadableStream<Uint8Array>({
            pull() {
                return new Promise(() => undefined);
            },
            cancel() {
                cancelled = true;
            },
        });
        const path = destination();
        const upload = writeBoundedStreamToFile(stream, path, 10, undefined, 1_000, controller.signal);

        controller.abort();

        await expect(upload).rejects.toThrow("Upload aborted");
        expect(cancelled).toBe(true);
        expect(() => statSync(path)).toThrow();
    });

    it("rejects an empty stream", async () => {
        await expect(
            writeBoundedStreamToFile(new Blob([]).stream() as ReadableStream<Uint8Array>, destination(), 10)
        ).rejects.toThrow("Upload cannot be empty");
    });

    it("propagates a source read error", async () => {
        const stream = new ReadableStream<Uint8Array>({
            pull(controller) {
                controller.error(new Error("source failed"));
            },
        });
        await expect(writeBoundedStreamToFile(stream, destination(), 10)).rejects.toThrow("source failed");
    });

    it("cancels the source if opening the request-owned temp file fails", async () => {
        let cancelled = false;
        const path = destination();
        writeFileSync(path, "pre-existing");
        const stream = new ReadableStream<Uint8Array>({
            pull(controller) {
                controller.enqueue(new Uint8Array([1]));
            },
            cancel() {
                cancelled = true;
            },
        });

        await expect(writeBoundedStreamToFile(stream, path, 10)).rejects.toThrow();

        expect(cancelled).toBe(true);
        expect(readFileSync(path, "utf8")).toBe("pre-existing");
    });
});
