// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { beforeEach, expect, test, vi } from "vitest";
import { setTranslations } from "@stacks/translations";
import { Logger } from "../../utils/logger";

vi.mock("./playwrightPdfFromHtml", () => ({
    printHtmlToPdfWithPlaywright: vi.fn().mockRejectedValue(new Error("browser exploded with secret detail")),
}));

import { generatePdfFromHtml } from "./generatePdfFromHtml";

beforeEach(() => {
    setTranslations({
        "PDF export failed": "Unable to create the PDF export.",
        "Export report": "Export report",
        Generated: "Generated",
        Task: "Task",
    });
});

test("logs the renderer cause but returns a non-sensitive localized error", async () => {
    const log = vi.spyOn(Logger, "error").mockImplementation(() => undefined);
    await expect(
        generatePdfFromHtml({ type: "task", locale: "en", data: { title: "Failure fixture" } })
    ).rejects.toThrow("Unable to create the PDF export");
    expect(log).toHaveBeenCalledWith(
        "PDF export rendering failed",
        expect.objectContaining({ message: "browser exploded with secret detail" }),
        expect.objectContaining({ type: "task", locale: "en" })
    );
    expect(String(log.mock.calls[0]?.[0])).not.toContain("secret detail");
});
