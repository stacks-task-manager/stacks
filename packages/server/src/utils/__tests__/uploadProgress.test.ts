import { describe, expect, it } from "vitest";
import { visibleUploadProgress } from "../uploadProgress";

describe("visibleUploadProgress", () => {
    const record = { progress: 10, total: 20, hash: "hash", userId: "user-a", tenant: "tenant-a" };

    it("returns progress without ownership metadata to its owner", () => {
        expect(visibleUploadProgress(record, "user-a", "tenant-a")).toEqual({
            progress: 10,
            total: 20,
            hash: "hash",
        });
    });

    it("does not return progress to another user or tenant", () => {
        expect(visibleUploadProgress(record, "user-b", "tenant-a")).toBeNull();
        expect(visibleUploadProgress(record, "user-a", "tenant-b")).toBeNull();
        expect(visibleUploadProgress(undefined, "user-a", "tenant-a")).toBeNull();
    });
});
