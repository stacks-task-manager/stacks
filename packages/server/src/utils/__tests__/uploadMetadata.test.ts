import { describe, expect, it } from "vitest";
import { FILES_TYPE } from "@stacks/types";
import { validUploadMetadata } from "../uploadMetadata";

describe("upload metadata validation", () => {
    it("accepts a normal filename and supported category", () => {
        expect(validUploadMetadata("notes.pdf", FILES_TYPE.FILE)).toBe(true);
    });

    it.each(["../secret.txt", "folder\\secret.txt", "bad\nname.txt", ""])(
        "rejects unsafe filename %j",
        name => expect(validUploadMetadata(name, FILES_TYPE.FILE)).toBe(false)
    );

    it("measures the 255-byte filename limit in UTF-8", () => {
        expect(validUploadMetadata("a".repeat(255), FILES_TYPE.FILE)).toBe(true);
        expect(validUploadMetadata("a".repeat(256), FILES_TYPE.FILE)).toBe(false);
        expect(validUploadMetadata("é".repeat(128), FILES_TYPE.FILE)).toBe(false);
    });

    it("rejects unsupported categories", () => {
        expect(validUploadMetadata("notes.txt", "not-a-category")).toBe(false);
    });
});
