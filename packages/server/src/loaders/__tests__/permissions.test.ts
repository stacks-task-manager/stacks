// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POLLINGACTIONS, POLLINGTYPE } from "@stacks/types";
import { PermissionEntity } from "@stacks/db";

vi.mock("@stacks/db", () => ({
    PermissionEntity: {
        create: vi.fn(),
        findOne: vi.fn(),
        update: vi.fn(),
    },
}));

vi.mock("../../events", () => ({
    sendRealtimeUpdate: vi.fn(),
}));

import { sendRealtimeUpdate } from "../../events";
import { PermissionsLoader } from "../permissions";
import { requestContext } from "../../services/requestContext";
import type { User } from "../../types";

const baseContext = (overrides: Partial<User> = {}) => ({
    user: {
        id: "user-1",
        tenant: "tenant-1",
        role: "role-1",
        admin: false,
        email: "u@example.com",
        name: "U",
        ...overrides,
    } as User,
    instanceId: "instance-1",
    role: { id: "role-1", title: "r", access: {} } as any,
    requestId: "req-1",
    timestamp: Date.now(),
});

const runWithContext = <T>(fn: () => T, overrides: Partial<User> = {}) => {
    return requestContext.run(baseContext(overrides), fn);
};

const permissionRow = (overrides: Record<string, any> = {}) => ({
    id: "perm-1",
    tenant: "tenant-1",
    type: POLLINGTYPE.TASK,
    isPublic: true,
    owner: "user-1",
    visibleUsers: [],
    visibleRoles: [],
    ...overrides,
});

const afterCommitCallbacks: Array<() => void | Promise<void>> = [];
const transaction = {
    id: "tx-1",
    afterCommit: vi.fn((callback: () => void | Promise<void>) => afterCommitCallbacks.push(callback)),
} as any;

describe("PermissionsLoader", () => {
    const sendRealtimeUpdateMock = vi.mocked(sendRealtimeUpdate);
    const findOneMock = vi.mocked(PermissionEntity.findOne);
    const updateMock = vi.mocked(PermissionEntity.update);

    beforeEach(() => {
        vi.clearAllMocks();
        afterCommitCallbacks.length = 0;
        findOneMock.mockReset();
        updateMock.mockReset();
    });

    it("rejects permission updates from visible non-owners", async () => {
        findOneMock.mockResolvedValue({
            toJSON: () => permissionRow({ owner: "user-2" }),
        } as any);

        await expect(
            runWithContext(() =>
                PermissionsLoader.update(
                    "perm-1",
                    {
                        isPublic: false,
                        visibleUsers: ["user-3"],
                        visibleRoles: [],
                    },
                    transaction
                )
            )
        ).rejects.toThrow(/permission update not allowed/i);

        expect(updateMock).not.toHaveBeenCalled();
    });

    it("updates visibility and owner fields for owners and emits realtime updates", async () => {
        const updated = permissionRow({
            isPublic: false,
            owner: "user-3",
            visibleUsers: ["user-3"],
        });
        findOneMock.mockResolvedValue({
            toJSON: () => permissionRow(),
        } as any);
        updateMock.mockResolvedValue([
            1,
            [
                {
                    toJSON: () => updated,
                },
            ],
        ] as any);

        const result = await runWithContext(() =>
            PermissionsLoader.update(
                "perm-1",
                {
                    isPublic: false,
                    owner: "user-3",
                    visibleUsers: ["user-3"],
                    visibleRoles: [],
                },
                transaction
            )
        );

        expect(result).toBe(true);
        expect(PermissionEntity.update).toHaveBeenCalledWith(
            {
                isPublic: false,
                owner: "user-3",
                visibleUsers: ["user-3"],
                visibleRoles: [],
            },
            expect.objectContaining({
                returning: true,
            })
        );
        expect(sendRealtimeUpdateMock).not.toHaveBeenCalled();
        await afterCommitCallbacks[0]();
        expect(sendRealtimeUpdateMock).toHaveBeenCalledWith({
            type: POLLINGTYPE.TASK,
            action: POLLINGACTIONS.UPDATE,
            record: "perm-1",
            permissions: updated,
        });
    });

    it("rejects owner changes from visible non-owners", async () => {
        findOneMock.mockResolvedValue({
            toJSON: () => permissionRow(),
        } as any);

        await expect(
            runWithContext(
                () =>
                    PermissionsLoader.update(
                        "perm-1",
                        {
                            isPublic: true,
                            owner: "user-2",
                            visibleUsers: [],
                            visibleRoles: [],
                        },
                        transaction
                    ),
                { id: "user-4" }
            )
        ).rejects.toThrow(/permission update not allowed/i);

        expect(updateMock).not.toHaveBeenCalled();
    });

    it("lets admins update permission ownership through the normal update path", async () => {
        const updated = permissionRow({ owner: "user-3" });
        findOneMock.mockResolvedValue({
            toJSON: () => permissionRow({ owner: "user-2" }),
        } as any);
        updateMock.mockResolvedValue([
            1,
            [
                {
                    toJSON: () => updated,
                },
            ],
        ] as any);

        const result = await runWithContext(
            () =>
                PermissionsLoader.update(
                    "perm-1",
                    {
                        isPublic: true,
                        owner: "user-3",
                        visibleUsers: [],
                        visibleRoles: [],
                    },
                    transaction
                ),
            {
                admin: true,
                id: "admin-1",
            }
        );

        expect(result).toBe(true);
        expect(PermissionEntity.update).toHaveBeenCalledWith(
            {
                isPublic: true,
                owner: "user-3",
                visibleUsers: [],
                visibleRoles: [],
            },
            expect.objectContaining({
                returning: true,
            })
        );
        expect(sendRealtimeUpdateMock).not.toHaveBeenCalled();
        await afterCommitCallbacks[0]();
        expect(sendRealtimeUpdateMock).toHaveBeenCalledWith({
            type: POLLINGTYPE.TASK,
            action: POLLINGACTIONS.UPDATE,
            record: "perm-1",
            permissions: updated,
        });
    });
});
