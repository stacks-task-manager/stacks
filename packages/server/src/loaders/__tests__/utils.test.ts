// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { Op } from "sequelize";
import { PermissionEntity, sequelize } from "@stacks/db";
import {
    attachPermissionsToRow,
    createOne,
    deleteAll,
    deleteOne,
    findAll,
    findOne,
    mergePermissions,
    sanitizeUpdate,
    sanitizeWhere,
    sanitizeWhereDelete,
    sanitizeWherePermissions,
    updateAll,
    updateOne,
    withTransaction,
} from "../utils";
import { requestContext } from "../../services/requestContext";
import type { User } from "../../types";
import { defaultPermissions } from "../permissions";
import { POLLINGTYPE } from "@stacks/types";

const baseContext = (overrides: Partial<User> = {}, access: Record<string, any> = {}) => ({
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
    role: { id: "role-1", title: "r", access } as any,
    requestId: "req-1",
    timestamp: Date.now(),
});

const sqlOf = (value: any): string => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value.val === "string") return value.val;
    return JSON.stringify(value);
};

const runWithContext = <T>(fn: () => T, overrides: Partial<User> = {}, access: Record<string, any> = {}) => {
    return requestContext.run(baseContext(overrides, access), fn);
};

beforeEach(() => {
    vi.clearAllMocks();
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe("loader sanitizeWhere helpers", () => {
    it("scopes WHERE to tenant and non-deleted rows", () => {
        requestContext.run(baseContext(), () => {
            const where: any = sanitizeWhere({ id: "x" });
            expect(where.id).toBe("x");
            expect(where.tenant).toBe("tenant-1");
            expect(where.deleted).toBeNull();
        });
    });

    it("admin users skip the permission OR clause", () => {
        requestContext.run(baseContext({ admin: true }), () => {
            const where: any = sanitizeWherePermissions({ id: "x" });
            expect(where[Op.or]).toBeUndefined();
        });
    });

    it("non-admin users get isPublic/owner/role/user/fallback OR clause", () => {
        requestContext.run(baseContext(), () => {
            const where: any = sanitizeWherePermissions({}, true);
            const clauses = where[Op.or] as any[];
            expect(clauses).toHaveLength(5);
            const sqls = clauses.map(sqlOf).join(" | ");
            expect(sqls).toContain('"PermissionEntity"."isPublic" = true');
            expect(sqls).toContain('"PermissionEntity"."owner"');
            expect(sqls).toContain('"PermissionEntity"."visibleRoles" ?');
            expect(sqls).toContain('"PermissionEntity"."visibleUsers" ?');
            expect(sqls).toContain('"PermissionEntity"."id" IS NULL');
        });
    });

    it("delete visibility is restricted to public or owner", () => {
        requestContext.run(baseContext(), () => {
            const where: any = sanitizeWhereDelete({ id: "x" }, true);
            const clauses = where[Op.or] as any[];
            expect(clauses).toHaveLength(2);
            const sqls = clauses.map(sqlOf).join(" | ");
            expect(sqls).toContain('"PermissionEntity"."isPublic" = true');
            expect(sqls).toContain('"PermissionEntity"."owner"');
        });
    });

    it("sanitizeUpdate strips audit and tenant fields", () => {
        const data = sanitizeUpdate({
            id: "x",
            tenant: "tenant-2",
            createdBy: "creator",
            updatedBy: "updater",
            deletedBy: "deleter",
            deleted: new Date(),
            title: "Kept",
        });

        expect(data).toEqual({
            id: "x",
            title: "Kept",
        });
    });
});

describe("loader row helpers", () => {
    it("attachPermissionsToRow promotes PermissionEntity onto permissions", () => {
        const row: any = {
            id: "row-1",
            PermissionEntity: {
                id: "perm-1",
                isPublic: false,
                visibleUsers: ["user-2"],
                visibleRoles: ["role-2"],
                owner: "user-9",
            },
        };

        attachPermissionsToRow(row);

        expect(row.PermissionEntity).toBeUndefined();
        expect(row.permissions).toEqual({
            isPublic: false,
            visibleUsers: ["user-2"],
            visibleRoles: ["role-2"],
            owner: "user-9",
        });
    });

    it("attachPermissionsToRow falls back to default permissions when join is empty", () => {
        const row: any = {
            id: "row-1",
            PermissionEntity: {
                id: null,
            },
        };

        attachPermissionsToRow(row);

        expect(row.permissions).toEqual({
            isPublic: defaultPermissions.isPublic,
            visibleUsers: defaultPermissions.visibleUsers,
            visibleRoles: defaultPermissions.visibleRoles,
            owner: undefined,
        });
    });
});

describe("loader CRUD helpers", () => {
    it("createOne stamps tenant and audit fields from request context", async () => {
        const transaction = { id: "tx-1" } as any;
        const entity = {
            create: vi.fn().mockResolvedValue({
                toJSON: () => ({ id: "created-1", title: "Created" }),
            }),
        };

        const record = await runWithContext(() =>
            createOne({
                entity,
                data: { title: "Created" },
                transaction,
            })
        );

        expect(entity.create).toHaveBeenCalledWith(
            {
                title: "Created",
                tenant: "tenant-1",
                createdBy: "user-1",
                updatedBy: "user-1",
            },
            { transaction }
        );
        expect(record).toEqual({ id: "created-1", title: "Created" });
    });

    it("findOne returns null when the record is not visible", async () => {
        const entity = {
            findOne: vi.fn().mockResolvedValue(null),
        };

        const record = await runWithContext(() =>
            findOne({
                entity,
                id: "row-1",
            })
        );

        expect(record).toBeNull();
        expect(entity.findOne).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    id: "row-1",
                    tenant: "tenant-1",
                    deleted: null,
                }),
                include: [
                    expect.objectContaining({
                        model: PermissionEntity,
                        required: false,
                    }),
                ],
                raw: true,
                nest: true,
            })
        );
    });

    it("findOne attaches permissions to a raw row result", async () => {
        const entity = {
            findOne: vi.fn().mockResolvedValue({
                id: "row-1",
                title: "Visible",
                PermissionEntity: {
                    id: "perm-1",
                    isPublic: false,
                    visibleUsers: ["user-3"],
                    visibleRoles: ["role-3"],
                    owner: "user-2",
                },
            }),
        };

        const record: any = await runWithContext(() =>
            findOne({
                entity,
                id: "row-1",
            })
        );

        expect(record).toEqual({
            id: "row-1",
            title: "Visible",
            permissions: {
                isPublic: false,
                visibleUsers: ["user-3"],
                visibleRoles: ["role-3"],
                owner: "user-2",
            },
        });
    });

    it("findAll returns an empty array when the entity returns no rows", async () => {
        const entity = {
            findAll: vi.fn().mockResolvedValue(null),
        };

        const records = await runWithContext(() =>
            findAll({
                entity,
            })
        );

        expect(records).toEqual([]);
    });

    it("findAll attaches permissions for each row", async () => {
        const entity = {
            findAll: vi.fn().mockResolvedValue([
                {
                    id: "row-1",
                    PermissionEntity: {
                        id: "perm-1",
                        isPublic: true,
                        visibleUsers: [],
                        visibleRoles: [],
                        owner: "user-1",
                    },
                },
                {
                    id: "row-2",
                    PermissionEntity: {
                        id: null,
                    },
                },
            ]),
        };

        const records: any[] = await runWithContext(() =>
            findAll({
                entity,
                filter: { type: "note" },
                order: [["created", "DESC"]] as any,
            })
        );

        expect(entity.findAll).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    type: "note",
                    tenant: "tenant-1",
                    deleted: null,
                }),
                order: [["created", "DESC"]],
                include: [
                    expect.objectContaining({
                        model: PermissionEntity,
                        required: false,
                    }),
                ],
            })
        );
        expect(records).toEqual([
            {
                id: "row-1",
                permissions: {
                    isPublic: true,
                    visibleUsers: [],
                    visibleRoles: [],
                    owner: "user-1",
                },
            },
            {
                id: "row-2",
                permissions: {
                    isPublic: true,
                    visibleUsers: [],
                    visibleRoles: [],
                    owner: undefined,
                },
            },
        ]);
    });

    it("updateOne throws when the record is missing", async () => {
        const entity = {
            findOne: vi.fn().mockResolvedValue(null),
            update: vi.fn(),
        };

        await expect(
            runWithContext(() =>
                updateOne({
                    entity,
                    id: "missing",
                    data: { title: "Updated" },
                })
            )
        ).rejects.toThrow(/record not found/i);
        expect(entity.update).not.toHaveBeenCalled();
    });

    it("updateOne updates the visible record inside the tenant scope", async () => {
        const entity = {
            findOne: vi.fn().mockResolvedValue({
                id: "row-1",
                PermissionEntity: {
                    id: "perm-1",
                    isPublic: true,
                    visibleUsers: [],
                    visibleRoles: [],
                    owner: "user-1",
                },
            }),
            update: vi.fn().mockResolvedValue([1, [{ id: "row-1", title: "Updated" }]]),
        };

        const record = await runWithContext(() =>
            updateOne({
                entity,
                id: "row-1",
                data: { title: "Updated" },
            })
        );

        expect(entity.update).toHaveBeenCalledWith(
            { title: "Updated" },
            expect.objectContaining({
                where: {
                    id: "row-1",
                    tenant: "tenant-1",
                    deleted: null,
                },
                returning: true,
                raw: true,
                nest: true,
            })
        );
        expect(record).toEqual({ id: "row-1", title: "Updated" });
    });

    it("updateOne throws when the update returns no row payload", async () => {
        const entity = {
            findOne: vi.fn().mockResolvedValue({
                id: "row-1",
                PermissionEntity: {
                    id: "perm-1",
                    isPublic: true,
                    visibleUsers: [],
                    visibleRoles: [],
                    owner: "user-1",
                },
            }),
            update: vi.fn().mockResolvedValue([1, []]),
        };

        await expect(
            runWithContext(() =>
                updateOne({
                    entity,
                    id: "row-1",
                    data: { title: "Updated" },
                })
            )
        ).rejects.toThrow(/could not update record/i);
    });

    it("updateAll short-circuits when no visible rows exist", async () => {
        const entity = {
            findAll: vi.fn().mockResolvedValue([]),
            update: vi.fn(),
        };

        const records = await runWithContext(() =>
            updateAll({
                entity,
                data: { archived: true },
            })
        );

        expect(records).toEqual([]);
        expect(entity.update).not.toHaveBeenCalled();
    });

    it("updateAll only updates ids returned by the visibility query", async () => {
        const entity = {
            findAll: vi.fn().mockResolvedValue([
                {
                    id: "row-1",
                    PermissionEntity: {
                        id: "perm-1",
                        isPublic: true,
                        visibleUsers: [],
                        visibleRoles: [],
                        owner: "user-1",
                    },
                },
                {
                    id: "row-2",
                    PermissionEntity: {
                        id: "perm-2",
                        isPublic: true,
                        visibleUsers: [],
                        visibleRoles: [],
                        owner: "user-1",
                    },
                },
            ]),
            update: vi.fn().mockResolvedValue([2, [{ id: "row-1" }, { id: "row-2" }]]),
        };

        const records = await runWithContext(() =>
            updateAll({
                entity,
                data: { archived: true },
                filter: { project: "project-1" },
            })
        );

        expect(entity.update).toHaveBeenCalledWith(
            { archived: true },
            expect.objectContaining({
                where: {
                    id: ["row-1", "row-2"],
                    tenant: "tenant-1",
                    deleted: null,
                },
                returning: true,
                raw: true,
            })
        );
        expect(records).toEqual([{ id: "row-1" }, { id: "row-2" }]);
    });

    it("deleteOne performs a soft delete stamped with the current user", async () => {
        const entity = {
            findOne: vi.fn().mockResolvedValue({
                id: "row-1",
                PermissionEntity: {
                    id: "perm-1",
                    isPublic: true,
                    visibleUsers: [],
                    visibleRoles: [],
                    owner: "user-1",
                },
            }),
            update: vi.fn().mockResolvedValue([1, [{ id: "row-1", deletedBy: "user-1" }]]),
        };

        const record = await runWithContext(() =>
            deleteOne({
                entity,
                id: "row-1",
            })
        );

        expect(entity.update).toHaveBeenCalledWith(
            expect.objectContaining({
                deleted: expect.any(Date),
                deletedBy: "user-1",
            }),
            expect.any(Object)
        );
        expect(record).toEqual({ id: "row-1", deletedBy: "user-1" });
    });

    it("deleteAll performs a bulk soft delete for visible rows", async () => {
        const entity = {
            findAll: vi.fn().mockResolvedValue([
                {
                    id: "row-1",
                    PermissionEntity: {
                        id: "perm-1",
                        isPublic: true,
                        visibleUsers: [],
                        visibleRoles: [],
                        owner: "user-1",
                    },
                },
            ]),
            update: vi.fn().mockResolvedValue([1, [{ id: "row-1", deletedBy: "user-1" }]]),
        };

        const records = await runWithContext(() =>
            deleteAll({
                entity,
                filter: { type: "task" },
            })
        );

        expect(entity.update).toHaveBeenCalledWith(
            expect.objectContaining({
                deleted: expect.any(Date),
                deletedBy: "user-1",
            }),
            expect.objectContaining({
                where: {
                    id: ["row-1"],
                    tenant: "tenant-1",
                    deleted: null,
                },
            })
        );
        expect(records).toEqual([{ id: "row-1", deletedBy: "user-1" }]);
    });
});

describe("loader transaction helper", () => {
    it("reuses an external transaction without opening a new one", async () => {
        const extTransaction = { id: "ext-tx" } as any;
        const transactionSpy = vi.spyOn(sequelize, "transaction");

        const result = await withTransaction(extTransaction, async transaction => {
            expect(transaction).toBe(extTransaction);
            return "done";
        });

        expect(result).toBe("done");
        expect(transactionSpy).not.toHaveBeenCalled();
    });

    it("opens and commits a transaction when none is provided", async () => {
        const transaction = {
            commit: vi.fn().mockResolvedValue(undefined),
            rollback: vi.fn().mockResolvedValue(undefined),
        } as any;
        const transactionSpy = vi.spyOn(sequelize, "transaction").mockResolvedValue(transaction);

        const result = await withTransaction(undefined, async currentTransaction => {
            expect(currentTransaction).toBe(transaction);
            return "ok";
        });

        expect(result).toBe("ok");
        expect(transactionSpy).toHaveBeenCalledTimes(1);
        expect(transaction.commit).toHaveBeenCalledTimes(1);
        expect(transaction.rollback).not.toHaveBeenCalled();
    });

    it("rolls back the transaction when the operation throws", async () => {
        const transaction = {
            commit: vi.fn().mockResolvedValue(undefined),
            rollback: vi.fn().mockResolvedValue(undefined),
        } as any;
        vi.spyOn(sequelize, "transaction").mockResolvedValue(transaction);

        await expect(
            withTransaction(undefined, async () => {
                throw new Error("boom");
            })
        ).rejects.toThrow("boom");

        expect(transaction.commit).not.toHaveBeenCalled();
        expect(transaction.rollback).toHaveBeenCalledTimes(1);
    });
});

describe("loader permission merging", () => {
    it("returns current-user defaults when both permissions are missing", () => {
        const merged = runWithContext(() => mergePermissions());

        expect(merged).toEqual({
            id: "",
            owner: "user-1",
            type: POLLINGTYPE.TASK,
            isPublic: true,
            visibleUsers: [],
            visibleRoles: [],
        });
    });

    it("returns the provided permission when only one side exists", () => {
        const permission = {
            id: "perm-1",
            owner: "user-9",
            type: POLLINGTYPE.PROJECT,
            isPublic: false,
            visibleUsers: ["user-3"],
            visibleRoles: ["role-3"],
        };

        const merged = runWithContext(() => mergePermissions(permission));

        expect(merged).toEqual(permission);
    });

    it("keeps public only when both sides are public", () => {
        const merged = runWithContext(() =>
            mergePermissions(
                {
                    id: "perm-1",
                    owner: "user-1",
                    type: POLLINGTYPE.PROJECT,
                    isPublic: true,
                    visibleUsers: [],
                    visibleRoles: [],
                },
                {
                    id: "perm-2",
                    owner: "user-2",
                    type: POLLINGTYPE.PROJECT,
                    isPublic: true,
                    visibleUsers: ["user-9"],
                    visibleRoles: ["role-9"],
                }
            )
        );

        expect(merged).toEqual({
            id: "perm-1",
            owner: "user-1",
            type: POLLINGTYPE.PROJECT,
            isPublic: true,
            visibleUsers: [],
            visibleRoles: [],
        });
    });

    it("intersects restricted visibility when both sides are private", () => {
        const merged = runWithContext(() =>
            mergePermissions(
                {
                    id: "perm-1",
                    owner: "user-1",
                    type: POLLINGTYPE.TASK,
                    isPublic: false,
                    visibleUsers: ["user-2", "user-3", "user-3"],
                    visibleRoles: ["role-2", "role-3", "role-3"],
                },
                {
                    id: "perm-2",
                    owner: "user-2",
                    type: POLLINGTYPE.PROJECT,
                    isPublic: false,
                    visibleUsers: ["user-3", "user-4"],
                    visibleRoles: ["role-3", "role-4"],
                }
            )
        );

        expect(merged).toEqual({
            id: "perm-1",
            owner: "user-1",
            type: POLLINGTYPE.TASK,
            isPublic: false,
            visibleUsers: ["user-3"],
            visibleRoles: ["role-3"],
        });
    });

    it("inherits restricted visibility from the non-public side", () => {
        const merged = runWithContext(() =>
            mergePermissions(
                {
                    id: "perm-1",
                    owner: "user-1",
                    type: POLLINGTYPE.TASK,
                    isPublic: true,
                    visibleUsers: [],
                    visibleRoles: [],
                },
                {
                    id: "perm-2",
                    owner: "user-2",
                    type: POLLINGTYPE.TASK,
                    isPublic: false,
                    visibleUsers: ["user-5"],
                    visibleRoles: ["role-5"],
                }
            )
        );

        expect(merged).toEqual({
            id: "perm-1",
            owner: "user-1",
            type: POLLINGTYPE.TASK,
            isPublic: false,
            visibleUsers: ["user-5"],
            visibleRoles: ["role-5"],
        });
    });
});
