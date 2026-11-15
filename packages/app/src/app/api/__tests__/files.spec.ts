// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.

const mockGetCsrfToken = jest.fn();
const mockClearCsrfToken = jest.fn();

jest.mock("../request", () => ({
    __esModule: true,
    default: { get: jest.fn(), delete: jest.fn() },
    getCsrfToken: () => mockGetCsrfToken(),
    clearCsrfToken: () => mockClearCsrfToken(),
}));

import { FILES_TYPE } from "@stacks/types";
import { FilesAPI } from "../files";

/** Minimal XMLHttpRequest stand-in that records headers and lets the test answer. */
class FakeXhr {
    static last: FakeXhr;
    static nextStatus = 200;

    upload = { addEventListener: jest.fn() };
    headers: Record<string, string> = {};
    status = FakeXhr.nextStatus;
    responseText = JSON.stringify({ data: { id: "attachment-1" } });

    private listeners: Record<string, Array<() => void>> = {};

    constructor() {
        FakeXhr.last = this;
    }

    addEventListener(event: string, handler: () => void) {
        this.listeners[event] = [...(this.listeners[event] ?? []), handler];
    }

    open = jest.fn();

    setRequestHeader(name: string, value: string) {
        this.headers[name] = value;
    }

    send = jest.fn(() => {
        (this.listeners.load ?? []).forEach(handler => handler());
    });
}

describe("FilesAPI.upload", () => {
    const originalXhr = global.XMLHttpRequest;

    beforeEach(() => {
        jest.clearAllMocks();
        mockGetCsrfToken.mockResolvedValue("csrf-token");
        FakeXhr.nextStatus = 200;
        global.XMLHttpRequest = FakeXhr as unknown as typeof XMLHttpRequest;
    });

    afterEach(() => {
        global.XMLHttpRequest = originalXhr;
    });

    test("presents the browser CSRF token with the streamed upload", async () => {
        const file = new File(["content"], "report.pdf", { type: "application/pdf" });

        await FilesAPI.upload(file, "record-1", FILES_TYPE.FILE);

        expect(FakeXhr.last.headers["x-csrf-token"]).toBe("csrf-token");
        expect(FakeXhr.last.headers["x-file-name"]).toBe("report.pdf");
        expect(FakeXhr.last.headers["x-record-id"]).toBe("record-1");
    });

    test("drops the cached token when the server rejects it", async () => {
        FakeXhr.nextStatus = 403;
        const file = new File(["content"], "report.pdf", { type: "application/pdf" });

        await expect(FilesAPI.upload(file, "record-1", FILES_TYPE.FILE)).rejects.toThrow(
            "Upload failed with status 403"
        );
        expect(mockClearCsrfToken).toHaveBeenCalled();
    });
});
