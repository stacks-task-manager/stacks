// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, expect, it } from "vitest";
import { PermissionTransferOwnerSchema, PermissionUpdateSchema } from "../schema/permissions";

const userId = "11111111-1111-4111-8111-111111111111";

describe("permission route schemas", () => {
    it("accepts visibility updates with an unchanged owner hint", () => {
        expect(
            PermissionUpdateSchema.safeParse({
                isPublic: false,
                owner: userId,
                visibleUsers: [userId],
                visibleRoles: [],
            }).success
        ).toBe(true);
    });

    it("rejects unknown fields on visibility updates", () => {
        expect(
            PermissionUpdateSchema.safeParse({
                isPublic: true,
                visibleUsers: [],
                visibleRoles: [],
                type: "task",
            }).success
        ).toBe(false);
    });

    it("accepts only the new owner on ownership transfers", () => {
        expect(
            PermissionTransferOwnerSchema.safeParse({
                owner: userId,
            }).success
        ).toBe(true);
        expect(
            PermissionTransferOwnerSchema.safeParse({
                owner: userId,
                isPublic: true,
            }).success
        ).toBe(false);
    });
});
