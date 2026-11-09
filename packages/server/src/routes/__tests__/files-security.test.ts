// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

import files from "../files";
import { registerResponseHelpers } from "../../services/response";
import { StreamLimitExceededError } from "../../utils/boundedStream";

const mocks = vi.hoisted(() => ({
    getPreviewByAttachmentId: vi.fn(),
    download: vi.fn(),
    assertAttachmentParentWritable: vi.fn(),
    uploadFileStream: vi.fn(),
}));

vi.mock("../../loaders/files", () => ({
    FilesLoader: mocks,
}));

const attachmentId = "22222222-2222-4222-8222-222222222222";

describe("file response security", () => {
    const app = new Hono();
    registerResponseHelpers(app);
    app.route("/files", files);

    beforeEach(() => {
        mocks.getPreviewByAttachmentId.mockReset();
        mocks.download.mockReset();
        mocks.assertAttachmentParentWritable.mockReset();
    });

    it("makes successful previews private and non-cacheable", async () => {
        mocks.getPreviewByAttachmentId.mockResolvedValue({
            buffer: Buffer.from("preview"),
            mimeType: "image/png",
        });

        const response = await app.request(`/files/preview/${attachmentId}`);

        expect(response.status).toBe(200);
        expect(response.headers.get("cache-control")).toBe("private, no-store");
        expect(await response.text()).toBe("preview");
    });

    it("prevents caching and header injection in downloads", async () => {
        mocks.download.mockResolvedValue({
            buffer: Buffer.from("download"),
            mimeType: "text/plain",
            originalName: "report.txt\r\nX-Injected: true",
        });

        const response = await app.request(`/files/download/${attachmentId}`);

        expect(response.status).toBe(200);
        expect(response.headers.get("cache-control")).toBe("private, no-store");
        expect(response.headers.get("content-disposition")).not.toContain("\r");
        expect(response.headers.get("content-disposition")).not.toContain("\n");
        expect(response.headers.get("x-injected")).toBeNull();
        expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    });

    it.each(["a", "b"] as const)("returns the same no-op response for valid hash prefix %s", async prefix => {
        const response = await app.request("/files/check-existing", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                hash: prefix.repeat(64),
                recordId: attachmentId,
                type: "file",
                originalName: "notes.txt",
            }),
        });

        expect(response.status).toBe(200);
        expect(await response.json()).toMatchObject({ data: null });
        expect(mocks.assertAttachmentParentWritable).toHaveBeenCalledWith(attachmentId, "file");
    });

    it("rejects malformed hash preflight input", async () => {
        const response = await app.request("/files/check-existing", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                hash: "not-a-hash",
                recordId: attachmentId,
                type: "file",
                originalName: "notes.txt",
            }),
        });

        expect(response.status).toBe(400);
    });

    it("returns 413 when the streamed upload exceeds its byte limit", async () => {
        mocks.uploadFileStream.mockRejectedValue(new StreamLimitExceededError());

        const response = await app.request("/files/upload", {
            method: "POST",
            headers: {
                "x-file-name": "notes.txt",
                "x-record-id": attachmentId,
                "x-file-category": "file",
                "Content-Length": "1",
            },
            body: new Uint8Array([1, 2]),
        });

        expect(response.status).toBe(413);
        const body = await response.json();
        expect(body).toMatchObject({ success: false, code: "BAD_REQUEST" });
        expect(JSON.stringify(body)).not.toContain("maximum size");
    });
});
