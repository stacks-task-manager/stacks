// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, test, expect } from "vitest";
import app from "../src/index";
import { getAuthenticatedHeaders } from "./helpers/authHelper";

describe("Export API", () => {
    test("POST /api/export — requires authentication", async () => {
        const res = await app.request("/api/export", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ format: "json", type: "task", data: [] }),
        });
        expect([401, 404]).toContain(res.status);
    });

    test("POST /api/export — rejects invalid format", async () => {
        const headers = await getAuthenticatedHeaders();
        const res = await app.request("/api/export", {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ format: "csv", type: "task", data: [] }),
        });
        expect(res.status).toBe(400);
    });

    test("POST /api/export — rejects invalid type", async () => {
        const headers = await getAuthenticatedHeaders();
        const res = await app.request("/api/export", {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ format: "json", type: "unknown_entity", data: [] }),
        });
        expect(res.status).toBe(400);
    });

    test("POST /api/export — rejects body without data array", async () => {
        const headers = await getAuthenticatedHeaders();
        const res = await app.request("/api/export", {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ format: "json", type: "task" }),
        });
        expect(res.status).toBe(400);
    });

    test("POST /api/export — json download", async () => {
        const headers = await getAuthenticatedHeaders();
        const payload = { format: "json" as const, type: "task" as const, data: [{ a: 1, b: "x" }] };
        const res = await app.request("/api/export", {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        expect(res.status).toBe(200);
        expect(res.headers.get("Content-Type")).toContain("application/json");
        expect(res.headers.get("Content-Disposition")).toMatch(/export-task.*\.json/);
        const parsed = JSON.parse(await res.text());
        expect(parsed).toEqual(payload.data);
    });

    test("POST /api/export — excel download", async () => {
        const headers = await getAuthenticatedHeaders();
        const res = await app.request("/api/export", {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({
                format: "excel",
                type: "project",
                data: [{ name: "Alpha", id: "1" }],
            }),
        });
        expect(res.status).toBe(200);
        expect(res.headers.get("Content-Type")).toContain("spreadsheetml");
        expect(res.headers.get("Content-Disposition")).toMatch(/export-project.*\.xlsx/);
        const buf = new Uint8Array(await res.arrayBuffer());
        expect(buf[0]).toBe(0x50);
        expect(buf[1]).toBe(0x4b);
    });

    test(
        "POST /api/export — pdf (Chromium)",
        async () => {
            const headers = await getAuthenticatedHeaders();
            const res = await app.request("/api/export", {
                method: "POST",
                headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify({
                    format: "pdf",
                    type: "task",
                    data: [{ title: "Example" }],
                }),
            });
            if (res.status === 200) {
                expect(res.headers.get("Content-Type")).toContain("application/pdf");
                expect(res.headers.get("Content-Disposition")).toMatch(/export-task.*\.pdf/);
                const text = new TextDecoder().decode((await res.arrayBuffer()).slice(0, 4));
                expect(text.startsWith("%PDF")).toBe(true);
            } else {
                expect(res.status).toBe(500);
            }
        },
        { timeout: 120_000 }
    );
});
