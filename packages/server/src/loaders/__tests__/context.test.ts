// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROLE_SECTIONS } from "@stacks/types";

vi.mock("@stacks/license", () => ({
    getLicense: vi.fn(),
}));

import { getLicense } from "@stacks/license";
import { canRead, canWrite, getCurrentRole, getCurrentUser, getInstanceId, getTenantLicense } from "../context";
import { requestContext } from "../../services/requestContext";
import type { User } from "../../types";

const baseContext = (
    overrides: Partial<User> = {},
    access: Record<string, { read?: boolean; write?: boolean }> = {}
) => ({
    user: {
        id: "user-1",
        tenant: "tenant-1",
        role: "role-1",
        admin: false,
        email: "u@example.com",
        name: "User",
        ...overrides,
    } as User,
    instanceId: "instance-1",
    role: {
        id: "role-1",
        title: "Member",
        access,
    } as any,
    requestId: "req-1",
    timestamp: Date.now(),
});

describe("loader context helpers", () => {
    const getLicenseMock = vi.mocked(getLicense);

    beforeEach(() => {
        vi.clearAllMocks();
        getLicenseMock.mockReturnValue({
            tenants: [
                { id: "tenant-1", seats: 5 },
                { id: "tenant-2", seats: 10 },
            ],
        } as any);
    });

    it("returns the current request-scoped user, role, and instance id", () => {
        requestContext.run(
            baseContext(
                { id: "user-99", tenant: "tenant-9" },
                {
                    [ROLE_SECTIONS.PEOPLE]: { read: true, write: false },
                }
            ),
            () => {
                expect(getCurrentUser()).toMatchObject({
                    id: "user-99",
                    tenant: "tenant-9",
                });
                expect(getCurrentRole()).toMatchObject({
                    id: "role-1",
                    access: {
                        [ROLE_SECTIONS.PEOPLE]: { read: true, write: false },
                    },
                });
                expect(getInstanceId()).toBe("instance-1");
            }
        );
    });

    it("returns the matching tenant license for the current user", () => {
        requestContext.run(baseContext(), () => {
            expect(getTenantLicense()).toEqual({
                id: "tenant-1",
                seats: 5,
            });
        });
    });

    it("returns undefined when the current tenant is not present in the license", () => {
        requestContext.run(baseContext({ tenant: "missing-tenant" }), () => {
            expect(getTenantLicense()).toBeUndefined();
        });
    });

    it("checks role access for read and write permissions", () => {
        requestContext.run(
            baseContext(
                {},
                {
                    [ROLE_SECTIONS.PEOPLE]: { read: true, write: false },
                }
            ),
            () => {
                expect(canRead(ROLE_SECTIONS.PEOPLE)).toBe(true);
                expect(canWrite(ROLE_SECTIONS.PEOPLE)).toBe(false);
            }
        );
    });

    it("lets admins bypass role access checks", () => {
        requestContext.run(
            baseContext(
                { admin: true },
                {
                    [ROLE_SECTIONS.COMPANIES]: { read: false, write: false },
                }
            ),
            () => {
                expect(canRead(ROLE_SECTIONS.COMPANIES)).toBe(true);
                expect(canWrite(ROLE_SECTIONS.COMPANIES)).toBe(true);
            }
        );
    });
});
