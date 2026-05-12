// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { reorderWithAfter } from "app/utils/array";

describe("reorderWithAfter", () => {
    it("computes after correctly when moving down", () => {
        const input = ["a", "b", "c", "d", "e"];
        const result = reorderWithAfter(input, "a", 0, 3);
        expect(result.order).toEqual(["b", "c", "d", "a", "e"]);
        expect(result.after).toBe("d");
    });

    it("computes after correctly when moving up", () => {
        const input = ["a", "b", "c", "d", "e"];
        const result = reorderWithAfter(input, "e", 4, 2);
        expect(result.order).toEqual(["a", "b", "e", "c", "d"]);
        expect(result.after).toBe("b");
    });

    it("returns null after when moving to top", () => {
        const input = ["a", "b", "c", "d", "e"];
        const result = reorderWithAfter(input, "d", 3, 0);
        expect(result.order).toEqual(["d", "a", "b", "c", "e"]);
        expect(result.after).toBe(null);
    });
});
