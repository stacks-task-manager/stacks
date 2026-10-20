// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { afterEach, describe, expect, it } from "vitest";
import { RateLimitCounterEntity, RoleEntity, SessionEntity, TenantEntity, UserEntity } from "@stacks/db";
import { ROLE_SECTIONS } from "@stacks/types";
import * as bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { Op } from "sequelize";
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

describe("role management authorization", () => {
    it("limits role listing and creation to authorized users", async () => {
        const credentials = JSON.parse(readFileSync("testUser.json", "utf8")) as { email: string };
        const seededUser = await UserEntity.findOne({ where: { email: credentials.email } });
        expect(seededUser).not.toBeNull();

        const tenant = String(seededUser!.get("tenant"));
        const defaultRole = await RoleEntity.findOne({ where: { title: "User", tenant } });
        expect(defaultRole).not.toBeNull();
        const defaultAccess = defaultRole!.get("access") as Record<string, { view?: boolean }>;
        expect(defaultAccess[ROLE_SECTIONS.ROLES]?.view).not.toBe(true);

        const readOnlyRole = await RoleEntity.create({
            title: `Role read-only ${randomUUID()}`,
            description: "temporary security fixture",
            access: { [ROLE_SECTIONS.ROLES]: { read: true, write: false } },
            disabled: false,
            tenant,
            createdBy: String(seededUser!.get("id")),
            updatedBy: String(seededUser!.get("id")),
        });
        const readOnlyRoleId = String(readOnlyRole.get("id"));
        fixtureRows.push({ entity: RoleEntity, id: readOnlyRoleId });

        const createUser = async (admin: boolean, roleId = String(defaultRole!.get("id"))) => {
            const user = await UserEntity.create({
                email: `${randomUUID()}@example.test`,
                password: await bcrypt.hash(randomUUID(), 10),
                firstName: admin ? "Role Admin" : "Role Viewer",
                lastName: "Security Fixture",
                role: roleId,
                tenant,
                admin,
                real: false,
            });
            fixtureRows.push({ entity: UserEntity, id: String(user.id) });
            rateLimitedUserIds.push(String(user.id));
            const session = await issueSession(String(user.id), tenant, 120);
            fixtureRows.push({ entity: SessionEntity, id: session.sid });
            return { id: String(user.id), headers: { Authorization: `Bearer ${session.token}` } };
        };

        const viewer = await createUser(false);
        const readOnly = await createUser(false, readOnlyRoleId);
        const admin = await createUser(true);
        const rateLimitIp = `198.51.100.${Math.floor(Math.random() * 254) + 1}`;
        rateLimitedIps.push(rateLimitIp);
        const foreignTenant = await TenantEntity.create({
            title: `Role authorization tenant ${randomUUID()}`,
            description: "temporary security fixture",
            expiry: new Date(Date.now() + 60 * 60 * 1000),
        });
        const foreignTenantId = String(foreignTenant.get("id"));
        fixtureRows.push({ entity: TenantEntity, id: foreignTenantId });
        const foreignRole = await RoleEntity.create({
            title: `foreign role ${randomUUID()}`,
            description: "temporary security fixture",
            access: { [ROLE_SECTIONS.PROJECTS]: { view: false } },
            disabled: false,
            tenant: foreignTenantId,
            createdBy: admin.id,
            updatedBy: admin.id,
        });
        const foreignRoleId = String(foreignRole.get("id"));
        fixtureRows.push({ entity: RoleEntity, id: foreignRoleId });
        const foreignActor = await UserEntity.create({
            email: `${randomUUID()}@example.test`,
            password: "test-password",
            firstName: "Foreign",
            lastName: "Role Actor",
            role: foreignRoleId,
            tenant: foreignTenantId,
            admin: true,
            real: false,
        });
        const foreignActorId = String(foreignActor.get("id"));
        fixtureRows.push({ entity: UserEntity, id: foreignActorId });
        const beforeCount = await RoleEntity.count({ where: { tenant } });
        const request = (path: string, init?: RequestInit) =>
            app.request(path, init, { incoming: { socket: { remoteAddress: rateLimitIp } } });
        const roleData = {
            title: `temporary role ${randomUUID()}`,
            access: { [ROLE_SECTIONS.PROJECTS]: { view: true } },
        };

        const viewerListResponse = await request("/api/roles", { headers: viewer.headers });
        expect(viewerListResponse.status).toBe(403);

        const readOnlyListResponse = await request("/api/roles", { headers: readOnly.headers });
        expect(readOnlyListResponse.status).toBe(200);
        const readOnlyListBody = await readOnlyListResponse.json();
        const readOnlyListedRoleIds = readOnlyListBody.data.map((role: { id: string }) => role.id);
        expect(readOnlyListedRoleIds).toContain(readOnlyRoleId);
        expect(readOnlyListedRoleIds).not.toContain(String(foreignRole?.get("id") ?? ""));

        const readOnlyCreateResponse = await request("/api/roles", {
            method: "POST",
            headers: { ...readOnly.headers, "Content-Type": "application/json" },
            body: JSON.stringify(roleData),
        });
        expect(readOnlyCreateResponse.status).toBe(403);
        expect(await RoleEntity.count({ where: { tenant } })).toBe(beforeCount);

        const viewerCreateResponse = await request("/api/roles", {
            method: "POST",
            headers: { ...viewer.headers, "Content-Type": "application/json" },
            body: JSON.stringify(roleData),
        });
        expect(viewerCreateResponse.status).toBe(403);
        expect(await RoleEntity.count({ where: { tenant } })).toBe(beforeCount);

        const viewerPatchResponse = await request(`/api/roles/${String(defaultRole!.get("id"))}`, {
            method: "PATCH",
            headers: { ...viewer.headers, "Content-Type": "application/json" },
            body: JSON.stringify({
                title: "attempted viewer role edit",
                access: { [ROLE_SECTIONS.PROJECTS]: { view: true } },
            }),
        });
        expect(viewerPatchResponse.status).toBe(403);
        const readOnlyPatchResponse = await request(`/api/roles/${readOnlyRoleId}`, {
            method: "PATCH",
            headers: { ...readOnly.headers, "Content-Type": "application/json" },
            body: JSON.stringify({
                title: "attempted read-only role edit",
                access: { [ROLE_SECTIONS.PROJECTS]: { view: true } },
            }),
        });
        expect(readOnlyPatchResponse.status).toBe(403);
        expect((await RoleEntity.findByPk(readOnlyRoleId))?.get("title")).toContain("Role read-only");

        const adminListResponse = await request("/api/roles", { headers: admin.headers });
        expect(adminListResponse.status).toBe(200);
        const adminListBody = await adminListResponse.json();
        const listedRoleIds = adminListBody.data.map((role: { id: string }) => role.id);
        expect(listedRoleIds).toContain(String(defaultRole!.get("id")));
        expect(listedRoleIds).not.toContain(foreignRoleId);

        const foreignPatchResponse = await request(`/api/roles/${foreignRoleId}`, {
            method: "PATCH",
            headers: { ...admin.headers, "Content-Type": "application/json" },
            body: JSON.stringify({
                title: "forged cross-tenant role edit",
                access: { [ROLE_SECTIONS.PROJECTS]: { view: true, create: true } },
            }),
        });
        const unknownPatchResponse = await request(`/api/roles/${randomUUID()}`, {
            method: "PATCH",
            headers: { ...admin.headers, "Content-Type": "application/json" },
            body: JSON.stringify({
                title: "forged unknown role edit",
                access: { [ROLE_SECTIONS.PROJECTS]: { view: true, create: true } },
            }),
        });
        expect(foreignPatchResponse.status).toBe(404);
        expect(unknownPatchResponse.status).toBe(404);
        const persistedForeignRole = await RoleEntity.findOne({ where: { id: foreignRoleId } });
        expect(persistedForeignRole?.get("title")).toBe(foreignRole.get("title"));
        expect(persistedForeignRole?.get("access")).toEqual(foreignRole.get("access"));

        const adminCreateResponse = await app.request("/api/roles", {
            method: "POST",
            headers: { ...admin.headers, "Content-Type": "application/json" },
            body: JSON.stringify({
                ...roleData,
                tenant: foreignTenantId,
                createdBy: foreignActorId,
                updatedBy: foreignActorId,
            }),
        });
        expect(adminCreateResponse.status).toBe(200);
        const body = await adminCreateResponse.json();
        fixtureRows.push({ entity: RoleEntity, id: body.data.id });
        expect(body.data.title).toBe(roleData.title);
        const persistedCreatedRole = await RoleEntity.findByPk(body.data.id);
        expect(persistedCreatedRole?.get("tenant")).toBe(tenant);
        expect(persistedCreatedRole?.get("createdBy")).toBe(admin.id);
        expect(persistedCreatedRole?.get("updatedBy")).toBe(admin.id);

        const adminPatchResponse = await request(`/api/roles/${body.data.id}`, {
            method: "PATCH",
            headers: { ...admin.headers, "Content-Type": "application/json" },
            body: JSON.stringify({
                title: "updated by role admin",
                access: { [ROLE_SECTIONS.PROJECTS]: { view: true, create: true } },
                tenant: foreignTenantId,
                createdBy: foreignActorId,
                updatedBy: foreignActorId,
            }),
        });
        expect(adminPatchResponse.status).toBe(200);
        const persistedUpdatedRole = await RoleEntity.findByPk(String(body.data.id));
        expect(persistedUpdatedRole?.get("title")).toBe("updated by role admin");
        expect(persistedUpdatedRole?.get("tenant")).toBe(tenant);
        expect(persistedUpdatedRole?.get("createdBy")).toBe(admin.id);
        expect(persistedUpdatedRole?.get("updatedBy")).toBe(admin.id);
    });
});
