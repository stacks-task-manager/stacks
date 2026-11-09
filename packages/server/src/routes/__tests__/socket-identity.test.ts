// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * T02: idle connections re-check their identity at most once per interval.
 * This is the pure scheduling predicate behind that bound.
 */

import { describe, it, expect, vi } from "vitest";
import { needsIdleRevalidation } from "../socket";

vi.mock("../../entity/User");
vi.mock("../../services/userStatusService");
vi.mock("../../middleware/utils");

describe("Idle identity revalidation schedule", () => {
    it("checks a connection that has never been revalidated", () => {
        expect(needsIdleRevalidation(undefined, 1_000_000)).toBe(true);
    });

    it("does not re-check inside the interval", () => {
        expect(needsIdleRevalidation(1_000_000, 1_059_999)).toBe(false);
    });

    it("re-checks once the interval has elapsed", () => {
        expect(needsIdleRevalidation(1_000_000, 1_060_000)).toBe(true);
        expect(needsIdleRevalidation(1_000_000, 1_120_000)).toBe(true);
    });
});
