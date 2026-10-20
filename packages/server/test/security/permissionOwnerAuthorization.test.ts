// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { afterEach, describe, expect, it } from "vitest";
import {
    PermissionEntity,
    RateLimitCounterEntity,
    RoleEntity,
    SessionEntity,
    TenantEntity,
    UserEntity,
} from "@stacks/db";
import { POLLINGTYPE } from "@stacks/types";
import { Op } from "sequelize";
import { randomUUID } from "node:crypto";
import * as bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";
import app from "../../src/index";
import { issueSession } from "../../src/services/sessions";
import { rateLimitKeyHash } from "../../src/utils/rateLimit";

const fixtureRows: Array<{ entity: any; id: string }> = [];
const rateLimitedUserIds: string[] = [];
const rateLimitedIps: string[] = [];

afterEach(async () => {
    const keyHashes = [
        ...rateLimitedUserIds.map(userId => rateLimitKeyHash("authenticated-api-user", userId)),
        ...rateLimitedIps.map(ip => rateLimitKeyHash("unauthenticated-api-ip", ip)),
    ];
    if (keyHashes.length) {
        await RateLimitCounterEntity.destroy({ where: { keyHash: { [Op.in]: keyHashes } } });
        expect(await RateLimitCounterEntity.count({ where: { keyHash: { [Op.in]: keyHashes } } })).toBe(0);
    }
    rateLimitedUserIds.length = 0;
    rateLimitedIps.length = 0;
    for (const { entity, id } of fixtureRows.reverse()) {
        await entity.destroy({ where: { id }, force: true });
        expect(await entity.count({ where: { id }, paranoid: false })).toBe(0);
    }
    fixtureRows.length = 0;
});

describe("permission owner authorization", () => {
    it("limits sharing and ownership transfer to the owner or a same-tenant admin", async () => {
        const credentials = JSON.parse(readFileSync("testUser.json", "utf8")) as { email: string };
        const seededUser = await UserEntity.findOne({ where: { email: credentials.email } });
        expect(seededUser).not.toBeNull();
        const tenant = String(seededUser!.get("tenant"));
        const localRole = await RoleEntity.findOne({ where: { title: "User", tenant } });
        expect(localRole).not.toBeNull();

        const createUser = async (label: string, userTenant: string, role: string, admin = false) => {
            const user = await UserEntity.create({
                email: `permission-${label}-${randomUUID()}@example.test`,
                password: await bcrypt.hash(randomUUID(), 10),
                firstName: `Permission ${label}`,
                lastName: "Authorization",
                role,
                tenant: userTenant,
                admin,
                real: false,
            });
            const userId = String(user.id);
            fixtureRows.push({ entity: UserEntity, id: userId });
            rateLimitedUserIds.push(userId);
            const session = await issueSession(userId, userTenant, 120);
            fixtureRows.push({ entity: SessionEntity, id: session.sid });
            return { id: userId, headers: { Authorization: `Bearer ${session.token}` } };
        };

        const owner = await createUser("owner", tenant, String(localRole!.get("id")));
        const viewer = await createUser("viewer", tenant, String(localRole!.get("id")));
        const admin = await createUser("admin", tenant, String(localRole!.get("id")), true);
        const foreignTenant = await TenantEntity.create({
            title: `Permission authorization ${randomUUID()}`,
            description: "temporary security fixture",
            expiry: new Date(Date.now() + 60 * 60 * 1000),
        });
        const foreignTenantId = String(foreignTenant.get("id"));
        fixtureRows.push({ entity: TenantEntity, id: foreignTenantId });
        const foreignRole = await RoleEntity.create({
            title: `foreign permission role ${randomUUID()}`,
            description: "temporary security fixture",
            access: {},
            disabled: false,
            tenant: foreignTenantId,
            createdBy: owner.id,
            updatedBy: owner.id,
        });
        const foreignRoleId = String(foreignRole.get("id"));
        fixtureRows.push({ entity: RoleEntity, id: foreignRoleId });
        const foreignUser = await createUser("foreign", foreignTenantId, foreignRoleId);
        const foreignAdmin = await createUser("foreign-admin", foreignTenantId, foreignRoleId, true);

        const permissionId = randomUUID();
        const rateLimitIp = `198.51.100.${Math.floor(Math.random() * 254) + 1}`;
        rateLimitedIps.push(rateLimitIp);
        await PermissionEntity.create({
            id: permissionId,
            owner: owner.id,
            isPublic: false,
            visibleUsers: [],
            visibleRoles: [],
            type: POLLINGTYPE.PROJECT,
            tenant,
            createdBy: owner.id,
            updatedBy: owner.id,
        });
        fixtureRows.push({ entity: PermissionEntity, id: permissionId });

        const patch = (headers: Record<string, string>, body: object, id = permissionId) =>
            app.request(
                `/api/permissions/${id}`,
                {
                    method: "PATCH",
                    headers: { ...headers, "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                },
                { incoming: { socket: { remoteAddress: rateLimitIp } } }
            );
        const shared = (isPublic: boolean, visibleUsers: string[] = [], visibleRoles: string[] = []) => ({
            isPublic,
            visibleUsers,
            visibleRoles,
        });

        const viewerPatch = await patch(viewer.headers, {
            ...shared(false, [viewer.id]),
            owner: viewer.id,
        });
        const missingPermissionPatch = await patch(
            viewer.headers,
            {
                ...shared(false, [viewer.id]),
                owner: viewer.id,
            },
            randomUUID()
        );
        expect(viewerPatch.status).toBe(404);
        expect(viewerPatch.status).toBe(missingPermissionPatch.status);
        expect((await PermissionEntity.findByPk(permissionId))?.get("owner")).toBe(owner.id);

        const crossTenantAudience = await patch(owner.headers, shared(false, [foreignUser.id]));
        expect(crossTenantAudience.status).toBe(400);
        const crossTenantRole = await patch(owner.headers, shared(false, [], [foreignRoleId]));
        expect(crossTenantRole.status).toBe(400);
        const oversizedUsers = await patch(
            owner.headers,
            shared(
                false,
                Array.from({ length: 501 }, () => randomUUID())
            )
        );
        expect(oversizedUsers.status).toBe(400);
        const oversizedRoles = await patch(
            owner.headers,
            shared(
                false,
                [],
                Array.from({ length: 501 }, () => randomUUID())
            )
        );
        expect(oversizedRoles.status).toBe(400);
        const foreignAdminPatch = await patch(foreignAdmin.headers, shared(false, [foreignAdmin.id]));
        expect(foreignAdminPatch.status).toBe(404);
        const afterForeignAttempts = await PermissionEntity.findByPk(permissionId);
        expect(afterForeignAttempts?.get("owner")).toBe(owner.id);
        expect(afterForeignAttempts?.get("isPublic")).toBe(false);
        expect(afterForeignAttempts?.get("visibleUsers")).toEqual([]);
        expect(afterForeignAttempts?.get("visibleRoles")).toEqual([]);

        const transfer = await patch(owner.headers, {
            ...shared(false, [viewer.id]),
            owner: viewer.id,
        });
        expect(transfer.status).toBe(200);
        expect((await PermissionEntity.findByPk(permissionId))?.get("owner")).toBe(viewer.id);

        const formerOwnerPatch = await patch(owner.headers, shared(true, [owner.id]));
        expect(formerOwnerPatch.status).toBe(404);
        const newOwnerPatch = await patch(viewer.headers, shared(false));
        expect(newOwnerPatch.status).toBe(200);
        expect((await PermissionEntity.findByPk(permissionId))?.get("owner")).toBe(viewer.id);

        const adminPatch = await patch(admin.headers, shared(true, [admin.id]));
        expect(adminPatch.status).toBe(200);
        expect((await PermissionEntity.findByPk(permissionId))?.get("owner")).toBe(viewer.id);
    });
});
