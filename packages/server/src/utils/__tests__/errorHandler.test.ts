// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { Errors, ErrorCode } from "../../errors";
import { errorHandler } from "../errorHandler";
import { registerResponseHelpers } from "../../services/response";

describe("errorHandler", () => {
    it("formats AppError with translated message", async () => {
        const app = new Hono();
        registerResponseHelpers(app);
        app.onError((err, c) => errorHandler(err, c));
        app.get("/t", () => {
            throw Errors.notFound("Project not found");
        });

        const res = await app.request("/t", { headers: { Locale: "en" } });
        expect(res.status).toBe(404);
        const body = (await res.json()) as { success: boolean; message: string; code?: string };
        expect(body.success).toBe(false);
        expect(body.message).toBe("Project not found");
        expect(body.code).toBe(ErrorCode.NOT_FOUND);
    });

    it("handles legacy Error with numeric cause", async () => {
        const app = new Hono();
        registerResponseHelpers(app);
        app.onError((err, c) => errorHandler(err, c));
        app.get("/legacy", () => {
            throw new Error("Project not found", { cause: 404 });
        });

        const res = await app.request("/legacy", { headers: { Locale: "en" } });
        expect(res.status).toBe(404);
        const body = (await res.json()) as { success: boolean; message: string };
        expect(body.message).toBe("Project not found");
    });
});
