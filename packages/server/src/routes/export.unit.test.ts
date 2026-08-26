// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { EXPORT_ENTITY_TYPES } from "@stacks/types";
import { Hono } from "hono";
import { beforeEach, describe, expect, test, vi } from "vitest";

const { generatePdf } = vi.hoisted(() => ({
    generatePdf: vi.fn(async () => Buffer.from("%PDF-mocked")),
}));

vi.mock("../services/export/generatePdfFromHtml", () => ({
    generatePdfFromHtml: generatePdf,
}));

import exportRouter from "./export";

const app = new Hono();
app.use("*", async (context, next) => {
    context.set("locale", "en");
    await next();
});
app.route("/api/export", exportRouter);

describe("deterministic PDF export routes", () => {
    beforeEach(() => generatePdf.mockClear());

    test.each(EXPORT_ENTITY_TYPES)("renders a %s PDF with the correct attachment contract", async type => {
        const response = await app.request("/api/export", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ format: "pdf", type, title: `${type} title`, data: { id: "1" } }),
        });

        expect(response.status).toBe(200);
        expect(response.headers.get("Content-Type")).toContain("application/pdf");
        expect(response.headers.get("Content-Disposition")).toMatch(new RegExp(`${type} title.*\\.pdf`));
        expect(Buffer.from(await response.arrayBuffer()).toString()).toBe("%PDF-mocked");
        expect(generatePdf).toHaveBeenCalledWith({
            type,
            title: `${type} title`,
            locale: "en",
            data: { id: "1" },
        });
    });

    test("returns a valid attachment header for a Unicode title", async () => {
        const response = await app.request("/api/export", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ format: "pdf", type: "project", title: "東京計画", data: {} }),
        });

        expect(response.status).toBe(200);
        expect(response.headers.get("Content-Disposition")).toContain(
            "filename*=UTF-8''%E6%9D%B1%E4%BA%AC%E8%A8%88%E7%94%BB"
        );
    });
});
