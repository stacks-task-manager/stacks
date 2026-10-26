// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
export const MAX_DECODED_IMAGE_PIXELS = 40_000_000;
export const MAX_CONCURRENT_THUMBNAIL_JOBS = 2;

export function createConcurrencyLimiter(limit: number) {
    if (!Number.isSafeInteger(limit) || limit < 1) throw new RangeError("Concurrency limit must be positive");
    let active = 0;
    const waiting: Array<() => void> = [];

    return async function run<T>(operation: () => Promise<T>): Promise<T> {
        if (active >= limit) await new Promise<void>(resolve => waiting.push(resolve));
        active++;
        try {
            return await operation();
        } finally {
            active--;
            waiting.shift()?.();
        }
    };
}

export function assertImageDimensionsWithinLimit(
    width: number | undefined,
    height: number | undefined,
    maxPixels = MAX_DECODED_IMAGE_PIXELS
): void {
    if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width! <= 0 || height! <= 0) {
        throw new Error("Image dimensions are invalid");
    }
    if (width! * height! > maxPixels) throw new Error("Image exceeds the pixel limit");
}
