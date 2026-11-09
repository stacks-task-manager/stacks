import { openInNewTab } from "../browser";

describe("openInNewTab", () => {
    let open: jest.SpyInstance;

    beforeEach(() => {
        open = jest.spyOn(window, "open").mockImplementation(() => null);
    });

    afterEach(() => {
        open.mockRestore();
    });

    it.each([
        "javascript:window.__xssProbe=1",
        "JaVaScRiPt:window.__xssProbe=1",
        "java\nscript:window.__xssProbe=1",
        "data:text/html,<script>alert(1)</script>",
        "file:///etc/passwd",
    ])("does not open an unsafe URL: %s", url => {
        openInNewTab(url);

        expect(open).not.toHaveBeenCalled();
    });

    it.each([
        "https://example.com/path",
        "/api/files/download/123",
        "mailto:help@example.com",
        "tel:+123456789",
    ])("opens supported links with opener isolation: %s", url => {
        openInNewTab(url);

        expect(open).toHaveBeenCalledWith(url, "_blank", "noopener,noreferrer");
    });
});
