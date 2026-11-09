// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { afterEach, describe, expect, it } from "vitest";
import {
    DocumentEntity,
    PermissionEntity,
    ProjectEntity,
    RateLimitCounterEntity,
    RoleEntity,
    SessionEntity,
    StackEntity,
    TaskEntity,
    TenantEntity,
    UserEntity,
} from "@stacks/db";
import { RECORDTYPE } from "@stacks/types";
import { randomUUID } from "node:crypto";
import { Op } from "sequelize";
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

describe("global search ACL authorization", () => {
    it("returns only tasks visible to the authenticated caller across users and tenants", async () => {
        const credentials = JSON.parse(readFileSync("testUser.json", "utf8")) as { email: string };
        const owner = await UserEntity.findOne({ where: { email: credentials.email } });
        expect(owner).not.toBeNull();

        const ownerId = String(owner!.get("id"));
        const ownerTenant = String(owner!.get("tenant"));
        const ownerRoleId = String(owner!.get("role"));
        rateLimitedUserIds.push(ownerId);
        const ownerSession = await issueSession(ownerId, ownerTenant, 120);
        fixtureRows.push({ entity: SessionEntity, id: ownerSession.sid });

        const viewer = await UserEntity.create({
            email: `search-viewer-${randomUUID()}@example.test`,
            password: randomUUID(),
            firstName: "Search",
            lastName: "Viewer",
            role: ownerRoleId,
            tenant: ownerTenant,
            admin: false,
            real: false,
        });
        const viewerId = String(viewer.get("id"));
        fixtureRows.push({ entity: UserEntity, id: viewerId });
        rateLimitedUserIds.push(viewerId);
        const viewerSession = await issueSession(viewerId, ownerTenant, 120);
        fixtureRows.push({ entity: SessionEntity, id: viewerSession.sid });

        const foreignTenant = await TenantEntity.create({
            title: `Search tenant ${randomUUID()}`,
            description: "temporary search ACL fixture",
            expiry: new Date(Date.now() + 60 * 60 * 1000),
        });
        const foreignTenantId = String(foreignTenant.get("id"));
        fixtureRows.push({ entity: TenantEntity, id: foreignTenantId });
        const foreignRole = await RoleEntity.create({
            title: `Search admin ${randomUUID()}`,
            description: "temporary search ACL fixture",
            access: {},
            disabled: false,
            tenant: foreignTenantId,
            createdBy: ownerId,
            updatedBy: ownerId,
        });
        const foreignRoleId = String(foreignRole.get("id"));
        fixtureRows.push({ entity: RoleEntity, id: foreignRoleId });
        const foreignAdmin = await UserEntity.create({
            email: `search-admin-${randomUUID()}@example.test`,
            password: randomUUID(),
            firstName: "Foreign",
            lastName: "Admin",
            role: foreignRoleId,
            tenant: foreignTenantId,
            admin: true,
            real: false,
        });
        const foreignAdminId = String(foreignAdmin.get("id"));
        fixtureRows.push({ entity: UserEntity, id: foreignAdminId });
        rateLimitedUserIds.push(foreignAdminId);
        const foreignSession = await issueSession(foreignAdminId, foreignTenantId, 120);
        fixtureRows.push({ entity: SessionEntity, id: foreignSession.sid });

        const searchTerm = `search-acl-${randomUUID()}`;
        const rateLimitIp = `198.51.100.${Math.floor(Math.random() * 254) + 1}`;
        rateLimitedIps.push(rateLimitIp);
        const createPrivateTask = async (tenant: string, userId: string, title: string) => {
            const projectId = randomUUID();
            const stackId = randomUUID();
            const taskId = randomUUID();
            await DocumentEntity.create({
                id: projectId,
                title: `${title} project`,
                type: RECORDTYPE.PROJECT,
                order: 0,
                tenant,
                createdBy: userId,
                updatedBy: userId,
            });
            fixtureRows.push({ entity: DocumentEntity, id: projectId });
            await ProjectEntity.create({
                id: projectId,
                projectOwner: userId,
                tenant,
                createdBy: userId,
                updatedBy: userId,
            });
            fixtureRows.push({ entity: ProjectEntity, id: projectId });
            await PermissionEntity.create({
                id: projectId,
                owner: userId,
                isPublic: false,
                visibleUsers: [],
                visibleRoles: [],
                tenant,
                createdBy: userId,
                updatedBy: userId,
            });
            fixtureRows.push({ entity: PermissionEntity, id: projectId });
            await StackEntity.create({
                id: stackId,
                title: `${title} stack`,
                project: projectId,
                tenant,
                createdBy: userId,
                updatedBy: userId,
            });
            fixtureRows.push({ entity: StackEntity, id: stackId });
            await PermissionEntity.create({
                id: stackId,
                owner: userId,
                isPublic: false,
                visibleUsers: [],
                visibleRoles: [],
                tenant,
                createdBy: userId,
                updatedBy: userId,
            });
            fixtureRows.push({ entity: PermissionEntity, id: stackId });
            await TaskEntity.create({
                id: taskId,
                title,
                project: projectId,
                stack: stackId,
                tenant,
                createdBy: userId,
                updatedBy: userId,
            });
            fixtureRows.push({ entity: TaskEntity, id: taskId });
            await PermissionEntity.create({
                id: taskId,
                owner: userId,
                isPublic: false,
                visibleUsers: [],
                visibleRoles: [],
                tenant,
                createdBy: userId,
                updatedBy: userId,
            });
            fixtureRows.push({ entity: PermissionEntity, id: taskId });
            return taskId;
        };

        const ownerTaskId = await createPrivateTask(ownerTenant, ownerId, `${searchTerm} owner task`);
        const foreignTaskId = await createPrivateTask(
            foreignTenantId,
            foreignAdminId,
            `${searchTerm} foreign task`
        );
        const searchAs = async (token: string) => {
            const response = await app.request(
                `/api/search?query=${encodeURIComponent(searchTerm)}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                },
                { incoming: { socket: { remoteAddress: rateLimitIp } } }
            );
            expect(response.status).toBe(200);
            const body = (await response.json()) as { data: Array<{ id: string; type: string }> };
            return body.data.filter(result => result.type === RECORDTYPE.TASK).map(result => result.id);
        };

        expect(await searchAs(ownerSession.token)).toContain(ownerTaskId);
        expect(await searchAs(ownerSession.token)).not.toContain(foreignTaskId);
        expect(await searchAs(viewerSession.token)).not.toContain(ownerTaskId);
        expect(await searchAs(foreignSession.token)).toContain(foreignTaskId);
        expect(await searchAs(foreignSession.token)).not.toContain(ownerTaskId);
    });
});
