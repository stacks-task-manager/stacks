// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { expect, test } from "vitest";
import { generatePdfFromHtml } from "./generatePdfFromHtml";

test("Chromium produces a valid PDF from the branded task template", async () => {
    const pdf = await generatePdfFromHtml({
        type: "task",
        locale: "en",
        title: "Chromium smoke test",
        data: { title: "A rendered task", progress: 0, description: "Smoke test" },
    });
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    expect(pdf.length).toBeGreaterThan(10_000);
}, 120_000);
