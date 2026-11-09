import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ThumbnailService } from "./thumbnailService";

describe("thumbnail handling of malformed images", () => {
    let directory: string;

    afterEach(() => {
        if (directory) rmSync(directory, { recursive: true, force: true });
    });

    it("returns decoder errors for a truncated PNG without writing thumbnails", async () => {
        directory = mkdtempSync(join(tmpdir(), "stacks-malformed-image-"));
        const inputPath = join(directory, "truncated.png");
        const outputDirectory = join(directory, "previews");
        // Valid PNG signature followed by an incomplete IHDR chunk.
        writeFileSync(inputPath, Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82]));

        const result = await ThumbnailService.generateMultipleThumbnails(
            inputPath,
            outputDirectory,
            "truncated-fixture",
            "image/png"
        );

        expect(result.small).toBeNull();
        expect(result.large).toBeNull();
        expect(result.errors.length).toBeGreaterThan(0);
        expect(readdirSync(outputDirectory)).toEqual([]);
    });
});
