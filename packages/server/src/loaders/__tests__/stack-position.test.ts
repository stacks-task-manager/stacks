import { describe, expect, it } from "vitest";
import { stackInsertIndex } from "../stackPosition";

describe("column placement in current board order", () => {
    const order = ["Review", "Drafts", "Done"];
    it.each([
        [{ beforeStackId: "Drafts" }, ["Review", "Test", "Drafts", "Done"]],
        [{ afterStackId: "Drafts" }, ["Review", "Drafts", "Test", "Done"]],
        [{ beforeStackId: "Review" }, ["Test", "Review", "Drafts", "Done"]],
        [undefined, ["Review", "Drafts", "Done", "Test"]],
        [0, ["Test", "Review", "Drafts", "Done"]],
    ] as const)("inserts using %j", (position, expected) => {
        const current = [...order];
        current.splice(stackInsertIndex(current, position), 0, "Test");
        expect(current).toEqual(expected);
    });
    it("rejects missing or foreign anchors", () => {
        expect(() => stackInsertIndex(order, { beforeStackId: "Other project" })).toThrow("no longer");
    });
    it("uses a reordered board rather than a stale index", () => {
        expect(stackInsertIndex(["Done", "Review", "Drafts"], { beforeStackId: "Drafts" })).toBe(2);
    });
});
