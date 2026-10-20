import { afterEach, expect, test, vi } from "vitest";

const playwright = vi.hoisted(() => ({ launch: vi.fn() }));
vi.mock("playwright", () => ({ chromium: { launch: playwright.launch } }));

import { printHtmlToPdfWithPlaywright } from "./playwrightPdfFromHtml";

afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
});

test("PDF rendering has a deadline and closes its browser when PDF generation stalls", async () => {
    vi.useFakeTimers();
    const closePage = vi.fn().mockResolvedValue(undefined);
    const closeBrowser = vi.fn().mockResolvedValue(undefined);
    const page = {
        route: vi.fn().mockResolvedValue(undefined),
        setContent: vi.fn().mockResolvedValue(undefined),
        pdf: vi.fn(() => new Promise<Buffer>(() => undefined)),
        close: closePage,
    };
    playwright.launch.mockResolvedValue({
        newPage: vi.fn().mockResolvedValue(page),
        close: closeBrowser,
    });

    const render = printHtmlToPdfWithPlaywright("<html><body>bounded</body></html>", {
        footerText: "test",
    });
    const outcome = render.then(
        () => "resolved",
        () => "rejected"
    );
    await vi.waitFor(() => expect(page.pdf).toHaveBeenCalledOnce());
    const rejection = expect(render).rejects.toThrow("PDF rendering timed out");
    await vi.advanceTimersByTimeAsync(60_001);

    expect(await outcome).toBe("rejected");
    await rejection;
    expect(closePage).toHaveBeenCalledOnce();
    expect(closeBrowser).toHaveBeenCalledOnce();
});
