import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sharpMocks = vi.hoisted(() => ({
    metadata: vi.fn(),
    timeout: vi.fn(),
    resize: vi.fn(),
    jpeg: vi.fn(),
    toFile: vi.fn(),
}));

vi.mock("sharp", () => ({
    default: () => ({
        metadata: sharpMocks.metadata,
        timeout: sharpMocks.timeout,
        resize: sharpMocks.resize,
        jpeg: sharpMocks.jpeg,
        toFile: sharpMocks.toFile,
    }),
}));

import { ThumbnailService } from "./thumbnailService";

describe("thumbnail pixel limit integration", () => {
    let directory: string;
    let inputPath: string;

    beforeEach(() => {
        directory = mkdtempSync(join(tmpdir(), "stacks-thumbnail-test-"));
        inputPath = join(directory, "input.png");
        writeFileSync(inputPath, "fixture");
        sharpMocks.metadata.mockResolvedValue({ width: 8001, height: 5000 });
        sharpMocks.timeout.mockReturnThis();
        sharpMocks.resize.mockReturnThis();
        sharpMocks.jpeg.mockReturnThis();
        sharpMocks.toFile.mockResolvedValue(undefined);
    });

    afterEach(() => rmSync(directory, { recursive: true, force: true }));

    it("rejects over-budget metadata before invoking resize", async () => {
        const result = await ThumbnailService.generateMultipleThumbnails(
            inputPath,
            join(directory, "previews"),
            "pixel-limit-fixture",
            "image/png"
        );

        expect(result.small).toBeNull();
        expect(result.large).toBeNull();
        expect(result.errors.join(" ")).toContain("Image exceeds the pixel limit");
        expect(sharpMocks.timeout).toHaveBeenCalledWith({ seconds: 15 });
        expect(sharpMocks.resize).not.toHaveBeenCalled();
    });
});
