// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { afterEach, describe, expect, it } from "vitest";
import {
    CompanyEntity,
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
import { Op } from "sequelize";
import { randomUUID } from "node:crypto";
import * as bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";
import app from "../../src/index";
import { issueSession } from "../../src/services/sessions";
import { rateLimitKeyHash } from "../../src/utils/rateLimit";

const fixtureRows: Array<{ entity: any; id: string }> = [];
const rateLimitedUserIds: string[] = [];

afterEach(async () => {
    const keyHashes = rateLimitedUserIds.map(userId => rateLimitKeyHash("authenticated-api-user", userId));
    if (keyHashes.length) {
        await RateLimitCounterEntity.destroy({ where: { keyHash: { [Op.in]: keyHashes } } });
    }
    rateLimitedUserIds.length = 0;
    for (const { entity, id } of fixtureRows.reverse()) {
        await entity.destroy({ where: { id }, force: true });
    }
    fixtureRows.length = 0;
});

describe("project relationship authorization", () => {
    it("rejects cross-tenant project owners, companies, and approvers", async () => {
        const credentials = JSON.parse(readFileSync("testUser.json", "utf8")) as { email: string };
        const owner = await UserEntity.findOne({ where: { email: credentials.email } });
        expect(owner).not.toBeNull();
        expect(owner!.get("admin")).toBe(false);
        const ownerId = String(owner!.get("id"));
        const tenant = String(owner!.get("tenant"));
        const role = await RoleEntity.findOne({ where: { title: "User", tenant } });
        expect(role).not.toBeNull();

        const createUser = async (label: string, userTenant: string) => {
            const user = await UserEntity.create({
                email: `project-link-${label}-${randomUUID()}@example.test`,
                password: await bcrypt.hash(randomUUID(), 10),
                firstName: `Project Link ${label}`,
                lastName: "Fixture",
                role: String(role!.get("id")),
                tenant: userTenant,
                admin: false,
                real: false,
            });
            const userId = String(user.get("id"));
            fixtureRows.push({ entity: UserEntity, id: userId });
            rateLimitedUserIds.push(userId);
            return userId;
        };

        const viewerId = await createUser("viewer", tenant);
        rateLimitedUserIds.push(ownerId);
        const ownerSession = await issueSession(ownerId, tenant, 120);
        fixtureRows.push({ entity: SessionEntity, id: ownerSession.sid });
        const viewerSession = await issueSession(viewerId, tenant, 120);
        fixtureRows.push({ entity: SessionEntity, id: viewerSession.sid });
        const ownerHeaders = {
            Authorization: `Bearer ${ownerSession.token}`,
            "Content-Type": "application/json",
        };
        const viewerHeaders = {
            Authorization: `Bearer ${viewerSession.token}`,
            "Content-Type": "application/json",
        };

        const projectId = randomUUID();
        const localProjectReadSentinel = `Local project read sentinel ${randomUUID()}`;
        await DocumentEntity.create({
            id: projectId,
            title: "Project relationship authorization target",
            type: RECORDTYPE.PROJECT,
            order: 0,
            tenant,
            createdBy: ownerId,
            updatedBy: ownerId,
        });
        fixtureRows.push({ entity: DocumentEntity, id: projectId });
        await ProjectEntity.create({
            id: projectId,
            description: localProjectReadSentinel,
            projectOwner: ownerId,
            tenant,
            createdBy: ownerId,
            updatedBy: ownerId,
        });
        fixtureRows.push({ entity: ProjectEntity, id: projectId });
        await PermissionEntity.create({
            id: projectId,
            owner: ownerId,
            isPublic: true,
            visibleUsers: [],
            visibleRoles: [],
            tenant,
            createdBy: ownerId,
            updatedBy: ownerId,
        });
        fixtureRows.push({ entity: PermissionEntity, id: projectId });

        const localCompany = await CompanyEntity.create({
            title: `Local project company ${randomUUID()}`,
            tenant,
            createdBy: ownerId,
            updatedBy: ownerId,
        });
        const localCompanyId = String(localCompany.get("id"));
        fixtureRows.push({ entity: CompanyEntity, id: localCompanyId });

        const foreignTenant = await TenantEntity.create({
            title: `Project relationship authorization ${randomUUID()}`,
            description: "temporary security fixture",
            expiry: new Date(Date.now() + 60 * 60 * 1000),
        });
        const foreignTenantId = String(foreignTenant.get("id"));
        fixtureRows.push({ entity: TenantEntity, id: foreignTenantId });
        const foreignUserId = await createUser("foreign", foreignTenantId);
        const foreignAdminRole = await RoleEntity.create({
            title: `Foreign project admin role ${randomUUID()}`,
            description: "temporary security fixture",
            access: {},
            disabled: false,
            tenant: foreignTenantId,
            createdBy: ownerId,
            updatedBy: ownerId,
        });
        const foreignAdminRoleId = String(foreignAdminRole.get("id"));
        fixtureRows.push({ entity: RoleEntity, id: foreignAdminRoleId });
        const foreignAdmin = await UserEntity.create({
            email: `foreign-project-admin-${randomUUID()}@example.test`,
            password: await bcrypt.hash(randomUUID(), 10),
            firstName: "Foreign Project",
            lastName: "Admin",
            role: foreignAdminRoleId,
            tenant: foreignTenantId,
            admin: true,
            real: false,
        });
        const foreignAdminId = String(foreignAdmin.get("id"));
        fixtureRows.push({ entity: UserEntity, id: foreignAdminId });
        rateLimitedUserIds.push(foreignAdminId);
        const foreignAdminSession = await issueSession(foreignAdminId, foreignTenantId, 120);
        fixtureRows.push({ entity: SessionEntity, id: foreignAdminSession.sid });
        const foreignCompany = await CompanyEntity.create({
            title: `Foreign project company ${randomUUID()}`,
            tenant: foreignTenantId,
            createdBy: ownerId,
            updatedBy: ownerId,
        });
        const foreignCompanyId = String(foreignCompany.get("id"));
        fixtureRows.push({ entity: CompanyEntity, id: foreignCompanyId });

        const foreignProjectId = randomUUID();
        const foreignProjectTitle = `Foreign project read sentinel ${randomUUID()}`;
        await DocumentEntity.create({
            id: foreignProjectId,
            title: foreignProjectTitle,
            type: RECORDTYPE.PROJECT,
            order: 0,
            tenant: foreignTenantId,
            createdBy: foreignAdminId,
            updatedBy: foreignAdminId,
        });
        fixtureRows.push({ entity: DocumentEntity, id: foreignProjectId });
        await ProjectEntity.create({
            id: foreignProjectId,
            projectOwner: foreignAdminId,
            tenant: foreignTenantId,
            createdBy: foreignAdminId,
            updatedBy: foreignAdminId,
        });
        fixtureRows.push({ entity: ProjectEntity, id: foreignProjectId });
        await PermissionEntity.create({
            id: foreignProjectId,
            owner: foreignAdminId,
            isPublic: true,
            visibleUsers: [],
            visibleRoles: [],
            tenant: foreignTenantId,
            createdBy: foreignAdminId,
            updatedBy: foreignAdminId,
        });
        fixtureRows.push({ entity: PermissionEntity, id: foreignProjectId });
        const foreignStackId = randomUUID();
        const foreignStackTitle = `Foreign stack read sentinel ${randomUUID()}`;
        await StackEntity.create({
            id: foreignStackId,
            title: foreignStackTitle,
            project: foreignProjectId,
            tenant: foreignTenantId,
            createdBy: foreignAdminId,
            updatedBy: foreignAdminId,
        });
        fixtureRows.push({ entity: StackEntity, id: foreignStackId });
        await PermissionEntity.create({
            id: foreignStackId,
            owner: foreignAdminId,
            isPublic: true,
            visibleUsers: [],
            visibleRoles: [],
            tenant: foreignTenantId,
            createdBy: foreignAdminId,
            updatedBy: foreignAdminId,
        });
        fixtureRows.push({ entity: PermissionEntity, id: foreignStackId });

        const localStackId = randomUUID();
        const localStackTitle = `Local stack read sentinel ${randomUUID()}`;
        await StackEntity.create({
            id: localStackId,
            title: localStackTitle,
            project: projectId,
            tenant,
            createdBy: ownerId,
            updatedBy: ownerId,
        });
        fixtureRows.push({ entity: StackEntity, id: localStackId });
        await PermissionEntity.create({
            id: localStackId,
            owner: ownerId,
            isPublic: true,
            visibleUsers: [],
            visibleRoles: [],
            tenant,
            createdBy: ownerId,
            updatedBy: ownerId,
        });
        fixtureRows.push({ entity: PermissionEntity, id: localStackId });

        const ownerProjectRead = await app.request(`/api/projects/${projectId}`, {
            headers: ownerHeaders,
        });
        expect(ownerProjectRead.status).toBe(200);
        expect(await ownerProjectRead.text()).toContain(localProjectReadSentinel);
        const ownerStacksRead = await app.request(`/api/projects/${projectId}/stacks`, {
            headers: ownerHeaders,
        });
        expect(ownerStacksRead.status).toBe(200);
        expect(await ownerStacksRead.text()).toContain(localStackTitle);
        const ownerOverviewRead = await app.request(`/api/projects/${projectId}/overview`, {
            headers: ownerHeaders,
        });
        expect(ownerOverviewRead.status).toBe(200);
        expect(await ownerOverviewRead.text()).toContain(localStackTitle);

        const foreignAdminHeaders = {
            Authorization: `Bearer ${foreignAdminSession.token}`,
        };
        const foreignAdminOwnProjectRead = await app.request(`/api/projects/${foreignProjectId}`, {
            headers: foreignAdminHeaders,
        });
        expect(foreignAdminOwnProjectRead.status).toBe(200);
        const foreignAdminOwnStacksRead = await app.request(`/api/projects/${foreignProjectId}/stacks`, {
            headers: foreignAdminHeaders,
        });
        expect(foreignAdminOwnStacksRead.status).toBe(200);
        expect(await foreignAdminOwnStacksRead.text()).toContain(foreignStackTitle);

        const foreignReadResponses = await Promise.all([
            app.request(`/api/projects/${projectId}`, { headers: foreignAdminHeaders }),
            app.request(`/api/projects/${projectId}/stacks`, { headers: foreignAdminHeaders }),
            app.request(`/api/projects/${projectId}/overview`, { headers: foreignAdminHeaders }),
        ]);
        expect(foreignReadResponses.map(response => response.status)).toEqual([404, 404, 404]);
        for (const response of foreignReadResponses) {
            expect(response.status).toBe(404);
            const body = await response.text();
            expect(body).not.toContain(localProjectReadSentinel);
            expect(body).not.toContain(localStackTitle);
        }
        const forgedProjectRead = await app.request(`/api/projects/${randomUUID()}`, {
            headers: ownerHeaders,
        });
        expect(forgedProjectRead.status).toBe(404);

        const patch = (data: object) =>
            app.request(`/api/projects/${projectId}`, {
                method: "PATCH",
                headers: ownerHeaders,
                body: JSON.stringify(data),
            });
        const viewerPatch = (data: object) =>
            app.request(`/api/projects/${projectId}`, {
                method: "PATCH",
                headers: viewerHeaders,
                body: JSON.stringify(data),
            });

        const validLocalRelationships = await patch({ company: localCompanyId, approvers: [viewerId] });
        expect(validLocalRelationships.status).toBe(200);

        expect((await patch({ projectOwner: foreignUserId })).status).toBe(404);
        expect((await patch({ company: foreignCompanyId })).status).toBe(404);
        expect((await patch({ approvers: [foreignUserId] })).status).toBe(404);
        expect((await viewerPatch({ projectOwner: foreignUserId })).status).toBe(403);
        expect((await viewerPatch({ projectOwner: randomUUID() })).status).toBe(403);

        const project = await ProjectEntity.findByPk(projectId);
        expect(project?.get("projectOwner")).toBe(ownerId);
        expect(project?.get("company")).toBe(localCompanyId);
        expect(project?.get("approvers")).toEqual([viewerId]);

        const stackId = randomUUID();
        await StackEntity.create({
            id: stackId,
            title: `Archive authorization stack ${randomUUID()}`,
            project: projectId,
            tenant,
            createdBy: ownerId,
            updatedBy: ownerId,
        });
        fixtureRows.push({ entity: StackEntity, id: stackId });

        const createTask = async (done: boolean) => {
            const id = randomUUID();
            await TaskEntity.create({
                id,
                title: `Archive authorization task ${randomUUID()}`,
                project: projectId,
                stack: stackId,
                done,
                tenant,
                createdBy: ownerId,
                updatedBy: ownerId,
            });
            fixtureRows.push({ entity: TaskEntity, id });
            await PermissionEntity.create({
                id,
                owner: ownerId,
                isPublic: false,
                visibleUsers: [],
                visibleRoles: [],
                tenant,
                createdBy: ownerId,
                updatedBy: ownerId,
            });
            fixtureRows.push({ entity: PermissionEntity, id });
            return id;
        };
        const completedTaskId = await createTask(true);
        const incompleteTaskId = await createTask(false);
        const archiveCompleted = (headers: Record<string, string>) =>
            app.request(`/api/projects/${projectId}/archive-completed`, {
                method: "POST",
                headers,
            });

        const viewerArchiveResponse = await archiveCompleted(viewerHeaders);
        expect(viewerArchiveResponse.status).toBe(403);
        const foreignAdminArchiveResponse = await archiveCompleted(foreignAdminHeaders);
        expect(foreignAdminArchiveResponse.status).toBe(404);
        expect((await TaskEntity.findByPk(completedTaskId))?.get("archived")).toBeNull();
        expect((await TaskEntity.findByPk(incompleteTaskId))?.get("archived")).toBeNull();

        const foreignAdminStackDeleteResponse = await app.request(`/api/stacks/${stackId}`, {
            method: "DELETE",
            headers: foreignAdminHeaders,
        });
        expect(foreignAdminStackDeleteResponse.status).toBe(404);
        expect((await TaskEntity.findByPk(completedTaskId))?.get("deleted")).toBeNull();
        expect((await TaskEntity.findByPk(incompleteTaskId))?.get("deleted")).toBeNull();

        const foreignAdminBulkDeleteResponse = await app.request(`/api/stacks/${stackId}?tasks=true`, {
            method: "DELETE",
            headers: foreignAdminHeaders,
        });
        expect(foreignAdminBulkDeleteResponse.status).toBe(200);
        expect((await TaskEntity.findByPk(completedTaskId))?.get("deleted")).toBeNull();
        expect((await TaskEntity.findByPk(incompleteTaskId))?.get("deleted")).toBeNull();

        const ownerArchiveResponse = await archiveCompleted(ownerHeaders);
        expect(ownerArchiveResponse.status).toBe(200);
        expect((await TaskEntity.findByPk(completedTaskId))?.get("archived")).toBeTruthy();
        expect((await TaskEntity.findByPk(incompleteTaskId))?.get("archived")).toBeNull();

        const otherTaskOwnerId = await createUser("archive-task-owner", tenant);
        const adminTaskId = randomUUID();
        await TaskEntity.create({
            id: adminTaskId,
            title: `Admin archive authorization task ${randomUUID()}`,
            project: projectId,
            stack: stackId,
            done: true,
            tenant,
            createdBy: otherTaskOwnerId,
            updatedBy: otherTaskOwnerId,
        });
        fixtureRows.push({ entity: TaskEntity, id: adminTaskId });
        await PermissionEntity.create({
            id: adminTaskId,
            owner: otherTaskOwnerId,
            isPublic: true,
            visibleUsers: [],
            visibleRoles: [],
            tenant,
            createdBy: otherTaskOwnerId,
            updatedBy: otherTaskOwnerId,
        });
        fixtureRows.push({ entity: PermissionEntity, id: adminTaskId });

        const sameTenantAdmin = await UserEntity.create({
            email: `same-tenant-project-admin-${randomUUID()}@example.test`,
            password: await bcrypt.hash(randomUUID(), 10),
            firstName: "Same Tenant Project",
            lastName: "Admin",
            role: String(role!.get("id")),
            tenant,
            admin: true,
            real: false,
        });
        const sameTenantAdminId = String(sameTenantAdmin.get("id"));
        fixtureRows.push({ entity: UserEntity, id: sameTenantAdminId });
        rateLimitedUserIds.push(sameTenantAdminId);
        const sameTenantAdminSession = await issueSession(sameTenantAdminId, tenant, 120);
        fixtureRows.push({ entity: SessionEntity, id: sameTenantAdminSession.sid });

        const projectOwnerOtherTaskArchiveResponse = await archiveCompleted(ownerHeaders);
        expect(projectOwnerOtherTaskArchiveResponse.status).toBe(403);
        expect((await TaskEntity.findByPk(adminTaskId))?.get("archived")).toBeNull();

        const adminArchiveResponse = await archiveCompleted({
            Authorization: `Bearer ${sameTenantAdminSession.token}`,
        });
        expect(adminArchiveResponse.status).toBe(200);
        expect((await TaskEntity.findByPk(adminTaskId))?.get("archived")).not.toBeNull();
    });
});
