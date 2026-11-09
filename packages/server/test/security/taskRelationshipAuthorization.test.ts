// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { afterEach, describe, expect, it } from "vitest";
import {
    DocumentEntity,
    NotificationEntity,
    PermissionEntity,
    ProjectEntity,
    RateLimitCounterEntity,
    RoleEntity,
    SessionEntity,
    StackEntity,
    TagEntity,
    TaskEntity,
    TenantEntity,
    TimelogEntity,
    UserEntity,
} from "@stacks/db";
import { AUTOMATION_DO, AUTOMATION_EVENT, RECORDTYPE, TAGSECTION, TAGTYPE } from "@stacks/types";
import * as bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { Op } from "sequelize";
import { readFileSync } from "node:fs";
import app from "../../src/index";
import { issueSession } from "../../src/services/sessions";
import { rateLimitKeyHash } from "../../src/utils/rateLimit";
import { getAuthToken } from "../helpers/authHelper";

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

describe("task relationship authorization", () => {
    const createFixture = async () => {
        const credentials = JSON.parse(readFileSync("testUser.json", "utf8")) as { email: string };
        const user = await UserEntity.findOne({ where: { email: credentials.email } });
        expect(user).not.toBeNull();

        const userId = String(user!.id);
        const tenant = String(user!.get("tenant"));
        const projectId = randomUUID();
        const stackId = randomUUID();

        await DocumentEntity.create({
            id: projectId,
            title: "Task relationship fixture",
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
            title: "Task relationship stack",
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

        return {
            projectId,
            stackId,
            tenant,
            userId,
            headers: { Authorization: `Bearer ${await getAuthToken()}` },
        };
    };

    const createTask = async (input: {
        id?: string;
        projectId: string;
        stackId: string;
        tenant: string;
        userId: string;
        parent?: string | null;
        dependencies?: string[];
    }) => {
        const id = input.id ?? randomUUID();
        await TaskEntity.create({
            id,
            title: "Task relationship fixture task",
            project: input.projectId,
            stack: input.stackId,
            parent: input.parent ?? null,
            dependencies: input.dependencies ?? [],
            tenant: input.tenant,
            createdBy: input.userId,
            updatedBy: input.userId,
        });
        fixtureRows.push({ entity: TaskEntity, id });
        await PermissionEntity.create({
            id,
            owner: input.userId,
            isPublic: false,
            visibleUsers: [],
            visibleRoles: [],
            tenant: input.tenant,
            createdBy: input.userId,
            updatedBy: input.userId,
        });
        fixtureRows.push({ entity: PermissionEntity, id });
        return id;
    };

    const createForeignTenantUser = async (createdBy: string) => {
        const tenant = await TenantEntity.create({
            title: `Task relationship tenant ${randomUUID()}`,
            description: "temporary security fixture",
            expiry: new Date(Date.now() + 60 * 60 * 1000),
        });
        const tenantId = String(tenant.get("id"));
        fixtureRows.push({ entity: TenantEntity, id: tenantId });

        const role = await RoleEntity.create({
            title: "Task relationship user",
            description: "temporary security fixture",
            access: {},
            disabled: false,
            tenant: tenantId,
            createdBy,
            updatedBy: createdBy,
        });
        const roleId = String(role.get("id"));
        fixtureRows.push({ entity: RoleEntity, id: roleId });

        const user = await UserEntity.create({
            email: `task-relationship-${randomUUID()}@example.test`,
            password: "test-password",
            firstName: "Foreign",
            lastName: "Task assignee",
            role: roleId,
            tenant: tenantId,
            real: false,
        });
        const userId = String(user.get("id"));
        fixtureRows.push({ entity: UserEntity, id: userId });
        return userId;
    };

    it("keeps task list, count, and segment reads inside project and task ACLs", async () => {
        const fixture = await createFixture();
        rateLimitedUserIds.push(fixture.userId);
        const owner = await UserEntity.findByPk(fixture.userId);
        expect(owner).not.toBeNull();
        const taskId = await createTask({
            projectId: fixture.projectId,
            stackId: fixture.stackId,
            tenant: fixture.tenant,
            userId: fixture.userId,
        });
        const viewer = await UserEntity.create({
            email: `task-list-viewer-${randomUUID()}@example.test`,
            password: await bcrypt.hash(randomUUID(), 10),
            firstName: "Task list",
            lastName: "Viewer",
            role: String(owner!.get("role")),
            tenant: fixture.tenant,
            admin: false,
            real: false,
        });
        const viewerId = String(viewer.get("id"));
        fixtureRows.push({ entity: UserEntity, id: viewerId });
        rateLimitedUserIds.push(viewerId);
        const viewerSession = await issueSession(viewerId, fixture.tenant, 120);
        fixtureRows.push({ entity: SessionEntity, id: viewerSession.sid });

        const foreignAdminId = await createForeignTenantUser(fixture.userId);
        await UserEntity.update({ admin: true }, { where: { id: foreignAdminId } });
        rateLimitedUserIds.push(foreignAdminId);
        const foreignAdmin = await UserEntity.findByPk(foreignAdminId);
        expect(foreignAdmin).not.toBeNull();
        const foreignTenant = String(foreignAdmin!.get("tenant"));
        const foreignSession = await issueSession(foreignAdminId, foreignTenant, 120);
        fixtureRows.push({ entity: SessionEntity, id: foreignSession.sid });

        const foreignProjectId = randomUUID();
        const foreignStackId = randomUUID();
        const foreignTaskId = randomUUID();
        await DocumentEntity.create({
            id: foreignProjectId,
            title: `Task list foreign project ${randomUUID()}`,
            type: RECORDTYPE.PROJECT,
            order: 0,
            tenant: foreignTenant,
            createdBy: foreignAdminId,
            updatedBy: foreignAdminId,
        });
        fixtureRows.push({ entity: DocumentEntity, id: foreignProjectId });
        await ProjectEntity.create({
            id: foreignProjectId,
            projectOwner: foreignAdminId,
            tenant: foreignTenant,
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
            tenant: foreignTenant,
            createdBy: foreignAdminId,
            updatedBy: foreignAdminId,
        });
        fixtureRows.push({ entity: PermissionEntity, id: foreignProjectId });
        await StackEntity.create({
            id: foreignStackId,
            title: `Task list foreign stack ${randomUUID()}`,
            project: foreignProjectId,
            tenant: foreignTenant,
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
            tenant: foreignTenant,
            createdBy: foreignAdminId,
            updatedBy: foreignAdminId,
        });
        fixtureRows.push({ entity: PermissionEntity, id: foreignStackId });
        await TaskEntity.create({
            id: foreignTaskId,
            title: `Task list foreign task ${randomUUID()}`,
            project: foreignProjectId,
            stack: foreignStackId,
            tenant: foreignTenant,
            createdBy: foreignAdminId,
            updatedBy: foreignAdminId,
        });
        fixtureRows.push({ entity: TaskEntity, id: foreignTaskId });
        await PermissionEntity.create({
            id: foreignTaskId,
            owner: foreignAdminId,
            isPublic: false,
            visibleUsers: [],
            visibleRoles: [],
            tenant: foreignTenant,
            createdBy: foreignAdminId,
            updatedBy: foreignAdminId,
        });
        fixtureRows.push({ entity: PermissionEntity, id: foreignTaskId });

        await PermissionEntity.update(
            { isPublic: true },
            { where: { id: fixture.projectId, tenant: fixture.tenant } }
        );

        const readAs = async (token: string, path: string) => {
            const response = await app.request(path, {
                headers: { Authorization: `Bearer ${token}` },
            });
            expect(response.status, `${path}: ${await response.clone().text()}`).toBe(200);
            const body = await response.json();
            expect(body.success).toBe(true);
            return body.data;
        };
        const ownerList = await readAs(
            fixture.headers.Authorization.slice("Bearer ".length),
            `/api/tasks?ids=${taskId}`
        );
        const viewerList = await readAs(viewerSession.token, `/api/tasks?ids=${taskId}`);
        const foreignList = await readAs(foreignSession.token, `/api/tasks?ids=${taskId}`);
        const foreignOwnList = await readAs(foreignSession.token, `/api/tasks?ids=${foreignTaskId}`);
        expect(ownerList.map((task: { id: string }) => task.id)).toEqual([taskId]);
        expect(viewerList).toEqual([]);
        expect(foreignList).toEqual([]);
        expect(foreignOwnList.map((task: { id: string }) => task.id)).toEqual([foreignTaskId]);

        const ownerCount = await readAs(
            fixture.headers.Authorization.slice("Bearer ".length),
            `/api/tasks/count?ids=${taskId}`
        );
        const viewerCount = await readAs(viewerSession.token, `/api/tasks/count?ids=${taskId}`);
        const foreignCount = await readAs(foreignSession.token, `/api/tasks/count?ids=${taskId}`);
        const foreignOwnCount = await readAs(foreignSession.token, `/api/tasks/count?ids=${foreignTaskId}`);
        expect(ownerCount).toBe(1);
        expect(viewerCount).toBe(0);
        expect(foreignCount).toBe(0);
        expect(foreignOwnCount).toBe(1);

        const ownerSegment = await readAs(
            fixture.headers.Authorization.slice("Bearer ".length),
            `/api/tasks/segment?tasks=${taskId}`
        );
        const viewerSegment = await readAs(viewerSession.token, `/api/tasks/segment?tasks=${taskId}`);
        const foreignSegment = await readAs(foreignSession.token, `/api/tasks/segment?tasks=${taskId}`);
        const foreignOwnSegment = await readAs(
            foreignSession.token,
            `/api/tasks/segment?tasks=${foreignTaskId}`
        );
        expect(ownerSegment.map((task: { id: string }) => task.id)).toEqual([taskId]);
        expect(viewerSegment).toEqual([]);
        expect(foreignSegment).toEqual([]);
        expect(foreignOwnSegment.map((task: { id: string }) => task.id)).toEqual([foreignTaskId]);
    });

    it("rejects cross-tenant assignees injected by a project automation", async () => {
        const fixture = await createFixture();
        const foreignUserId = await createForeignTenantUser(fixture.userId);
        const setCreateAutomation = async (assigneeId: string) => {
            const automations = [
                {
                    id: randomUUID(),
                    title: "Assign task user",
                    enabled: true,
                    event: AUTOMATION_EVENT.DONE,
                    actions: [{ id: randomUUID(), do: AUTOMATION_DO.ASSIGN, value: [assigneeId] }],
                },
            ];
            const response = await app.request(`/api/projects/${fixture.projectId}`, {
                method: "PATCH",
                headers: { ...fixture.headers, "Content-Type": "application/json" },
                body: JSON.stringify({ automations }),
            });
            expect(response.status).toBe(200);
            const project = await ProjectEntity.findByPk(fixture.projectId);
            expect(project?.get("automations")).toEqual(automations);
        };
        const createAutomatedTask = async (title: string) => {
            const response = await app.request("/api/tasks", {
                method: "POST",
                headers: { ...fixture.headers, "Content-Type": "application/json" },
                body: JSON.stringify({ task: { title, project: fixture.projectId, stack: fixture.stackId } }),
            });
            expect(response.status).toBe(200);
            const body = await response.json();
            const taskId = String(body.data.id);
            fixtureRows.push({ entity: PermissionEntity, id: taskId });
            fixtureRows.push({ entity: TaskEntity, id: taskId });
            return TaskEntity.findOne({ where: { id: taskId, tenant: fixture.tenant } });
        };

        const validTask = await createAutomatedTask(`Automation same-tenant assignee ${randomUUID()}`);
        await setCreateAutomation(fixture.userId);
        const validResponse = await app.request(`/api/tasks/${validTask?.get("id")}`, {
            method: "PATCH",
            headers: { ...fixture.headers, "Content-Type": "application/json" },
            body: JSON.stringify({ done: true }),
        });
        expect(validResponse.status).toBe(200);
        const validUpdatedTask = await TaskEntity.findByPk(String(validTask?.get("id")));
        expect(validUpdatedTask?.get("assignees")).toContain(fixture.userId);

        const foreignTask = await createAutomatedTask(`Automation foreign assignee ${randomUUID()}`);
        await setCreateAutomation(foreignUserId);
        const foreignResponse = await app.request(`/api/tasks/${foreignTask?.get("id")}`, {
            method: "PATCH",
            headers: { ...fixture.headers, "Content-Type": "application/json" },
            body: JSON.stringify({ done: true }),
        });
        expect(foreignResponse.status).toBe(404);
        const updatedForeignTask = await TaskEntity.findByPk(String(foreignTask?.get("id")));
        expect(updatedForeignTask?.get("assignees")).not.toContain(foreignUserId);
        expect(updatedForeignTask?.get("done")).toBe(false);
    });

    it("rejects cross-tenant tags and statuses injected by project automations", async () => {
        const fixture = await createFixture();
        const foreignUserId = await createForeignTenantUser(fixture.userId);
        const foreignUser = await UserEntity.findByPk(foreignUserId);
        const foreignTenant = String(foreignUser!.get("tenant"));
        const createTag = async (title: string, type: TAGTYPE, tenant: string, createdBy: string) => {
            const tag = await TagEntity.create({
                title,
                color: "#123456",
                section: TAGSECTION.PROJECTS,
                type,
                parent: null,
                tenant,
                createdBy,
                updatedBy: createdBy,
            });
            const id = String(tag.get("id"));
            fixtureRows.push({ entity: TagEntity, id });
            return id;
        };
        const localTagId = await createTag(
            "Local automation tag",
            TAGTYPE.TAG,
            fixture.tenant,
            fixture.userId
        );
        const foreignTagId = await createTag(
            "Foreign automation tag",
            TAGTYPE.TAG,
            foreignTenant,
            foreignUserId
        );
        const foreignStatusId = await createTag(
            "Foreign automation status",
            TAGTYPE.STATUS,
            foreignTenant,
            foreignUserId
        );
        const setAutomation = async (action: { do: AUTOMATION_DO; value: string | string[] }) => {
            const response = await app.request(`/api/projects/${fixture.projectId}`, {
                method: "PATCH",
                headers: { ...fixture.headers, "Content-Type": "application/json" },
                body: JSON.stringify({
                    automations: [
                        {
                            id: randomUUID(),
                            title: "Set task tag",
                            enabled: true,
                            event: AUTOMATION_EVENT.DONE,
                            actions: [{ id: randomUUID(), ...action }],
                        },
                    ],
                }),
            });
            expect(response.status).toBe(200);
        };
        const runAutomation = async (action: { do: AUTOMATION_DO; value: string | string[] }) => {
            await setAutomation(action);
            const title = `Automation relationship ${randomUUID()}`;
            const createResponse = await app.request("/api/tasks", {
                method: "POST",
                headers: { ...fixture.headers, "Content-Type": "application/json" },
                body: JSON.stringify({ task: { title, project: fixture.projectId, stack: fixture.stackId } }),
            });
            expect(createResponse.status).toBe(200);
            const body = await createResponse.json();
            const taskId = String(body.data.id);
            fixtureRows.push({ entity: PermissionEntity, id: taskId });
            fixtureRows.push({ entity: TaskEntity, id: taskId });
            const response = await app.request(`/api/tasks/${taskId}`, {
                method: "PATCH",
                headers: { ...fixture.headers, "Content-Type": "application/json" },
                body: JSON.stringify({ done: true }),
            });
            return { response, task: await TaskEntity.findByPk(taskId) };
        };

        const allowed = await runAutomation({ do: AUTOMATION_DO.ADDTAG, value: [localTagId] });
        expect(allowed.response.status).toBe(200);
        expect(allowed.task?.get("tags")).toContain(localTagId);

        const foreignTag = await runAutomation({ do: AUTOMATION_DO.ADDTAG, value: [foreignTagId] });
        expect(foreignTag.response.status).toBe(404);
        expect(foreignTag.task?.get("tags")).toEqual([]);
        expect(foreignTag.task?.get("done")).toBe(false);

        const foreignStatus = await runAutomation({ do: AUTOMATION_DO.ADDSTATUS, value: foreignStatusId });
        expect(foreignStatus.response.status).toBe(404);
        expect(foreignStatus.task?.get("status")).toBeNull();
        expect(foreignStatus.task?.get("done")).toBe(false);
    });

    it("rejects a project automation that moves a task into another project's stack", async () => {
        const fixture = await createFixture();
        const taskId = await createTask(fixture);
        const other = await createOtherProjectStack(fixture);
        const localStackId = randomUUID();
        await StackEntity.create({
            id: localStackId,
            title: "Local automation destination",
            project: fixture.projectId,
            tenant: fixture.tenant,
            createdBy: fixture.userId,
            updatedBy: fixture.userId,
        });
        fixtureRows.push({ entity: StackEntity, id: localStackId });
        await PermissionEntity.create({
            id: localStackId,
            owner: fixture.userId,
            isPublic: false,
            visibleUsers: [],
            visibleRoles: [],
            tenant: fixture.tenant,
            createdBy: fixture.userId,
            updatedBy: fixture.userId,
        });
        fixtureRows.push({ entity: PermissionEntity, id: localStackId });

        const automationResponse = await app.request(`/api/projects/${fixture.projectId}`, {
            method: "PATCH",
            headers: { ...fixture.headers, "Content-Type": "application/json" },
            body: JSON.stringify({
                automations: [
                    {
                        id: randomUUID(),
                        title: "Move task across projects",
                        enabled: true,
                        event: AUTOMATION_EVENT.MOVED,
                        value: localStackId,
                        actions: [{ id: randomUUID(), do: AUTOMATION_DO.MOVE, value: other.stackId }],
                    },
                ],
            }),
        });
        expect(automationResponse.status).toBe(200);

        const response = await app.request("/api/tasks/move", {
            method: "POST",
            headers: { ...fixture.headers, "Content-Type": "application/json" },
            body: JSON.stringify({ task: taskId, stack: localStackId }),
        });

        expect(response.status).toBe(404);
        const task = await TaskEntity.findOne({ where: { id: taskId, tenant: fixture.tenant } });
        expect(task?.get("stack")).toBe(fixture.stackId);
        const foreignStack = await StackEntity.findByPk(other.stackId);
        expect(foreignStack?.get("tasksOrder")).not.toContain(taskId);

        await app.request(`/api/projects/${fixture.projectId}`, {
            method: "PATCH",
            headers: { ...fixture.headers, "Content-Type": "application/json" },
            body: JSON.stringify({ automations: [] }),
        });
        const allowedResponse = await app.request("/api/tasks/move", {
            method: "POST",
            headers: { ...fixture.headers, "Content-Type": "application/json" },
            body: JSON.stringify({ task: taskId, stack: localStackId }),
        });
        expect(allowedResponse.status).toBe(200);
        const movedTask = await TaskEntity.findOne({ where: { id: taskId, tenant: fixture.tenant } });
        expect(movedTask?.get("stack")).toBe(localStackId);
    });

    const createOtherProjectStack = async (fixture: { tenant: string; userId: string }) => {
        const projectId = randomUUID();
        const stackId = randomUUID();
        await DocumentEntity.create({
            id: projectId,
            title: "Other task relationship project",
            type: RECORDTYPE.PROJECT,
            order: 0,
            tenant: fixture.tenant,
            createdBy: fixture.userId,
            updatedBy: fixture.userId,
        });
        fixtureRows.push({ entity: DocumentEntity, id: projectId });
        await ProjectEntity.create({
            id: projectId,
            projectOwner: fixture.userId,
            tenant: fixture.tenant,
            createdBy: fixture.userId,
            updatedBy: fixture.userId,
        });
        fixtureRows.push({ entity: ProjectEntity, id: projectId });
        await PermissionEntity.create({
            id: projectId,
            owner: fixture.userId,
            isPublic: false,
            visibleUsers: [],
            visibleRoles: [],
            tenant: fixture.tenant,
            createdBy: fixture.userId,
            updatedBy: fixture.userId,
        });
        fixtureRows.push({ entity: PermissionEntity, id: projectId });
        await StackEntity.create({
            id: stackId,
            title: "Other task relationship stack",
            project: projectId,
            tenant: fixture.tenant,
            createdBy: fixture.userId,
            updatedBy: fixture.userId,
        });
        fixtureRows.push({ entity: StackEntity, id: stackId });
        await PermissionEntity.create({
            id: stackId,
            owner: fixture.userId,
            isPublic: false,
            visibleUsers: [],
            visibleRoles: [],
            tenant: fixture.tenant,
            createdBy: fixture.userId,
            updatedBy: fixture.userId,
        });
        fixtureRows.push({ entity: PermissionEntity, id: stackId });
        return { projectId, stackId };
    };

    it("binds task identity and tenant fields to the authenticated caller on create", async () => {
        const fixture = await createFixture();
        const forgedId = randomUUID();
        const forgedTenant = randomUUID();
        const forgedCreator = randomUUID();
        const title = `Spoofed task identity ${randomUUID()}`;

        const response = await app.request("/api/tasks", {
            method: "POST",
            headers: { ...fixture.headers, "Content-Type": "application/json" },
            body: JSON.stringify({
                task: {
                    id: forgedId,
                    title,
                    project: fixture.projectId,
                    stack: fixture.stackId,
                    tenant: forgedTenant,
                    createdBy: forgedCreator,
                    updatedBy: forgedCreator,
                    deletedBy: forgedCreator,
                    deleted: new Date().toISOString(),
                    admin: true,
                },
            }),
        });

        expect(response.status).toBe(200);
        const body = await response.json();
        const createdId = String(body.data.id);
        fixtureRows.push({ entity: PermissionEntity, id: createdId });
        fixtureRows.push({ entity: TaskEntity, id: createdId });
        expect(createdId).not.toBe(forgedId);

        const created = await TaskEntity.findByPk(createdId);
        expect(created?.get("tenant")).toBe(fixture.tenant);
        expect(created?.get("createdBy")).toBe(fixture.userId);
        expect(created?.get("updatedBy")).toBe(fixture.userId);
        expect(created?.get("deleted")).toBeNull();
        expect(await TaskEntity.count({ where: { id: forgedId } })).toBe(0);
        expect(await TaskEntity.count({ where: { tenant: forgedTenant, title } })).toBe(0);
    });

    it("rejects a task creation that links to a foreign tenant parent", async () => {
        const fixture = await createFixture();
        const foreignTaskId = await createTask({
            projectId: randomUUID(),
            stackId: randomUUID(),
            tenant: randomUUID(),
            userId: randomUUID(),
        });
        const title = `Cross-tenant parent ${randomUUID()}`;

        const response = await app.request("/api/tasks", {
            method: "POST",
            headers: { ...fixture.headers, "Content-Type": "application/json" },
            body: JSON.stringify({
                task: { title, project: fixture.projectId, stack: fixture.stackId, parent: foreignTaskId },
            }),
        });

        expect(response.status).toBe(404);
        expect(await TaskEntity.count({ where: { title, tenant: fixture.tenant } })).toBe(0);

        const localParentId = await createTask(fixture);
        const allowedResponse = await app.request("/api/tasks", {
            method: "POST",
            headers: { ...fixture.headers, "Content-Type": "application/json" },
            body: JSON.stringify({
                task: {
                    title: `Visible parent control ${randomUUID()}`,
                    project: fixture.projectId,
                    stack: fixture.stackId,
                    parent: localParentId,
                },
            }),
        });
        expect(allowedResponse.status).toBe(200);
        const allowedTask = await allowedResponse.json();
        fixtureRows.push({ entity: TaskEntity, id: allowedTask.data.id });
        fixtureRows.push({ entity: PermissionEntity, id: allowedTask.data.id });
    });

    it("rejects a same-tenant parent that is hidden by ACL", async () => {
        const fixture = await createFixture();
        const hiddenTaskId = await createTask({
            projectId: randomUUID(),
            stackId: randomUUID(),
            tenant: fixture.tenant,
            userId: randomUUID(),
        });
        const title = `Hidden parent ${randomUUID()}`;

        const response = await app.request("/api/tasks", {
            method: "POST",
            headers: { ...fixture.headers, "Content-Type": "application/json" },
            body: JSON.stringify({
                task: { title, project: fixture.projectId, stack: fixture.stackId, parent: hiddenTaskId },
            }),
        });

        expect(response.status).toBe(404);
        expect(await TaskEntity.count({ where: { title, tenant: fixture.tenant } })).toBe(0);
    });

    it("rejects dependencies on a foreign tenant task without changing the target", async () => {
        const fixture = await createFixture();
        const taskId = await createTask(fixture);
        const allowedDependencyId = await createTask(fixture);
        const foreignTaskId = await createTask({
            projectId: randomUUID(),
            stackId: randomUUID(),
            tenant: randomUUID(),
            userId: randomUUID(),
        });

        const response = await app.request(`/api/tasks/${taskId}`, {
            method: "PATCH",
            headers: { ...fixture.headers, "Content-Type": "application/json" },
            body: JSON.stringify({ dependencies: [foreignTaskId] }),
        });

        expect(response.status).toBe(404);
        const task = await TaskEntity.findOne({ where: { id: taskId, tenant: fixture.tenant } });
        expect(task?.get("dependencies")).toEqual([]);

        const allowedResponse = await app.request(`/api/tasks/${taskId}`, {
            method: "PATCH",
            headers: { ...fixture.headers, "Content-Type": "application/json" },
            body: JSON.stringify({ dependencies: [allowedDependencyId] }),
        });
        expect(allowedResponse.status).toBe(200);
        const updatedTask = await TaskEntity.findOne({ where: { id: taskId, tenant: fixture.tenant } });
        expect(updatedTask?.get("dependencies")).toEqual([allowedDependencyId]);
    });

    it("rejects subtasks order entries that reference another tenant", async () => {
        const fixture = await createFixture();
        const taskId = await createTask(fixture);
        const foreignTaskId = await createTask({
            projectId: randomUUID(),
            stackId: randomUUID(),
            tenant: randomUUID(),
            userId: randomUUID(),
        });

        const response = await app.request(`/api/tasks/${taskId}`, {
            method: "PATCH",
            headers: { ...fixture.headers, "Content-Type": "application/json" },
            body: JSON.stringify({ subtasksOrder: [foreignTaskId] }),
        });

        expect(response.status).toBe(404);
        const task = await TaskEntity.findOne({ where: { id: taskId, tenant: fixture.tenant } });
        expect(task?.get("subtasksOrder")).toEqual([]);

        const childTaskId = await createTask({ ...fixture, parent: taskId });
        const allowedResponse = await app.request(`/api/tasks/${taskId}`, {
            method: "PATCH",
            headers: { ...fixture.headers, "Content-Type": "application/json" },
            body: JSON.stringify({ subtasksOrder: [childTaskId] }),
        });
        expect(allowedResponse.status).toBe(200);
    });

    it("rejects moving a task into a stack from another project", async () => {
        const fixture = await createFixture();
        const taskId = await createTask(fixture);
        const other = await createOtherProjectStack(fixture);

        const response = await app.request("/api/tasks/move", {
            method: "POST",
            headers: { ...fixture.headers, "Content-Type": "application/json" },
            body: JSON.stringify({ task: taskId, stack: other.stackId }),
        });

        expect(response.status).toBe(404);
        const task = await TaskEntity.findOne({ where: { id: taskId, tenant: fixture.tenant } });
        expect(task?.get("stack")).toBe(fixture.stackId);

        const allowedResponse = await app.request("/api/tasks/move", {
            method: "POST",
            headers: { ...fixture.headers, "Content-Type": "application/json" },
            body: JSON.stringify({ task: taskId, stack: fixture.stackId }),
        });
        expect(allowedResponse.status).toBe(200);
    });

    it("rejects creating a task with a stack from another project", async () => {
        const fixture = await createFixture();
        const other = await createOtherProjectStack(fixture);
        const title = `Mismatched task stack ${randomUUID()}`;
        const otherStackBefore = await StackEntity.findByPk(other.stackId);
        const originalTasksOrder = otherStackBefore?.get("tasksOrder");

        const response = await app.request("/api/tasks", {
            method: "POST",
            headers: { ...fixture.headers, "Content-Type": "application/json" },
            body: JSON.stringify({
                task: { title, project: fixture.projectId, stack: other.stackId },
            }),
        });
        const body = await response.json();
        if (body.data?.id) {
            fixtureRows.push({ entity: PermissionEntity, id: body.data.id });
            fixtureRows.push({ entity: TaskEntity, id: body.data.id });
        }

        expect(response.status).toBe(404);
        expect(await TaskEntity.count({ where: { title, tenant: fixture.tenant } })).toBe(0);
        const otherStackAfter = await StackEntity.findByPk(other.stackId);
        expect(otherStackAfter?.get("tasksOrder")).toEqual(originalTasksOrder);
    });

    it("rejects reordering a stack with a task from another project", async () => {
        const fixture = await createFixture();
        const other = await createOtherProjectStack(fixture);
        const foreignProjectTaskId = await createTask({
            projectId: other.projectId,
            stackId: other.stackId,
            tenant: fixture.tenant,
            userId: fixture.userId,
        });
        const localTaskId = await createTask(fixture);

        const response = await app.request(`/api/stacks/${fixture.stackId}`, {
            method: "PATCH",
            headers: { ...fixture.headers, "Content-Type": "application/json" },
            body: JSON.stringify({ tasksOrder: [foreignProjectTaskId] }),
        });

        expect(response.status).toBe(404);
        const stackAfterDeniedWrite = await StackEntity.findByPk(fixture.stackId);
        expect(stackAfterDeniedWrite?.get("tasksOrder")).toEqual([]);

        const viewer = await UserEntity.create({
            email: `stack-order-viewer-${randomUUID()}@example.test`,
            password: await bcrypt.hash(randomUUID(), 10),
            firstName: "Stack Order",
            lastName: "Viewer",
            role: String((await UserEntity.findByPk(fixture.userId))!.get("role")),
            tenant: fixture.tenant,
            admin: false,
            real: false,
        });
        const viewerId = String(viewer.get("id"));
        fixtureRows.push({ entity: UserEntity, id: viewerId });
        rateLimitedUserIds.push(viewerId);
        const viewerSession = await issueSession(viewerId, fixture.tenant, 120);
        fixtureRows.push({ entity: SessionEntity, id: viewerSession.sid });
        await PermissionEntity.update(
            { isPublic: true },
            { where: { id: [fixture.projectId, fixture.stackId], tenant: fixture.tenant } }
        );

        for (const taskId of [foreignProjectTaskId, randomUUID()]) {
            const viewerResponse = await app.request(`/api/stacks/${fixture.stackId}`, {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${viewerSession.token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ tasksOrder: [taskId] }),
            });
            expect(viewerResponse.status).toBe(403);
        }
        expect((await StackEntity.findByPk(fixture.stackId))?.get("tasksOrder")).toEqual([]);

        const allowedResponse = await app.request(`/api/stacks/${fixture.stackId}`, {
            method: "PATCH",
            headers: { ...fixture.headers, "Content-Type": "application/json" },
            body: JSON.stringify({ tasksOrder: [localTaskId] }),
        });
        expect(allowedResponse.status).toBe(200);
        const stackAfterAllowedWrite = await StackEntity.findByPk(fixture.stackId);
        expect(stackAfterAllowedWrite?.get("tasksOrder")).toEqual([localTaskId]);
    });

    it("rejects changing a stack's project through the stack update endpoint", async () => {
        const fixture = await createFixture();
        const other = await createOtherProjectStack(fixture);

        const response = await app.request(`/api/stacks/${fixture.stackId}`, {
            method: "PATCH",
            headers: { ...fixture.headers, "Content-Type": "application/json" },
            body: JSON.stringify({ project: other.projectId }),
        });

        expect(response.status).toBe(400);
        const stackAfterDeniedWrite = await StackEntity.findByPk(fixture.stackId);
        expect(stackAfterDeniedWrite?.get("project")).toBe(fixture.projectId);
    });

    it("rejects task updates that pair a project with a stack from another project", async () => {
        const fixture = await createFixture();
        const taskId = await createTask(fixture);
        const other = await createOtherProjectStack(fixture);

        const response = await app.request(`/api/tasks/${taskId}`, {
            method: "PATCH",
            headers: { ...fixture.headers, "Content-Type": "application/json" },
            body: JSON.stringify({ project: other.projectId }),
        });

        expect(response.status).toBe(404);
        const task = await TaskEntity.findOne({ where: { id: taskId, tenant: fixture.tenant } });
        expect(task?.get("project")).toBe(fixture.projectId);

        const allowedResponse = await app.request(`/api/tasks/${taskId}`, {
            method: "PATCH",
            headers: { ...fixture.headers, "Content-Type": "application/json" },
            body: JSON.stringify({ project: fixture.projectId }),
        });
        expect(allowedResponse.status).toBe(200);
    });

    it("rejects task tag and status references from another tenant", async () => {
        const fixture = await createFixture();
        const taskId = await createTask(fixture);
        const foreignTagId = randomUUID();
        await TagEntity.create({
            id: foreignTagId,
            title: "Foreign task tag",
            color: "#ff0000",
            section: TAGSECTION.PROJECTS,
            type: TAGTYPE.TAG,
            parent: null,
            tenant: randomUUID(),
            createdBy: randomUUID(),
            updatedBy: randomUUID(),
        });
        fixtureRows.push({ entity: TagEntity, id: foreignTagId });

        const response = await app.request(`/api/tasks/${taskId}`, {
            method: "PATCH",
            headers: { ...fixture.headers, "Content-Type": "application/json" },
            body: JSON.stringify({ tags: [foreignTagId], status: foreignTagId }),
        });

        expect(response.status).toBe(404);
        const task = await TaskEntity.findOne({ where: { id: taskId, tenant: fixture.tenant } });
        expect(task?.get("tags")).toEqual([]);
        expect(task?.get("status")).toBeNull();

        const localTagId = randomUUID();
        await TagEntity.create({
            id: localTagId,
            title: "Visible task tag",
            color: "#00ff00",
            section: TAGSECTION.PROJECTS,
            type: TAGTYPE.TAG,
            parent: null,
            tenant: fixture.tenant,
            createdBy: fixture.userId,
            updatedBy: fixture.userId,
        });
        fixtureRows.push({ entity: TagEntity, id: localTagId });

        const allowedResponse = await app.request(`/api/tasks/${taskId}`, {
            method: "PATCH",
            headers: { ...fixture.headers, "Content-Type": "application/json" },
            body: JSON.stringify({ tags: [localTagId], status: localTagId }),
        });
        expect(allowedResponse.status).toBe(200);
    });

    it("rejects assigning a task to a user in another tenant", async () => {
        const fixture = await createFixture();
        const taskId = await createTask(fixture);
        const foreignTenant = randomUUID();
        const foreignRoleId = randomUUID();
        const foreignUserId = randomUUID();
        await RoleEntity.create({
            id: foreignRoleId,
            title: `Foreign role ${foreignRoleId}`,
            access: {},
            tenant: foreignTenant,
            createdBy: fixture.userId,
            updatedBy: fixture.userId,
        });
        fixtureRows.push({ entity: RoleEntity, id: foreignRoleId });
        await UserEntity.create({
            id: foreignUserId,
            email: `${foreignUserId}@example.test`,
            password: await bcrypt.hash(randomUUID(), 10),
            firstName: "Foreign",
            lastName: "Assignee",
            role: foreignRoleId,
            tenant: foreignTenant,
            admin: false,
            real: false,
            createdBy: fixture.userId,
            updatedBy: fixture.userId,
        });
        fixtureRows.push({ entity: UserEntity, id: foreignUserId });

        const response = await app.request(`/api/tasks/${taskId}`, {
            method: "PATCH",
            headers: { ...fixture.headers, "Content-Type": "application/json" },
            body: JSON.stringify({ assignees: [foreignUserId] }),
        });
        const notifications = await NotificationEntity.findAll({
            where: { recipient: foreignUserId, tenant: fixture.tenant },
        });
        for (const notification of notifications) {
            fixtureRows.push({ entity: NotificationEntity, id: String(notification.id) });
        }

        expect(response.status).toBe(404);
        expect(notifications).toHaveLength(0);
        const task = await TaskEntity.findOne({ where: { id: taskId, tenant: fixture.tenant } });
        expect(task?.get("assignees")).toEqual([]);

        const allowedResponse = await app.request(`/api/tasks/${taskId}`, {
            method: "PATCH",
            headers: { ...fixture.headers, "Content-Type": "application/json" },
            body: JSON.stringify({ assignees: [fixture.userId] }),
        });
        expect(allowedResponse.status).toBe(200);
    });

    it("does not reveal assignee validity to a viewer of a public task", async () => {
        const fixture = await createFixture();
        const taskId = await createTask(fixture);
        await PermissionEntity.update(
            { isPublic: true },
            { where: { id: [taskId, fixture.stackId, fixture.projectId] } }
        );
        const owner = await UserEntity.findByPk(fixture.userId);
        expect(owner).not.toBeNull();
        const viewer = await UserEntity.create({
            email: `task-viewer-${randomUUID()}@example.test`,
            password: await bcrypt.hash(randomUUID(), 10),
            firstName: "Task Viewer",
            lastName: "Authorization",
            role: String(owner!.get("role")),
            tenant: fixture.tenant,
            admin: false,
            real: false,
        });
        const viewerId = String(viewer.get("id"));
        fixtureRows.push({ entity: UserEntity, id: viewerId });
        rateLimitedUserIds.push(viewerId);
        const session = await issueSession(viewerId, fixture.tenant, 120);
        fixtureRows.push({ entity: SessionEntity, id: session.sid });
        const viewerHeaders = {
            Authorization: `Bearer ${session.token}`,
            "Content-Type": "application/json",
        };

        const validAssigneeResponse = await app.request(`/api/tasks/${taskId}`, {
            method: "PATCH",
            headers: viewerHeaders,
            body: JSON.stringify({ assignees: [fixture.userId] }),
        });
        const unknownAssigneeResponse = await app.request(`/api/tasks/${taskId}`, {
            method: "PATCH",
            headers: viewerHeaders,
            body: JSON.stringify({ assignees: [randomUUID()] }),
        });

        expect(validAssigneeResponse.status).toBe(403);
        expect(unknownAssigneeResponse.status).toBe(403);
        const task = await TaskEntity.findOne({ where: { id: taskId, tenant: fixture.tenant } });
        expect(task?.get("assignees")).toEqual([]);
    });

    it("does not partially delete a stack's tasks when a viewer owns only some of them", async () => {
        const credentials = JSON.parse(readFileSync("testUser.json", "utf8")) as { email: string };
        const baseUser = await UserEntity.findOne({ where: { email: credentials.email } });
        expect(baseUser).not.toBeNull();
        const tenant = String(baseUser!.get("tenant"));
        const role = await RoleEntity.findOne({ where: { title: "User", tenant } });
        expect(role).not.toBeNull();

        const createUser = async (label: string) => {
            const user = await UserEntity.create({
                email: `stack-bulk-${label}-${randomUUID()}@example.test`,
                password: await bcrypt.hash(randomUUID(), 10),
                firstName: `Stack bulk ${label}`,
                lastName: "Authorization",
                role: String(role!.get("id")),
                tenant,
                admin: label === "admin",
                real: false,
            });
            const userId = String(user.get("id"));
            fixtureRows.push({ entity: UserEntity, id: userId });
            rateLimitedUserIds.push(userId);
            const session = await issueSession(userId, tenant, 120);
            fixtureRows.push({ entity: SessionEntity, id: session.sid });
            return { id: userId, token: session.token };
        };

        const stackOwner = await createUser("owner");
        const viewer = await createUser("viewer");
        const sameTenantAdmin = await createUser("admin");
        const projectId = randomUUID();
        const stackId = randomUUID();
        const ownedTaskId = randomUUID();
        const otherTaskId = randomUUID();

        await DocumentEntity.create({
            id: projectId,
            title: "Bulk delete authorization project",
            type: RECORDTYPE.PROJECT,
            order: 0,
            tenant,
            createdBy: stackOwner.id,
            updatedBy: stackOwner.id,
        });
        fixtureRows.push({ entity: DocumentEntity, id: projectId });
        await ProjectEntity.create({
            id: projectId,
            projectOwner: stackOwner.id,
            tenant,
            createdBy: stackOwner.id,
            updatedBy: stackOwner.id,
        });
        fixtureRows.push({ entity: ProjectEntity, id: projectId });
        await PermissionEntity.create({
            id: projectId,
            owner: stackOwner.id,
            isPublic: true,
            visibleUsers: [],
            visibleRoles: [],
            tenant,
            createdBy: stackOwner.id,
            updatedBy: stackOwner.id,
        });
        fixtureRows.push({ entity: PermissionEntity, id: projectId });
        await StackEntity.create({
            id: stackId,
            title: "Bulk delete authorization stack",
            project: projectId,
            tenant,
            createdBy: stackOwner.id,
            updatedBy: stackOwner.id,
        });
        fixtureRows.push({ entity: StackEntity, id: stackId });
        await PermissionEntity.create({
            id: stackId,
            owner: stackOwner.id,
            isPublic: true,
            visibleUsers: [],
            visibleRoles: [],
            tenant,
            createdBy: stackOwner.id,
            updatedBy: stackOwner.id,
        });
        fixtureRows.push({ entity: PermissionEntity, id: stackId });

        for (const [id, owner] of [
            [ownedTaskId, viewer.id],
            [otherTaskId, stackOwner.id],
        ] as const) {
            await TaskEntity.create({
                id,
                title: `Bulk delete task ${id}`,
                project: projectId,
                stack: stackId,
                tenant,
                createdBy: owner,
                updatedBy: owner,
            });
            fixtureRows.push({ entity: TaskEntity, id });
            await PermissionEntity.create({
                id,
                owner,
                isPublic: true,
                visibleUsers: [],
                visibleRoles: [],
                tenant,
                createdBy: owner,
                updatedBy: owner,
            });
            fixtureRows.push({ entity: PermissionEntity, id });
        }

        const viewerResponse = await app.request(`/api/stacks/${stackId}?tasks=true`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${viewer.token}` },
        });
        expect(viewerResponse.status).toBe(403);
        expect(
            await TaskEntity.count({ where: { id: { [Op.in]: [ownedTaskId, otherTaskId] }, deleted: null } })
        ).toBe(2);

        const stackOwnerResponse = await app.request(`/api/stacks/${stackId}?tasks=true`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${stackOwner.token}` },
        });
        expect(stackOwnerResponse.status).toBe(403);
        expect(
            await TaskEntity.count({ where: { id: { [Op.in]: [ownedTaskId, otherTaskId] }, deleted: null } })
        ).toBe(2);

        const adminTaskId = randomUUID();
        await TaskEntity.create({
            id: adminTaskId,
            title: `Admin bulk delete task ${adminTaskId}`,
            project: projectId,
            stack: stackId,
            tenant,
            createdBy: stackOwner.id,
            updatedBy: stackOwner.id,
        });
        fixtureRows.push({ entity: TaskEntity, id: adminTaskId });
        await PermissionEntity.create({
            id: adminTaskId,
            owner: stackOwner.id,
            isPublic: true,
            visibleUsers: [],
            visibleRoles: [],
            tenant,
            createdBy: stackOwner.id,
            updatedBy: stackOwner.id,
        });
        fixtureRows.push({ entity: PermissionEntity, id: adminTaskId });

        const adminResponse = await app.request(`/api/stacks/${stackId}?tasks=true`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${sameTenantAdmin.token}` },
        });
        expect(adminResponse.status).toBe(200);
        expect(
            await TaskEntity.count({
                where: { id: { [Op.in]: [ownedTaskId, otherTaskId, adminTaskId] }, deleted: null },
            })
        ).toBe(0);
        expect((await TaskEntity.findByPk(adminTaskId))?.get("deleted")).not.toBeNull();

        const ownerOnlyTaskId = randomUUID();
        await TaskEntity.create({
            id: ownerOnlyTaskId,
            title: `Non-admin owner bulk delete task ${ownerOnlyTaskId}`,
            project: projectId,
            stack: stackId,
            tenant,
            createdBy: stackOwner.id,
            updatedBy: stackOwner.id,
        });
        fixtureRows.push({ entity: TaskEntity, id: ownerOnlyTaskId });
        await PermissionEntity.create({
            id: ownerOnlyTaskId,
            owner: stackOwner.id,
            isPublic: true,
            visibleUsers: [],
            visibleRoles: [],
            tenant,
            createdBy: stackOwner.id,
            updatedBy: stackOwner.id,
        });
        fixtureRows.push({ entity: PermissionEntity, id: ownerOnlyTaskId });

        const ownerOnlyResponse = await app.request(`/api/stacks/${stackId}?tasks=true`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${stackOwner.token}` },
        });
        expect(ownerOnlyResponse.status).toBe(200);
        expect((await TaskEntity.findByPk(ownerOnlyTaskId))?.get("deleted")).not.toBeNull();
    });

    it("soft-deletes task time logs as part of an authorized task deletion", async () => {
        const fixture = await createFixture();
        const taskId = await createTask(fixture);
        const timelog = await TimelogEntity.create({
            description: `Task cascade timelog ${randomUUID()}`,
            date: new Date(),
            duration: 3600,
            person: fixture.userId,
            project: fixture.projectId,
            task: taskId,
            tenant: fixture.tenant,
            createdBy: fixture.userId,
            updatedBy: fixture.userId,
        });
        const timelogId = String(timelog.id);
        fixtureRows.push({ entity: TimelogEntity, id: timelogId });

        const response = await app.request(`/api/tasks/${taskId}`, {
            method: "DELETE",
            headers: fixture.headers,
        });

        expect(response.status).toBe(200);
        expect((await TaskEntity.findByPk(taskId))?.get("deleted")).not.toBeNull();
        expect((await TimelogEntity.findByPk(timelogId))?.get("deleted")).not.toBeNull();
    });
});
