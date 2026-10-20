import { describe, expect, it } from "vitest";
import { attachmentDownloadDisposition } from "../attachmentHeader";

describe("attachmentDownloadDisposition", () => {
    it("keeps Unicode while preventing filename and header injection", () => {
        const header = attachmentDownloadDisposition('folder/東京";evil\r\nX-Injected: yes.txt');
        expect(header).toMatch(/^attachment; filename="[\x20-\x7e]+"; filename\*=UTF-8''/);
        expect(header).not.toContain("\r");
        expect(header).not.toContain("\n");
        expect(header).not.toContain('";evil');
        expect(header).toContain("%E6%9D%B1%E4%BA%AC");
    });
});
