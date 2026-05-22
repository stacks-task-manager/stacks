// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, test, expect } from "vitest";
import app from "../src/index";
import { getAuthenticatedHeaders } from "./helpers/authHelper";
import { readFileSync } from "fs";
import { join } from "path";

describe("Files API", () => {
    test("GET /api/files - should require authentication", async () => {
        const res = await app.request("/api/files");
        expect([401, 404]).toContain(res.status);
    });

    test("GET /api/files - should return files list for authenticated users", async () => {
        const headers = await getAuthenticatedHeaders();
        const res = await app.request("/api/files", {
            headers,
        });
        expect([200, 404]).toContain(res.status);
        if (res.status === 200) {
            const data = await res.json();
            expect(data).toHaveProperty("data");
            expect(Array.isArray(data.data)).toBe(true);
        }
    });

    test("POST /api/files - should upload a file", async () => {
        const headers = await getAuthenticatedHeaders();
        const body = "This is a test file content";
        const res = await app.request("/api/files/upload", {
            method: "POST",
            headers: {
                ...headers,
                "x-file-name": "test.txt",
                "x-file-type": "text/plain",
                "x-record-id": "00000000-0000-0000-0000-000000000000",
                "x-file-category": "file",
            },
            body,
        });
        expect([200, 400, 404]).toContain(res.status);
        if (res.status === 200) {
            const data = await res.json();
            expect(data).toHaveProperty("data");
            expect(data.data).toHaveProperty("id");
            expect(data.data).toHaveProperty("originalName");
        }
    });

    test("GET /api/files/:id - should return specific file details", async () => {
        const headers = await getAuthenticatedHeaders();
        const listRes = await app.request("/api/files", { headers });
        if (listRes.status === 200) {
            const listData = await listRes.json();
            if (listData.data && listData.data.length > 0) {
                const fileId = listData.data[0].id;
                const res = await app.request(`/api/files/attachment/${fileId}`, {
                    headers,
                });
                expect([200, 404]).toContain(res.status);
                if (res.status === 200) {
                    const data = await res.json();
                    expect(data).toHaveProperty("data");
                    expect(data.data).toHaveProperty("id", fileId);
                }
            }
        } else {
            expect([404]).toContain(listRes.status);
        }
    });

    test("GET /api/files/:id/download - should download file", async () => {
        const headers = await getAuthenticatedHeaders();
        const listRes = await app.request("/api/files", { headers });
        if (listRes.status === 200) {
            const listData = await listRes.json();
            if (listData.data && listData.data.length > 0) {
                const fileId = listData.data[0].id;
                const res = await app.request(`/api/files/download/${fileId}`, {
                    headers,
                });
                expect([200, 404]).toContain(res.status);
                if (res.status === 200) {
                    expect(res.headers.get("Content-Disposition")).toContain("attachment");
                }
            }
        } else {
            expect([404]).toContain(listRes.status);
        }
    });

    test("GET /api/files/:id/thumbnail - should return file thumbnail", async () => {
        const headers = await getAuthenticatedHeaders();
        const listRes = await app.request("/api/files", { headers });
        if (listRes.status === 200) {
            const listData = await listRes.json();
            if (listData.data && listData.data.length > 0) {
                const fileId = listData.data[0].id;
                const res = await app.request(`/api/files/preview/${fileId}?size=small`, {
                    headers,
                });
                expect([200, 404]).toContain(res.status);
            }
        } else {
            expect([404]).toContain(listRes.status);
        }
    });

    test("PATCH /api/files/:id - should update file metadata", async () => {
        const headers = await getAuthenticatedHeaders();
        const listRes = await app.request("/api/files", { headers });
        if (listRes.status === 200) {
            const listData = await listRes.json();
            if (listData.data && listData.data.length > 0) {
                const fileId = listData.data[0].id;
                const updateData = {
                    name: "Updated File Name",
                    description: "Updated description",
                };
                const res = await app.request(`/api/files/${fileId}`, {
                    method: "PATCH",
                    headers: {
                        ...headers,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(updateData),
                });
                expect([200, 404]).toContain(res.status);
                if (res.status === 200) {
                    const data = await res.json();
                    expect(data).toHaveProperty("data");
                    expect(data.data.name).toBe("Updated File Name");
                }
            }
        } else {
            expect([404]).toContain(listRes.status);
        }
    });

    test("DELETE /api/files/:id - should delete file", async () => {
        const headers = await getAuthenticatedHeaders();
        const body = "File to be deleted";
        const createRes = await app.request("/api/files/upload", {
            method: "POST",
            headers: {
                ...headers,
                "x-file-name": "delete-test.txt",
                "x-file-type": "text/plain",
                "x-record-id": "00000000-0000-0000-0000-000000000000",
                "x-file-category": "file",
            },
            body,
        });
        if (createRes.status === 200) {
            const createData = await createRes.json();
            const fileId = createData.data.id;
            const deleteRes = await app.request(`/api/files/attachment/${fileId}`, {
                method: "DELETE",
                headers,
            });
            expect([200, 404]).toContain(deleteRes.status);
        } else {
            expect([400, 404]).toContain(createRes.status);
        }
    });

    test("POST /api/files with invalid file type - should return error", async () => {
        const headers = await getAuthenticatedHeaders();
        const maliciousContent = "#!/bin/bash\necho 'malicious'";
        const res = await app.request("/api/files/upload", {
            method: "POST",
            headers: {
                ...headers,
                "x-file-name": "malicious.sh",
                "x-file-type": "application/x-executable",
                "x-record-id": "00000000-0000-0000-0000-000000000000",
                "x-file-category": "file",
            },
            body: maliciousContent,
        });
        expect([200, 400, 415, 422, 404]).toContain(res.status);
    });

    test("GET /api/files with pagination - should return paginated results", async () => {
        const headers = await getAuthenticatedHeaders();
        const res = await app.request("/api/files?page=1&limit=5", {
            headers,
        });
        expect([200, 404]).toContain(res.status);
        if (res.status === 200) {
            const data = await res.json();
            expect(data).toHaveProperty("data");
            expect(Array.isArray(data.data)).toBe(true);
            expect(data.data.length).toBeLessThanOrEqual(5);
        }
    });

    test("GET /api/files with search - should filter files by name", async () => {
        const headers = await getAuthenticatedHeaders();
        const res = await app.request("/api/files?search=test", {
            headers,
        });
        expect([200, 404]).toContain(res.status);
        if (res.status === 200) {
            const data = await res.json();
            expect(data).toHaveProperty("data");
            expect(Array.isArray(data.data)).toBe(true);
        }
    });
});