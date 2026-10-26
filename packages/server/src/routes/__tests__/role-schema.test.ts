import { describe, expect, it } from "vitest";
import { ROLE_ACTIONS, ROLE_SECTIONS } from "@stacks/types";
import { RoleSchema } from "../schema/roles";

describe("role route schema", () => {
    it("preserves the same section/action flags used by the app and role middleware", () => {
        const access = {
            [ROLE_SECTIONS.COMMENTS]: { [ROLE_ACTIONS.READ]: true, [ROLE_ACTIONS.WRITE]: false },
            [ROLE_SECTIONS.TIMELOGS]: { [ROLE_ACTIONS.WRITE]: true },
            [ROLE_SECTIONS.REPORTS]: {},
        };
        expect(RoleSchema.parse({ title: "Reviewer", access }).access).toEqual(access);
    });

    it.each(["create", "view", "admin"])("rejects unsupported action %s", action => {
        expect(
            RoleSchema.safeParse({ title: "Reviewer", access: { comments: { [action]: true } } }).success
        ).toBe(false);
    });

    it("rejects non-boolean access flags", () => {
        expect(
            RoleSchema.safeParse({ title: "Reviewer", access: { comments: { read: "true" } } }).success
        ).toBe(false);
    });
});
