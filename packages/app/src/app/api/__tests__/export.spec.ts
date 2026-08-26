// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.

jest.mock("../request", () => ({
    __esModule: true,
    default: { post: jest.fn() },
}));

import { ExportAPI } from "../export";
import request from "../request";

const mockPost = request.post as jest.Mock;

describe("ExportAPI", () => {
    let click: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        mockPost.mockResolvedValue({
            data: new Blob(["file"]),
            headers: { "content-disposition": 'attachment; filename="export.pdf"' },
        });
        URL.createObjectURL = jest.fn(() => "blob:export");
        URL.revokeObjectURL = jest.fn();
        click = jest.fn();
        jest.spyOn(document, "createElement").mockReturnValue({
            click,
            remove: jest.fn(),
            style: {},
        } as unknown as HTMLAnchorElement);
        jest.spyOn(document.body, "appendChild").mockImplementation(node => node);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test("posts the shared export request and downloads its blob", async () => {
        const request = { format: "pdf" as const, type: "task" as const, data: { id: "task-1" } };

        await ExportAPI.export(request);

        expect(mockPost).toHaveBeenCalledWith("/api/export", request, { responseType: "blob" });
        expect(URL.createObjectURL).toHaveBeenCalled();
        expect(click).toHaveBeenCalled();
        expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:export");
    });

    test("uses the server's UTF-8 attachment filename", async () => {
        mockPost.mockResolvedValue({
            data: new Blob(["file"]),
            headers: {
                "content-disposition":
                    "attachment; filename=\"report.pdf\"; filename*=UTF-8''%E6%9D%B1%E4%BA%AC.pdf",
            },
        });

        await ExportAPI.export({ format: "pdf", type: "project", data: {} });

        expect(document.createElement).toHaveReturnedWith(expect.objectContaining({ download: "東京.pdf" }));
    });

    test("propagates request failures without creating a download", async () => {
        mockPost.mockRejectedValue(new Error("export failed"));

        await expect(ExportAPI.export({ format: "json", type: "company", data: [] })).rejects.toThrow(
            "export failed"
        );
        expect(URL.createObjectURL).not.toHaveBeenCalled();
    });
});
