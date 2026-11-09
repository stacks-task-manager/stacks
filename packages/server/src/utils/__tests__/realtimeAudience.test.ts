// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Realtime delivery policy (S02): the canonical tenant/ACL/RBAC visibility rule
 * from sanitizeWherePermissions applied to a connected recipient before a frame
 * is serialized. Pure logic — every input is a synthetic fixture.
 */
import { describe, expect, it } from "vitest";
import {
    isAudienceNarrowed,
    isFrameAuthorized,
    isRealtimeAudienceAllowed,
    isRealtimeTenantPeer,
} from "../realtimeAudience";
import { POLLINGTYPE } from "@stacks/types";
import type { IPermissions } from "@stacks/types";

const role = (id: string) => ({ userId: `user-of-${id}`, tenant: "tenant-a", role: id, admin: false });
const adminInA = { userId: "user-admin-a", tenant: "tenant-a", role: "role-user", admin: true };
const adminInB = { userId: "user-admin-b", tenant: "tenant-b", role: "role-user", admin: true };
const outsider = { userId: "user-foreign", tenant: "tenant-b", role: "role-user", admin: false };

const acl = (overrides: Partial<IPermissions> = {}): IPermissions =>
    ({
        id: "perm-1",
        type: POLLINGTYPE.TASK,
        isPublic: false,
        owner: "owner-1",
        visibleUsers: [] as string[],
        visibleRoles: [] as string[],
        ...overrides,
    } as IPermissions);

describe("realtime audience gates", () => {
    it("denies every recipient outside the event tenant, including tenant admins elsewhere", () => {
        const audience = { tenant: "tenant-a", permissions: acl() };
        expect(isRealtimeAudienceAllowed(audience, outsider)).toBe(false);
        expect(isFrameAuthorized(audience, outsider)).toBe(false);
        expect(isRealtimeTenantPeer({ tenant: "tenant-a" }, adminInB)).toBe(false);
    });

    it("applies the canonical visibility rule inside the tenant", () => {
        const audience = {
            tenant: "tenant-a",
            permissions: acl({ visibleUsers: ["allowed-user"], visibleRoles: ["role-collab"] }),
        };
        expect(isRealtimeAudienceAllowed(audience, role("role-collab"))).toBe(true);
        expect(isRealtimeAudienceAllowed(audience, { ...role("x"), userId: "allowed-user" })).toBe(true);
        expect(isRealtimeAudienceAllowed(audience, { ...role("x"), userId: "owner-1" })).toBe(true);
        expect(isRealtimeAudienceAllowed(audience, adminInA)).toBe(true);
        expect(isRealtimeAudienceAllowed(audience, role("role-user"))).toBe(false);
    });

    it("treats a missing permissions snapshot as private, never public", () => {
        const tenantOnly = { tenant: "tenant-a" };
        expect(isRealtimeAudienceAllowed(tenantOnly, role("role-user"))).toBe(false);
        expect(isRealtimeAudienceAllowed(tenantOnly, adminInA)).toBe(true);
        expect(isRealtimeAudienceAllowed(tenantOnly, outsider)).toBe(false);
    });

    it("authorizes tenant-scoped server frames for same-tenant recipients only", () => {
        const presence = { tenant: "tenant-a" };
        expect(isFrameAuthorized(presence, role("role-any"))).toBe(true);
        expect(isFrameAuthorized(presence, adminInA)).toBe(true);
        expect(isFrameAuthorized(presence, outsider)).toBe(false);
        expect(isFrameAuthorized(presence, null)).toBe(false);
        expect(isFrameAuthorized(null, role("role-any"))).toBe(false);
    });

    it("flags only ACL edits that can have withdrawn access", () => {
        const before = { tenant: "tenant-a", permissions: acl({ isPublic: true }) };
        const afterPrivate = { tenant: "tenant-a", permissions: acl() };
        expect(isAudienceNarrowed(before, afterPrivate)).toBe(true);

        const widened = { tenant: "tenant-a", permissions: acl({ isPublic: true, visibleUsers: ["u"] }) };
        expect(isAudienceNarrowed(afterPrivate, widened)).toBe(false);
        expect(isAudienceNarrowed(afterPrivate, afterPrivate)).toBe(false);

        const shrunkUsers = { tenant: "tenant-a", permissions: acl({ visibleUsers: ["kept"] }) };
        const grownUsers = { tenant: "tenant-a", permissions: acl({ visibleUsers: ["kept", "new"] }) };
        expect(isAudienceNarrowed(shrunkUsers, grownUsers)).toBe(false);
        expect(isAudienceNarrowed(grownUsers, shrunkUsers)).toBe(true);

        const shrunkRoles = { tenant: "tenant-a", permissions: acl({ visibleRoles: ["kept"] }) };
        const grownRoles = { tenant: "tenant-a", permissions: acl({ visibleRoles: ["kept", "new"] }) };
        expect(isAudienceNarrowed(grownRoles, shrunkRoles)).toBe(true);
        expect(isAudienceNarrowed(shrunkRoles, grownRoles)).toBe(false);

        expect(isAudienceNarrowed({ tenant: "tenant-a" }, afterPrivate)).toBe(false);
    });
});
