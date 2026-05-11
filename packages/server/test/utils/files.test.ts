// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { existsSync, mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, describe, expect, it } from "vitest";
import { getMimeType } from "../../src/utils/files";

describe("getMimeType", () => {
    let dir: string;

    afterEach(() => {
        if (dir && existsSync(dir)) {
            // tmp is cleaned by OS eventually; file removal optional
        }
    });

    it("returns null when file does not exist", () => {
        expect(getMimeType(join(tmpdir(), "nonexistent-stacks-file-xyz.bin"))).toBeNull();
    });

    it("returns a MIME type when file exists", () => {
        dir = mkdtempSync(join(tmpdir(), "stacks-mime-"));
        const path = join(dir, "sample.json");
        writeFileSync(path, "{}");
        const mime = getMimeType(path);
        expect(mime).toBeTruthy();
        expect(mime).toMatch(/json/i);
    });
});
