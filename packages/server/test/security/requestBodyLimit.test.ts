// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { afterEach, describe, expect, it, vi } from "vitest";
import { AttachmentEntity, DocumentEntity, PermissionEntity, UserEntity } from "@stacks/db";
import { RECORDTYPE } from "@stacks/types";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import app from "../../src/index";
import { getAuthToken } from "../helpers/authHelper";

const fixtureRows: Array<{ entity: any; id: string }> = [];

afterEach(async () => {
    vi.restoreAllMocks();
    for (const { entity, id } of fixtureRows.reverse()) {
        await entity.destroy({ where: { id }, force: true });
    }
    fixtureRows.length = 0;
});

describe("pre-parser request body limits", () => {
    it.each(["missing", "dishonest"])(
        "rejects oversized streamed JSON with %s Content-Length",
        async lengthMode => {
            const findUser = vi.spyOn(UserEntity, "findOne");
            const bytes = new TextEncoder().encode(
                JSON.stringify({ email: "body-limit@example.test", password: "x".repeat(1024 * 1024) })
            );
            const body = new ReadableStream<Uint8Array>({
                start(controller) {
                    for (let offset = 0; offset < bytes.length; offset += 32 * 1024) {
                        controller.enqueue(bytes.slice(offset, offset + 32 * 1024));
                    }
                    controller.close();
                },
            });
            const headers = new Headers({ "Content-Type": "application/json" });
            if (lengthMode === "dishonest") headers.set("Content-Length", "1");
            const request = new Request("http://localhost/auth/login", {
                method: "POST",
                headers,
                body,
                duplex: "half",
            } as RequestInit & { duplex: "half" });

            const response = await app.fetch(request);

            expect(response.status).toBe(413);
            expect(findUser).not.toHaveBeenCalled();
        }
    );

    it("accepts an ordinary JSON body exactly at 1 MiB", async () => {
        const prefix = '{"email":"boundary@example.test","password":"';
        const suffix = '"}';
        const body = prefix + "x".repeat(1_048_576 - prefix.length - suffix.length) + suffix;
        expect(new TextEncoder().encode(body)).toHaveLength(1_048_576);

        const response = await app.request("/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
        });

        expect(response.status).toBe(401);
    });

    it("uses the smaller 256 KiB body limit for MCP", async () => {
        const request = new Request("http://localhost/api/mcp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: new Uint8Array(256 * 1024 + 1),
        });

        const response = await app.fetch(request);

        expect(response.status).toBe(413);
    });

    it("leaves upload bytes, including a dishonest Content-Length, to the dedicated byte counter", async () => {
        const request = new Request("http://localhost/api/files/upload", {
            method: "POST",
            headers: { "Content-Type": "application/octet-stream", "Content-Length": "1" },
            body: new Uint8Array(1_048_577),
        });

        const response = await app.fetch(request);

        expect(response.status).toBe(401);
    });

    it("rejects an authenticated oversized upload with dishonest Content-Length before persistence", async () => {
        const credentials = JSON.parse(readFileSync("testUser.json", "utf8")) as { email: string };
        const user = await UserEntity.findOne({ where: { email: credentials.email } });
        expect(user).not.toBeNull();
        const userId = String(user!.get("id"));
        const tenant = String(user!.get("tenant"));
        const documentId = randomUUID();

        await DocumentEntity.create({
            id: documentId,
            title: "oversized upload route fixture",
            type: RECORDTYPE.FILE,
            order: 0,
            tenant,
            createdBy: userId,
            updatedBy: userId,
        });
        fixtureRows.push({ entity: DocumentEntity, id: documentId });
        await PermissionEntity.create({
            id: documentId,
            owner: userId,
            isPublic: false,
            visibleUsers: [],
            visibleRoles: [],
            tenant,
            createdBy: userId,
            updatedBy: userId,
        });
        fixtureRows.push({ entity: PermissionEntity, id: documentId });

        const maxBytes = 25 * 1024 * 1024;
        let emitted = 0;
        const body = new ReadableStream<Uint8Array>({
            pull(controller) {
                const size = Math.min(64 * 1024, maxBytes + 1 - emitted);
                if (size === 0) return new Promise(() => undefined);
                emitted += size;
                controller.enqueue(new Uint8Array(size));
            },
        });
        const response = await app.fetch(
            new Request("http://localhost/api/files/upload", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${await getAuthToken()}`,
                    "Content-Type": "application/octet-stream",
                    "Content-Length": "1",
                    "x-file-name": "oversized.txt",
                    "x-file-category": "file",
                    "x-file-type": "text/plain",
                    "x-record-id": documentId,
                },
                body,
                duplex: "half",
            } as RequestInit & { duplex: "half" })
        );

        expect(response.status).toBe(413);
        expect(await response.json()).toMatchObject({ success: false, code: "BAD_REQUEST" });
        expect(await AttachmentEntity.count({ where: { recordId: documentId, tenant, deleted: null } })).toBe(
            0
        );
    });
});
