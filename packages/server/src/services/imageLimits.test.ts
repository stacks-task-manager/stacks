import { describe, expect, it } from "vitest";
import {
    assertImageDimensionsWithinLimit,
    createConcurrencyLimiter,
    MAX_CONCURRENT_THUMBNAIL_JOBS,
    MAX_DECODED_IMAGE_PIXELS,
} from "./imageLimits";

describe("image pixel limits", () => {
    it("accepts valid dimensions at the configured boundary", () => {
        expect(() => assertImageDimensionsWithinLimit(8000, 5000)).not.toThrow();
    });

    it("rejects dimensions that exceed the pixel budget before processing", () => {
        expect(() => assertImageDimensionsWithinLimit(8001, 5000)).toThrow("Image exceeds the pixel limit");
    });

    it("rejects missing, non-integer, and non-positive dimensions", () => {
        expect(() => assertImageDimensionsWithinLimit(undefined, 10)).toThrow("Image dimensions are invalid");
        expect(() => assertImageDimensionsWithinLimit(1.5, 10)).toThrow("Image dimensions are invalid");
        expect(() => assertImageDimensionsWithinLimit(0, 10)).toThrow("Image dimensions are invalid");
    });

    it("uses a fixed 40-million-pixel ceiling", () => {
        expect(MAX_DECODED_IMAGE_PIXELS).toBe(40_000_000);
    });

    it("limits concurrent jobs and releases capacity after a rejected job", async () => {
        const run = createConcurrencyLimiter(2);
        let active = 0;
        let maximumActive = 0;
        const job = (fail = false) =>
            run(async () => {
                active++;
                maximumActive = Math.max(maximumActive, active);
                await new Promise(resolve => setTimeout(resolve, 5));
                active--;
                if (fail) throw new Error("job failed");
                return "done";
            });

        const outcomes = await Promise.allSettled([job(true), job(), job()]);
        expect(outcomes.filter(outcome => outcome.status === "rejected")).toHaveLength(1);
        expect(await job()).toBe("done");
        expect(maximumActive).toBe(2);
        expect(MAX_CONCURRENT_THUMBNAIL_JOBS).toBe(2);
    });
});
