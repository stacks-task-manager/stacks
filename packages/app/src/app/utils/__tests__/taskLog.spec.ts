import { shouldLogTaskChange } from "../taskLog";

describe("task activity log fields", () => {
    it("does not create audit log entries for comment counter updates", () => {
        expect(shouldLogTaskChange("comments")).toBe(false);
    });

    it("continues logging task changes and ignores framework-only fields", () => {
        expect(shouldLogTaskChange("title")).toBe(true);
        expect(shouldLogTaskChange("comment")).toBe(false);
        expect(shouldLogTaskChange("created")).toBe(false);
        expect(shouldLogTaskChange("updated")).toBe(false);
    });
});
