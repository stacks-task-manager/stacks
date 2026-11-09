// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { afterEach, describe, expect, it, vi } from "vitest";
import {
    ActivityEntity,
    CalendarEntity,
    CompanyEntity,
    DocumentEntity,
    EventEntity,
    PermissionEntity,
    ProjectEntity,
    RateLimitCounterEntity,
    RoleEntity,
    SessionEntity,
    StackEntity,
    TagEntity,
    TaskEntity,
    TenantEntity,
    UserEntity,
} from "@stacks/db";
import { ACTIVITYRESOURCETYPE, ACTIVITYTYPE, POLLINGTYPE, RECORDTYPE, ROLE_SECTIONS } from "@stacks/types";
import { Op } from "sequelize";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import app from "../../src/index";
import { createMcpToolClient } from "../../src/ai/mcpToolClient";
import { MCP_AI_TOOL_NAMES } from "../../src/ai/toolRegistry";
import googleOAuthService from "../../src/services/googleOAuthService";
import { taskAiTools } from "../../src/ai/toolRegistry/taskTools";
import { peopleAiTools } from "../../src/ai/toolRegistry/peopleTools";
import { orgAiTools } from "../../src/ai/toolRegistry/orgTools";
import { activityAiTools } from "../../src/ai/toolRegistry/activityTools";
import { requestContext } from "../../src/services/requestContext";
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

describe("MCP tool authorization", () => {
    it("uses the caller's live session when chat connects through its MCP backend", async () => {
        const credentials = JSON.parse(readFileSync("testUser.json", "utf8")) as { email: string };
        const caller = await UserEntity.findOne({ where: { email: credentials.email } });
        expect(caller).not.toBeNull();
        const role = await RoleEntity.findOne({
            where: { id: caller!.get("role"), tenant: caller!.get("tenant") },
        });
        expect(role).not.toBeNull();

        await getAuthToken();
        const session = await issueSession(String(caller!.id), String(caller!.get("tenant")), 120);
        fixtureRows.push({ entity: SessionEntity, id: session.sid });

        const previousFetch = globalThis.fetch;
        const previousMcpUrl = process.env.AI_MCP_URL;
        process.env.AI_MCP_URL = "http://internal.test/api/mcp";
        globalThis.fetch = (async (input, init) => app.fetch(new Request(input, init))) as typeof fetch;
        const callerContext = {
            user: caller!.toJSON() as any,
            role: role!.toJSON() as any,
            instanceId: "mcp-integration-test",
            requestId: randomUUID(),
            timestamp: Date.now(),
            sid: session.sid,
        } as any;
        const runAsCaller = <T>(fn: () => T) => requestContext.run(callerContext, fn);

        try {
            const result = await runAsCaller(async () => {
                const client = await createMcpToolClient();
                try {
                    await expect(client.callTool("getTask", { taskId: randomUUID() })).rejects.toThrow(
                        "The requested task was not found"
                    );
                    return true;
                } finally {
                    await client.close();
                }
            });

            expect(result).toBe(true);

            await SessionEntity.update({ revokedAt: new Date() }, { where: { id: session.sid } });
            await expect(
                runAsCaller(async () => {
                    const client = await createMcpToolClient();
                    try {
                        return await client.callTool("getTask", { taskId: randomUUID() });
                    } finally {
                        await client.close();
                    }
                })
            ).rejects.toThrow("Your session has ended");
        } finally {
            globalThis.fetch = previousFetch;
            if (previousMcpUrl === undefined) delete process.env.AI_MCP_URL;
            else process.env.AI_MCP_URL = previousMcpUrl;
        }
    });

    it("does not expose foreign task, stack or activity data through registered MCP and chat tools", async () => {
        const credentials = JSON.parse(readFileSync("testUser.json", "utf8")) as { email: string };
        const caller = await UserEntity.findOne({ where: { email: credentials.email } });
        expect(caller).not.toBeNull();
        const callerTenant = String(caller!.get("tenant"));
        const foreignTenant = randomUUID();
        const foreignOwner = randomUUID();
        const projectId = randomUUID();
        const taskId = randomUUID();
        const stackId = randomUUID();

        await DocumentEntity.create({
            id: projectId,
            title: "foreign MCP project fixture",
            type: RECORDTYPE.PROJECT,
            order: 0,
            tenant: foreignTenant,
            createdBy: foreignOwner,
            updatedBy: foreignOwner,
        });
        fixtureRows.push({ entity: DocumentEntity, id: projectId });
        await ProjectEntity.create({
            id: projectId,
            projectOwner: foreignOwner,
            tenant: foreignTenant,
            createdBy: foreignOwner,
            updatedBy: foreignOwner,
        });
        fixtureRows.push({ entity: ProjectEntity, id: projectId });
        await PermissionEntity.create({
            id: projectId,
            owner: foreignOwner,
            isPublic: true,
            visibleUsers: [],
            visibleRoles: [],
            tenant: foreignTenant,
            createdBy: foreignOwner,
            updatedBy: foreignOwner,
        });
        fixtureRows.push({ entity: PermissionEntity, id: projectId });
        await StackEntity.create({
            id: stackId,
            title: "foreign MCP stack fixture",
            project: projectId,
            tenant: foreignTenant,
            createdBy: foreignOwner,
            updatedBy: foreignOwner,
        });
        fixtureRows.push({ entity: StackEntity, id: stackId });
        await TaskEntity.create({
            id: taskId,
            title: "foreign MCP task secret",
            project: projectId,
            stack: stackId,
            tenant: foreignTenant,
            createdBy: foreignOwner,
            updatedBy: foreignOwner,
        });
        fixtureRows.push({ entity: TaskEntity, id: taskId });
        await PermissionEntity.create({
            id: taskId,
            owner: foreignOwner,
            isPublic: true,
            visibleUsers: [],
            visibleRoles: [],
            tenant: foreignTenant,
            createdBy: foreignOwner,
            updatedBy: foreignOwner,
        });
        fixtureRows.push({ entity: PermissionEntity, id: taskId });
        const foreignActivity = await ActivityEntity.create({
            resourceId: taskId,
            resourceType: ACTIVITYRESOURCETYPE.TASK,
            type: ACTIVITYTYPE.MESSAGE,
            person: foreignOwner,
            content: "foreign MCP activity secret",
            tenant: foreignTenant,
            createdBy: foreignOwner,
            updatedBy: foreignOwner,
        });
        fixtureRows.push({ entity: ActivityEntity, id: String(foreignActivity.get("id")) });

        const token = await getAuthToken();
        const unauthenticatedResponse = await app.request("/api/mcp", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json, text/event-stream",
            },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: randomUUID(),
                method: "tools/call",
                params: { name: "getTask", arguments: { taskId } },
            }),
        });
        expect(unauthenticatedResponse.status).toBe(401);

        const callTool = async (name: string, args: Record<string, unknown> = { taskId }) => {
            const response = await app.request("/api/mcp", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                    Accept: "application/json, text/event-stream",
                },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    id: randomUUID(),
                    method: "tools/call",
                    params: { name, arguments: args },
                }),
            });
            expect(response.status).toBe(200);
            return response.json();
        };

        expect(callerTenant).not.toBe(foreignTenant);
        const [readResult, deleteResult] = await Promise.all([callTool("getTask"), callTool("deleteTask")]);
        expect(readResult.result.isError).toBe(true);
        expect(JSON.stringify(readResult)).not.toContain("foreign MCP task secret");
        expect(deleteResult.result.isError).toBe(true);
        expect(
            await TaskEntity.findOne({ where: { id: taskId, tenant: foreignTenant, deleted: null } })
        ).not.toBeNull();

        const callerRole = await RoleEntity.findOne({
            where: { id: caller!.get("role"), tenant: callerTenant },
        });
        expect(callerRole).not.toBeNull();
        const chatContext = {
            user: caller!.toJSON() as any,
            role: callerRole!.toJSON() as any,
            instanceId: "mcp-authorization-test",
            requestId: randomUUID(),
            timestamp: Date.now(),
        } as any;
        const listTasksTool = taskAiTools.find(tool => tool.name === "listTasks");
        expect(listTasksTool).toBeDefined();
        const listTasksInput = listTasksTool!.inputSchema.parse({ taskIds: [taskId] });
        const listedTasks = await requestContext.run(chatContext, () =>
            listTasksTool!.execute(listTasksInput as never)
        );
        expect(listedTasks).toEqual([]);
        const listActivitiesTool = activityAiTools.find(tool => tool.name === "listActivities")!;
        const listedActivities = await requestContext.run(chatContext, () =>
            listActivitiesTool.execute({ resourceIds: [taskId] })
        );
        expect(listedActivities).toEqual([]);

        const stackListResult = await callTool("listStacks", { projectId });
        const stackUpdateResult = await callTool("updateStack", {
            stackId,
            title: "forged foreign MCP stack",
        });
        const stackDeleteResult = await callTool("deleteStack", { stackId });
        const stackCreateResult = await callTool("createStack", {
            projectId,
            title: "forged foreign MCP stack",
        });
        expect(stackListResult.result.isError).toBe(true);
        expect(JSON.stringify(stackListResult)).not.toContain("foreign MCP stack fixture");
        expect(stackUpdateResult.result.isError).toBe(true);
        expect(stackDeleteResult.result.isError).toBe(true);
        expect(stackCreateResult.result.isError).toBe(true);
        const foreignStack = await StackEntity.findOne({
            where: { id: stackId, tenant: foreignTenant, deleted: null },
        });
        expect(foreignStack?.get("title")).toBe("foreign MCP stack fixture");
        expect(
            await StackEntity.count({ where: { project: projectId, tenant: foreignTenant, deleted: null } })
        ).toBe(1);

        const createResult = await callTool("createTask", {
            projectId,
            title: "forged foreign MCP task",
        });
        expect(createResult.result.isError).toBe(true);
        expect(
            await TaskEntity.count({ where: { title: "forged foreign MCP task", tenant: foreignTenant } })
        ).toBe(0);
    });

    it("checks same-tenant viewer and owner boundaries across MCP and REST task operations", async () => {
        const credentials = JSON.parse(readFileSync("testUser.json", "utf8")) as { email: string };
        const baseUser = await UserEntity.findOne({ where: { email: credentials.email } });
        expect(baseUser).not.toBeNull();
        const tenant = String(baseUser!.get("tenant"));
        const role = await RoleEntity.findOne({ where: { title: "User", tenant } });
        expect(role).not.toBeNull();

        const createUser = async (label: string, assignedRole = String(role!.get("id"))) => {
            const user = await UserEntity.create({
                email: `mcp-${label}-${randomUUID()}@example.test`,
                password: "test-password",
                firstName: `MCP ${label}`,
                lastName: "Authorization",
                role: assignedRole,
                tenant,
                admin: false,
                real: false,
            });
            const userId = String(user.get("id"));
            fixtureRows.push({ entity: UserEntity, id: userId });
            rateLimitedUserIds.push(userId);
            const session = await issueSession(userId, tenant, 120);
            fixtureRows.push({ entity: SessionEntity, id: session.sid });
            return { id: userId, token: session.token };
        };

        const owner = await createUser("owner");
        const viewer = await createUser("viewer");
        const projectWriterRole = await RoleEntity.create({
            title: `MCP Project Settings Writer ${randomUUID()}`,
            description: "temporary project settings writer fixture",
            access: { [ROLE_SECTIONS.PROJECT_SETTINGS]: { write: true } },
            disabled: false,
            tenant,
            createdBy: String(baseUser!.id),
            updatedBy: String(baseUser!.id),
        });
        const projectWriterRoleId = String(projectWriterRole.get("id"));
        fixtureRows.push({ entity: RoleEntity, id: projectWriterRoleId });
        const projectWriter = await createUser("project-writer", projectWriterRoleId);
        const projectId = randomUUID();
        const stackId = randomUUID();
        const taskId = randomUUID();

        await DocumentEntity.create({
            id: projectId,
            title: "Same-tenant MCP viewer project",
            type: RECORDTYPE.PROJECT,
            order: 0,
            tenant,
            createdBy: owner.id,
            updatedBy: owner.id,
        });
        fixtureRows.push({ entity: DocumentEntity, id: projectId });
        await ProjectEntity.create({
            id: projectId,
            projectOwner: owner.id,
            tenant,
            createdBy: owner.id,
            updatedBy: owner.id,
        });
        fixtureRows.push({ entity: ProjectEntity, id: projectId });
        await PermissionEntity.create({
            id: projectId,
            owner: owner.id,
            isPublic: true,
            visibleUsers: [],
            visibleRoles: [],
            tenant,
            createdBy: owner.id,
            updatedBy: owner.id,
        });
        fixtureRows.push({ entity: PermissionEntity, id: projectId });
        await StackEntity.create({
            id: stackId,
            title: "Same-tenant MCP viewer stack",
            project: projectId,
            tenant,
            createdBy: owner.id,
            updatedBy: owner.id,
        });
        fixtureRows.push({ entity: StackEntity, id: stackId });
        await PermissionEntity.create({
            id: stackId,
            owner: owner.id,
            isPublic: true,
            visibleUsers: [],
            visibleRoles: [],
            tenant,
            createdBy: owner.id,
            updatedBy: owner.id,
        });
        fixtureRows.push({ entity: PermissionEntity, id: stackId });
        await TaskEntity.create({
            id: taskId,
            title: "Same-tenant MCP viewer task",
            project: projectId,
            stack: stackId,
            tenant,
            createdBy: owner.id,
            updatedBy: owner.id,
        });
        fixtureRows.push({ entity: TaskEntity, id: taskId });
        await PermissionEntity.create({
            id: taskId,
            owner: owner.id,
            isPublic: true,
            visibleUsers: [],
            visibleRoles: [],
            tenant,
            createdBy: owner.id,
            updatedBy: owner.id,
        });
        fixtureRows.push({ entity: PermissionEntity, id: taskId });

        const ownerPrivateTaskId = randomUUID();
        const viewerPrivateTaskId = randomUUID();
        const ownerPrivateTitle = `Owner private MCP ${randomUUID()}`;
        const viewerPrivateTitle = `Viewer private MCP ${randomUUID()}`;
        for (const [id, taskOwner, title] of [
            [ownerPrivateTaskId, owner.id, ownerPrivateTitle],
            [viewerPrivateTaskId, viewer.id, viewerPrivateTitle],
        ] as const) {
            await TaskEntity.create({
                id,
                title,
                project: projectId,
                stack: stackId,
                tenant,
                createdBy: taskOwner,
                updatedBy: taskOwner,
            });
            fixtureRows.push({ entity: TaskEntity, id });
            await PermissionEntity.create({
                id,
                owner: taskOwner,
                isPublic: false,
                visibleUsers: [],
                visibleRoles: [],
                type: POLLINGTYPE.TASK,
                tenant,
                createdBy: taskOwner,
                updatedBy: taskOwner,
            });
            fixtureRows.push({ entity: PermissionEntity, id });
        }

        const callTool = async (token: string, name: string, args: Record<string, unknown> = { taskId }) => {
            const response = await app.request("/api/mcp", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                    Accept: "application/json, text/event-stream",
                },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    id: randomUUID(),
                    method: "tools/call",
                    params: { name, arguments: args },
                }),
            });
            expect(response.status).toBe(200);
            return response.json();
        };

        const readResult = await callTool(viewer.token, "getTask");
        expect(readResult.result.isError).not.toBe(true);
        expect(JSON.stringify(readResult)).toContain("Same-tenant MCP viewer task");

        const forgedStackTitle = `Viewer forged MCP stack update ${randomUUID()}`;
        const viewerUpdate = await callTool(viewer.token, "updateStack", {
            stackId,
            title: forgedStackTitle,
        });
        expect(viewerUpdate.result.isError).toBe(true);
        expect((await StackEntity.findByPk(stackId))?.get("title")).toBe("Same-tenant MCP viewer stack");

        const viewerDeleteStack = await callTool(viewer.token, "deleteStack", { stackId });
        expect(viewerDeleteStack.result.isError).toBe(true);
        expect(await StackEntity.findByPk(stackId)).not.toBeNull();
        expect(await TaskEntity.findOne({ where: { id: taskId, deleted: null } })).not.toBeNull();

        const viewerStackTitle = `Viewer forbidden MCP stack ${randomUUID()}`;
        const viewerCreateStack = await callTool(viewer.token, "createStack", {
            projectId,
            title: viewerStackTitle,
        });
        if (!viewerCreateStack.result.isError) {
            const createdStack = JSON.parse(viewerCreateStack.result.content[0].text) as { id: string };
            fixtureRows.push({ entity: StackEntity, id: createdStack.id });
            fixtureRows.push({ entity: PermissionEntity, id: createdStack.id });
        }
        expect(viewerCreateStack.result.isError).toBe(true);
        expect(await StackEntity.count({ where: { title: viewerStackTitle, project: projectId } })).toBe(0);

        const viewerRestStackTitle = `Viewer forbidden REST stack ${randomUUID()}`;
        const viewerRestCreateStack = await app.request("/api/stacks", {
            method: "POST",
            headers: { Authorization: `Bearer ${viewer.token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ project: projectId, title: viewerRestStackTitle }),
        });
        expect(viewerRestCreateStack.status).toBe(403);
        expect(await StackEntity.count({ where: { title: viewerRestStackTitle, project: projectId } })).toBe(
            0
        );

        const ownerStackCreateTitle = `Owner MCP stack ${randomUUID()}`;
        const ownerStackCreate = await callTool(owner.token, "createStack", {
            projectId,
            title: ownerStackCreateTitle,
        });
        expect(ownerStackCreate.result.isError).not.toBe(true);
        const ownerCreatedStack = JSON.parse(ownerStackCreate.result.content[0].text) as { id: string };
        fixtureRows.push({ entity: StackEntity, id: ownerCreatedStack.id });
        fixtureRows.push({ entity: PermissionEntity, id: ownerCreatedStack.id });
        expect(await StackEntity.count({ where: { id: ownerCreatedStack.id, project: projectId } })).toBe(1);

        const tenantAdminEntity = await UserEntity.create({
            email: `mcp-stack-admin-${randomUUID()}@example.test`,
            password: "test-password",
            firstName: "MCP Stack",
            lastName: "Admin",
            role: String(role!.get("id")),
            tenant,
            admin: true,
            real: false,
        });
        const tenantAdminId = String(tenantAdminEntity.get("id"));
        fixtureRows.push({ entity: UserEntity, id: tenantAdminId });
        rateLimitedUserIds.push(tenantAdminId);
        const tenantAdminSession = await issueSession(tenantAdminId, tenant, 120);
        fixtureRows.push({ entity: SessionEntity, id: tenantAdminSession.sid });
        const tenantAdminDelete = await callTool(tenantAdminSession.token, "deleteStack", {
            stackId: ownerCreatedStack.id,
        });
        expect(tenantAdminDelete.result.isError).not.toBe(true);
        expect(
            (await StackEntity.findOne({ where: { id: ownerCreatedStack.id, tenant } }))?.get("deleted")
        ).not.toBeNull();

        const roleWriterStackTitle = `Project settings MCP stack ${randomUUID()}`;
        const roleWriterCreate = await callTool(projectWriter.token, "createStack", {
            projectId,
            title: roleWriterStackTitle,
        });
        expect(roleWriterCreate.result.isError).not.toBe(true);
        const roleWriterStack = JSON.parse(roleWriterCreate.result.content[0].text) as { id: string };
        fixtureRows.push({ entity: StackEntity, id: roleWriterStack.id });
        fixtureRows.push({ entity: PermissionEntity, id: roleWriterStack.id });
        expect(await StackEntity.count({ where: { id: roleWriterStack.id, project: projectId } })).toBe(1);
        const roleWriterUpdate = await callTool(projectWriter.token, "updateStack", {
            stackId: roleWriterStack.id,
            title: `Project settings MCP stack update ${randomUUID()}`,
        });
        expect(roleWriterUpdate.result.isError).not.toBe(true);
        const roleWriterDelete = await callTool(projectWriter.token, "deleteStack", {
            stackId: roleWriterStack.id,
        });
        expect(roleWriterDelete.result.isError).not.toBe(true);
        expect(
            (await StackEntity.findOne({ where: { id: roleWriterStack.id, tenant } }))?.get("deleted")
        ).not.toBeNull();

        const ownerStackTitle = `Owner MCP stack update ${randomUUID()}`;
        const ownerUpdate = await callTool(owner.token, "updateStack", { stackId, title: ownerStackTitle });
        expect(ownerUpdate.result.isError).not.toBe(true);
        expect((await StackEntity.findByPk(stackId))?.get("title")).toBe(ownerStackTitle);

        const [ownerPrivateRead, viewerPrivateRead, ownerForeignRead, viewerForeignRead] = await Promise.all([
            callTool(owner.token, "getTask", { taskId: ownerPrivateTaskId }),
            callTool(viewer.token, "getTask", { taskId: viewerPrivateTaskId }),
            callTool(owner.token, "getTask", { taskId: viewerPrivateTaskId }),
            callTool(viewer.token, "getTask", { taskId: ownerPrivateTaskId }),
        ]);
        expect(ownerPrivateRead.result.isError).not.toBe(true);
        expect(JSON.stringify(ownerPrivateRead)).toContain(ownerPrivateTitle);
        expect(JSON.stringify(ownerPrivateRead)).not.toContain(viewerPrivateTitle);
        expect(viewerPrivateRead.result.isError).not.toBe(true);
        expect(JSON.stringify(viewerPrivateRead)).toContain(viewerPrivateTitle);
        expect(JSON.stringify(viewerPrivateRead)).not.toContain(ownerPrivateTitle);
        expect(ownerForeignRead.result.isError).toBe(true);
        expect(JSON.stringify(ownerForeignRead)).not.toContain(viewerPrivateTitle);
        expect(viewerForeignRead.result.isError).toBe(true);
        expect(JSON.stringify(viewerForeignRead)).not.toContain(ownerPrivateTitle);

        const ownerPrivateActivity = await ActivityEntity.create({
            resourceId: ownerPrivateTaskId,
            resourceType: "task",
            type: "message",
            person: owner.id,
            content: `Owner private activity ${randomUUID()}`,
            tenant,
            createdBy: owner.id,
            updatedBy: owner.id,
        });
        fixtureRows.push({ entity: ActivityEntity, id: String(ownerPrivateActivity.get("id")) });
        const viewerPrivateActivity = await ActivityEntity.create({
            resourceId: viewerPrivateTaskId,
            resourceType: "task",
            type: "message",
            person: viewer.id,
            content: `Viewer private activity ${randomUUID()}`,
            tenant,
            createdBy: viewer.id,
            updatedBy: viewer.id,
        });
        fixtureRows.push({ entity: ActivityEntity, id: String(viewerPrivateActivity.get("id")) });

        const [ownerOwnActivities, ownerOtherActivities, viewerOwnActivities, viewerOtherActivities] =
            await Promise.all([
                app.request(`/api/activities/${ownerPrivateTaskId}`, {
                    headers: { Authorization: `Bearer ${owner.token}` },
                }),
                app.request(`/api/activities/${viewerPrivateTaskId}`, {
                    headers: { Authorization: `Bearer ${owner.token}` },
                }),
                app.request(`/api/activities/${viewerPrivateTaskId}`, {
                    headers: { Authorization: `Bearer ${viewer.token}` },
                }),
                app.request(`/api/activities/${ownerPrivateTaskId}`, {
                    headers: { Authorization: `Bearer ${viewer.token}` },
                }),
            ]);
        const activityBodies = await Promise.all(
            [ownerOwnActivities, ownerOtherActivities, viewerOwnActivities, viewerOtherActivities].map(
                response => response.json()
            )
        );
        expect(activityBodies[0].data).toHaveLength(1);
        expect(activityBodies[0].data[0].content).toBe(ownerPrivateActivity.get("content"));
        expect(activityBodies[1].data).toEqual([]);
        expect(activityBodies[2].data).toHaveLength(1);
        expect(activityBodies[2].data[0].content).toBe(viewerPrivateActivity.get("content"));
        expect(activityBodies[3].data).toEqual([]);

        const foreignTenantEntity = await TenantEntity.create({
            title: `Foreign activity tenant ${randomUUID()}`,
            description: "temporary security fixture",
            disabled: false,
            expiry: new Date(Date.now() + 60 * 60 * 1000),
        });
        const foreignTenant = String(foreignTenantEntity.get("id"));
        fixtureRows.push({ entity: TenantEntity, id: foreignTenant });
        const foreignRole = await RoleEntity.create({
            title: `Foreign activity admin role ${randomUUID()}`,
            description: "temporary security fixture",
            access: {},
            disabled: false,
            tenant: foreignTenant,
            createdBy: owner.id,
            updatedBy: owner.id,
        });
        fixtureRows.push({ entity: RoleEntity, id: String(foreignRole.get("id")) });
        const foreignAdmin = await UserEntity.create({
            email: `foreign-activity-admin-${randomUUID()}@example.test`,
            password: "test-password",
            firstName: "Foreign Activity",
            lastName: "Admin",
            role: String(foreignRole.get("id")),
            tenant: foreignTenant,
            admin: true,
            real: false,
        });
        const foreignAdminId = String(foreignAdmin.get("id"));
        fixtureRows.push({ entity: UserEntity, id: foreignAdminId });
        rateLimitedUserIds.push(foreignAdminId);
        const foreignAdminSession = await issueSession(foreignAdminId, foreignTenant, 120);
        fixtureRows.push({ entity: SessionEntity, id: foreignAdminSession.sid });

        const foreignAdminActivities = await app.request(`/api/activities/${ownerPrivateTaskId}`, {
            headers: { Authorization: `Bearer ${foreignAdminSession.token}` },
        });
        expect(foreignAdminActivities.status).toBe(200);
        const foreignAdminActivityBody = await foreignAdminActivities.json();
        expect(foreignAdminActivityBody.data).toEqual([]);
        expect(JSON.stringify(foreignAdminActivityBody)).not.toContain(ownerPrivateActivity.get("content"));

        const listTasksTool = taskAiTools.find(tool => tool.name === "listTasks");
        expect(listTasksTool).toBeDefined();
        const listTasksAs = async (principal: { id: string }, taskId: string) => {
            const user = await UserEntity.findByPk(principal.id);
            expect(user).not.toBeNull();
            const context = {
                user: user!.toJSON() as any,
                role: role!.toJSON() as any,
                instanceId: "mcp-authorization-test",
                requestId: randomUUID(),
                timestamp: Date.now(),
            } as any;
            const input = listTasksTool!.inputSchema.parse({ taskIds: [taskId] });
            return requestContext.run(context, () => listTasksTool!.execute(input as never));
        };
        const [ownerOwnList, ownerOtherList, viewerOwnList, viewerOtherList] = await Promise.all([
            listTasksAs(owner, ownerPrivateTaskId),
            listTasksAs(owner, viewerPrivateTaskId),
            listTasksAs(viewer, viewerPrivateTaskId),
            listTasksAs(viewer, ownerPrivateTaskId),
        ]);
        expect(ownerOwnList).toEqual([expect.objectContaining({ id: ownerPrivateTaskId })]);
        expect(ownerOtherList).toEqual([]);
        expect(viewerOwnList).toEqual([expect.objectContaining({ id: viewerPrivateTaskId })]);
        expect(viewerOtherList).toEqual([]);

        const unregisteredListTasksCall = await callTool(owner.token, "listTasks", {
            taskIds: [ownerPrivateTaskId],
        });
        expect(unregisteredListTasksCall.result.isError).toBe(true);
        expect(JSON.stringify(unregisteredListTasksCall)).not.toContain(ownerPrivateTitle);

        const stackBeforePrivateTaskOrder = await StackEntity.findByPk(stackId);
        const privateTaskOrderAttempt = await app.request(`/api/stacks/${stackId}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${owner.token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ tasksOrder: [taskId, viewerPrivateTaskId] }),
        });
        expect(privateTaskOrderAttempt.status).toBe(404);
        expect((await privateTaskOrderAttempt.text()).toLowerCase()).not.toContain(viewerPrivateTaskId);
        expect((await StackEntity.findByPk(stackId))?.get("tasksOrder")).toEqual(
            stackBeforePrivateTaskOrder?.get("tasksOrder")
        );

        const viewerBulkDelete = await app.request(`/api/stacks/${stackId}?tasks=true`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${viewer.token}` },
        });
        expect(viewerBulkDelete.status).toBe(403);
        for (const id of [taskId, ownerPrivateTaskId, viewerPrivateTaskId]) {
            expect(await TaskEntity.findOne({ where: { id, deleted: null } })).not.toBeNull();
        }

        const viewerTaskAclCount = await PermissionEntity.count({
            where: { tenant, createdBy: viewer.id, type: POLLINGTYPE.TASK },
        });
        const viewerCreatedTaskTitle = `Viewer MCP task ${randomUUID()}`;
        const viewerCreate = await callTool(viewer.token, "createTask", {
            projectId,
            stackId,
            title: viewerCreatedTaskTitle,
        });
        expect(viewerCreate.result.isError).toBe(true);
        expect(await TaskEntity.count({ where: { title: viewerCreatedTaskTitle, tenant } })).toBe(0);
        expect(
            await PermissionEntity.count({ where: { tenant, createdBy: viewer.id, type: POLLINGTYPE.TASK } })
        ).toBe(viewerTaskAclCount);

        const viewerRestTaskTitle = `Viewer REST task ${randomUUID()}`;
        const viewerRestCreate = await app.request("/api/tasks", {
            method: "POST",
            headers: { Authorization: `Bearer ${viewer.token}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                task: { title: viewerRestTaskTitle, project: projectId, stack: stackId },
            }),
        });
        expect(viewerRestCreate.status).toBe(403);
        expect(await TaskEntity.count({ where: { title: viewerRestTaskTitle, tenant } })).toBe(0);
        expect(
            await PermissionEntity.count({ where: { tenant, createdBy: viewer.id, type: POLLINGTYPE.TASK } })
        ).toBe(viewerTaskAclCount);

        const ownerCreatedTaskTitle = `Owner MCP task ${randomUUID()}`;
        const ownerCreate = await callTool(owner.token, "createTask", {
            projectId,
            stackId,
            title: ownerCreatedTaskTitle,
        });
        expect(ownerCreate.result.isError).not.toBe(true);
        const ownerCreatedTask = JSON.parse(ownerCreate.result.content[0].text) as { id: string };
        fixtureRows.push({ entity: TaskEntity, id: ownerCreatedTask.id });
        fixtureRows.push({ entity: PermissionEntity, id: ownerCreatedTask.id });
        expect(await TaskEntity.count({ where: { id: ownerCreatedTask.id, tenant, deleted: null } })).toBe(1);

        const ownerRestTaskTitle = `Owner REST task ${randomUUID()}`;
        const ownerRestCreate = await app.request("/api/tasks", {
            method: "POST",
            headers: { Authorization: `Bearer ${owner.token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ task: { title: ownerRestTaskTitle, project: projectId, stack: stackId } }),
        });
        expect(ownerRestCreate.status).toBe(200);
        const ownerRestTask = (await ownerRestCreate.json()).data as { id: string };
        fixtureRows.push({ entity: TaskEntity, id: ownerRestTask.id });
        fixtureRows.push({ entity: PermissionEntity, id: ownerRestTask.id });
        expect(await TaskEntity.count({ where: { id: ownerRestTask.id, tenant, deleted: null } })).toBe(1);

        const deniedDelete = await callTool(viewer.token, "deleteTask");
        expect(deniedDelete.result.isError).toBe(true);
        expect(await TaskEntity.findOne({ where: { id: taskId, deleted: null } })).not.toBeNull();

        const ownerDelete = await callTool(owner.token, "deleteTask");
        expect(ownerDelete.result.isError).not.toBe(true);
        expect((await TaskEntity.findByPk(taskId))?.get("deleted")).not.toBeNull();

        const ownerDeleteStackId = randomUUID();
        const ownerDeleteTaskId = randomUUID();
        await StackEntity.create({
            id: ownerDeleteStackId,
            title: `Owner deletable MCP stack ${randomUUID()}`,
            project: projectId,
            tenant,
            createdBy: owner.id,
            updatedBy: owner.id,
        });
        fixtureRows.push({ entity: StackEntity, id: ownerDeleteStackId });
        await PermissionEntity.create({
            id: ownerDeleteStackId,
            owner: owner.id,
            isPublic: true,
            visibleUsers: [],
            visibleRoles: [],
            tenant,
            createdBy: owner.id,
            updatedBy: owner.id,
        });
        fixtureRows.push({ entity: PermissionEntity, id: ownerDeleteStackId });
        await TaskEntity.create({
            id: ownerDeleteTaskId,
            title: `Owner deletable MCP task ${randomUUID()}`,
            project: projectId,
            stack: ownerDeleteStackId,
            tenant,
            createdBy: owner.id,
            updatedBy: owner.id,
        });
        fixtureRows.push({ entity: TaskEntity, id: ownerDeleteTaskId });
        await PermissionEntity.create({
            id: ownerDeleteTaskId,
            owner: owner.id,
            isPublic: true,
            visibleUsers: [],
            visibleRoles: [],
            type: POLLINGTYPE.TASK,
            tenant,
            createdBy: owner.id,
            updatedBy: owner.id,
        });
        fixtureRows.push({ entity: PermissionEntity, id: ownerDeleteTaskId });

        const ownerDeleteStack = await callTool(owner.token, "deleteStack", {
            stackId: ownerDeleteStackId,
        });
        expect(ownerDeleteStack.result.isError).not.toBe(true);
        expect(
            (await StackEntity.findOne({ where: { id: ownerDeleteStackId, tenant } }))?.get("deleted")
        ).not.toBeNull();
        expect(
            (await TaskEntity.findOne({ where: { id: ownerDeleteTaskId, tenant } }))?.get("deleted")
        ).not.toBeNull();
    });

    it("keeps registered calendar tools inside the admin caller's tenant", async () => {
        const credentials = JSON.parse(readFileSync("testUser.json", "utf8")) as { email: string };
        const baseUser = await UserEntity.findOne({ where: { email: credentials.email } });
        expect(baseUser).not.toBeNull();
        const tenant = String(baseUser!.get("tenant"));
        const admin = await UserEntity.create({
            email: `mcp-calendar-admin-${randomUUID()}@example.test`,
            password: "test-password",
            firstName: "MCP Calendar",
            lastName: "Admin",
            role: String(baseUser!.get("role")),
            tenant,
            admin: true,
            real: false,
        });
        const adminId = String(admin.get("id"));
        fixtureRows.push({ entity: UserEntity, id: adminId });
        const session = await issueSession(adminId, tenant, 120);
        fixtureRows.push({ entity: SessionEntity, id: session.sid });

        const foreignTenant = await TenantEntity.create({
            title: `MCP calendar tenant ${randomUUID()}`,
            description: "temporary security fixture",
            disabled: false,
            expiry: new Date(Date.now() + 60 * 60 * 1000),
        });
        const foreignTenantId = String(foreignTenant.get("id"));
        fixtureRows.push({ entity: TenantEntity, id: foreignTenantId });

        const foreignCalendarId = randomUUID();
        const foreignOwnerId = randomUUID();
        await CalendarEntity.create({
            id: foreignCalendarId,
            title: "Foreign calendar secret",
            source: "local",
            tenant: foreignTenantId,
            createdBy: foreignOwnerId,
            updatedBy: foreignOwnerId,
        });
        fixtureRows.push({ entity: CalendarEntity, id: foreignCalendarId });
        await PermissionEntity.create({
            id: foreignCalendarId,
            owner: foreignOwnerId,
            isPublic: true,
            visibleUsers: [],
            visibleRoles: [],
            type: "calendar",
            tenant: foreignTenantId,
            createdBy: foreignOwnerId,
            updatedBy: foreignOwnerId,
        });
        fixtureRows.push({ entity: PermissionEntity, id: foreignCalendarId });

        const eventStart = new Date(Date.now() - 60_000);
        const eventEnd = new Date(Date.now() + 60 * 60 * 1000);
        const foreignEventId = randomUUID();
        await EventEntity.create({
            id: foreignEventId,
            title: "Foreign event secret",
            description: "private event fixture",
            start: eventStart,
            end: eventEnd,
            allDay: false,
            source: "local",
            calendar: foreignCalendarId,
            tenant: foreignTenantId,
            createdBy: foreignOwnerId,
            updatedBy: foreignOwnerId,
        });
        fixtureRows.push({ entity: EventEntity, id: foreignEventId });
        await PermissionEntity.create({
            id: foreignEventId,
            owner: foreignOwnerId,
            isPublic: true,
            visibleUsers: [],
            visibleRoles: [],
            type: POLLINGTYPE.EVENT,
            tenant: foreignTenantId,
            createdBy: foreignOwnerId,
            updatedBy: foreignOwnerId,
        });
        fixtureRows.push({ entity: PermissionEntity, id: foreignEventId });

        const callToolAs = async (token: string, name: string, args: Record<string, unknown> = {}) => {
            const response = await app.request("/api/mcp", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                    Accept: "application/json, text/event-stream",
                },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    id: randomUUID(),
                    method: "tools/call",
                    params: { name, arguments: args },
                }),
            });
            expect(response.status).toBe(200);
            return response.json();
        };
        const callTool = (name: string, args: Record<string, unknown> = {}) =>
            callToolAs(session.token, name, args);
        const readToolOutput = (response: any) => JSON.parse(response.result.content[0].text);

        const createdResult = await callTool("createLocalCalendar", { title: "MCP admin calendar" });
        expect(createdResult.result.isError).not.toBe(true);
        const createdCalendar = readToolOutput(createdResult);
        const sameTenantCalendarId = String(createdCalendar.id);
        fixtureRows.push({ entity: CalendarEntity, id: sameTenantCalendarId });
        fixtureRows.push({ entity: PermissionEntity, id: sameTenantCalendarId });

        const listResult = await callTool("listCalendars", { source: "local" });
        const listedCalendars = readToolOutput(listResult).calendars as Array<{ id: string }>;
        expect(listedCalendars.map(calendar => calendar.id)).toContain(sameTenantCalendarId);
        expect(listedCalendars.map(calendar => calendar.id)).not.toContain(foreignCalendarId);

        const sameTenantUpdate = await callTool("updateLocalCalendar", {
            calendarId: sameTenantCalendarId,
            title: "Updated MCP admin calendar",
        });
        expect(readToolOutput(sameTenantUpdate).title).toBe("Updated MCP admin calendar");

        const eventInput = {
            title: "MCP same-tenant event",
            start: eventStart.toISOString(),
            end: eventEnd.toISOString(),
            source: "local",
            calendar: sameTenantCalendarId,
        };
        const sameTenantEventResult = await callTool("createCalendarEvent", eventInput);
        expect(sameTenantEventResult.result.isError).not.toBe(true);
        const sameTenantEvent = readToolOutput(sameTenantEventResult);
        fixtureRows.push({ entity: EventEntity, id: String(sameTenantEvent.id) });
        fixtureRows.push({ entity: PermissionEntity, id: String(sameTenantEvent.id) });

        const destinationCalendarResult = await callTool("createLocalCalendar", {
            title: "MCP viewer move destination",
        });
        expect(destinationCalendarResult.result.isError).not.toBe(true);
        const destinationCalendar = readToolOutput(destinationCalendarResult);
        const destinationCalendarId = String(destinationCalendar.id);
        fixtureRows.push({ entity: CalendarEntity, id: destinationCalendarId });
        fixtureRows.push({ entity: PermissionEntity, id: destinationCalendarId });

        const viewerRole = await RoleEntity.create({
            title: `MCP Calendar Reader ${randomUUID()}`,
            description: "temporary read-only calendar fixture",
            access: { [ROLE_SECTIONS.CALENDAR]: { read: true } },
            disabled: false,
            tenant,
            createdBy: String(baseUser!.id),
            updatedBy: String(baseUser!.id),
        });
        const viewerRoleId = String(viewerRole.get("id"));
        fixtureRows.push({ entity: RoleEntity, id: viewerRoleId });

        const viewer = await UserEntity.create({
            email: `mcp-calendar-viewer-${randomUUID()}@example.test`,
            password: "test-password",
            firstName: "MCP Calendar",
            lastName: "Viewer",
            role: viewerRoleId,
            tenant,
            admin: false,
            real: false,
        });
        const viewerId = String(viewer.get("id"));
        fixtureRows.push({ entity: UserEntity, id: viewerId });
        const viewerSession = await issueSession(viewerId, tenant, 120);
        fixtureRows.push({ entity: SessionEntity, id: viewerSession.sid });

        const viewerCalendarTitle = `MCP forbidden viewer calendar ${randomUUID()}`;
        const viewerCalendarCreate = await callToolAs(viewerSession.token, "createLocalCalendar", {
            title: viewerCalendarTitle,
        });
        expect(viewerCalendarCreate.result.isError).toBe(true);
        expect(await CalendarEntity.count({ where: { title: viewerCalendarTitle, tenant } })).toBe(0);

        const viewerCanReadPublicEvent = await callToolAs(viewerSession.token, "getCalendarEvent", {
            eventId: sameTenantEvent.id,
        });
        expect(viewerCanReadPublicEvent.result.isError).not.toBe(true);
        expect(readToolOutput(viewerCanReadPublicEvent).title).toBe("MCP same-tenant event");

        const viewerCalendarUpdate = await callToolAs(viewerSession.token, "updateLocalCalendar", {
            calendarId: sameTenantCalendarId,
            title: "MCP forbidden viewer calendar update",
        });
        const viewerCalendarDelete = await callToolAs(viewerSession.token, "deleteLocalCalendar", {
            calendarId: sameTenantCalendarId,
        });
        expect(viewerCalendarUpdate.result.isError).toBe(true);
        expect(viewerCalendarDelete.result.isError).toBe(true);
        const calendarAfterViewerMutations = await CalendarEntity.findByPk(sameTenantCalendarId);
        expect(calendarAfterViewerMutations?.get("title")).toBe("Updated MCP admin calendar");
        expect(calendarAfterViewerMutations?.get("deleted")).toBeNull();

        const viewerMove = await callToolAs(viewerSession.token, "moveCalendarEvent", {
            eventId: sameTenantEvent.id,
            source: "local",
            calendarId: destinationCalendarId,
        });
        expect(viewerMove.result.isError).toBe(true);
        const eventAfterViewerMove = await EventEntity.findOne({ where: { id: sameTenantEvent.id } });
        expect(eventAfterViewerMove?.get("calendar")).toBe(sameTenantCalendarId);

        const viewerCreateEvent = await callToolAs(viewerSession.token, "createCalendarEvent", {
            ...eventInput,
            title: "MCP forbidden viewer event",
        });
        expect(viewerCreateEvent.result.isError).toBe(true);
        expect(await EventEntity.count({ where: { title: "MCP forbidden viewer event", tenant } })).toBe(0);

        const viewerUpdateEvent = await callToolAs(viewerSession.token, "updateCalendarEvent", {
            eventId: sameTenantEvent.id,
            title: "MCP forbidden viewer update",
        });
        expect(viewerUpdateEvent.result.isError).toBe(true);
        const eventAfterViewerUpdate = await EventEntity.findByPk(sameTenantEvent.id);
        expect(eventAfterViewerUpdate?.get("title")).toBe("MCP same-tenant event");

        const viewerDeleteEvent = await callToolAs(viewerSession.token, "deleteCalendarEvent", {
            eventId: sameTenantEvent.id,
        });
        expect(viewerDeleteEvent.result.isError).toBe(true);
        const eventAfterViewerDelete = await EventEntity.findByPk(sameTenantEvent.id);
        expect(eventAfterViewerDelete?.get("deleted")).toBeNull();

        const adminMove = await callTool("moveCalendarEvent", {
            eventId: sameTenantEvent.id,
            source: "local",
            calendarId: destinationCalendarId,
        });
        expect(adminMove.result.isError).not.toBe(true);
        const eventAfterAdminMove = await EventEntity.findOne({ where: { id: sameTenantEvent.id } });
        expect(eventAfterAdminMove?.get("calendar")).toBe(destinationCalendarId);

        const localDate = `${eventStart.getFullYear()}-${String(eventStart.getMonth() + 1).padStart(
            2,
            "0"
        )}-${String(eventStart.getDate()).padStart(2, "0")}`;
        const listEventsResult = await callTool("listCalendarEvents", { span: "day", date: localDate });
        const listedEvents = readToolOutput(listEventsResult) as Array<{ id: string; title: string }>;
        expect(listedEvents.some(event => event.id === sameTenantEvent.id)).toBe(true);
        expect(listedEvents.some(event => event.id === foreignEventId)).toBe(false);

        const sameTenantEventRead = await callTool("getCalendarEvent", { eventId: sameTenantEvent.id });
        expect(readToolOutput(sameTenantEventRead).title).toBe("MCP same-tenant event");

        const foreignEventRead = await callTool("getCalendarEvent", { eventId: foreignEventId });
        const foreignEventUpdate = await callTool("updateCalendarEvent", {
            eventId: foreignEventId,
            title: "Forged foreign event update",
        });
        const foreignEventMove = await callTool("moveCalendarEvent", {
            eventId: foreignEventId,
            source: "local",
            calendarId: sameTenantCalendarId,
        });
        const foreignEventDelete = await callTool("deleteCalendarEvent", { eventId: foreignEventId });
        const foreignCalendarEventCreate = await callTool("createCalendarEvent", {
            ...eventInput,
            calendar: foreignCalendarId,
            title: "Forged foreign calendar event",
        });
        expect(foreignEventRead.result.isError).toBe(true);
        expect(JSON.stringify(foreignEventRead)).not.toContain("Foreign event secret");
        expect(foreignEventUpdate.result.isError).toBe(true);
        expect(foreignEventMove.result.isError).toBe(true);
        expect(foreignEventDelete.result.isError).toBe(true);
        expect(foreignCalendarEventCreate.result.isError).toBe(true);
        const foreignEvent = await EventEntity.findOne({ where: { id: foreignEventId } });
        expect(foreignEvent?.get("title")).toBe("Foreign event secret");
        expect(foreignEvent?.get("deleted")).toBeNull();

        const sameTenantEventDelete = await callTool("deleteCalendarEvent", {
            eventId: sameTenantEvent.id,
        });
        expect(readToolOutput(sameTenantEventDelete).deleted).toBe(true);

        const foreignUpdate = await callTool("updateLocalCalendar", {
            calendarId: foreignCalendarId,
            title: "Forged cross-tenant update",
        });
        const foreignDelete = await callTool("deleteLocalCalendar", { calendarId: foreignCalendarId });
        expect(foreignUpdate.result.isError).toBe(true);
        expect(foreignDelete.result.isError).toBe(true);
        const foreignCalendar = await CalendarEntity.findOne({ where: { id: foreignCalendarId } });
        expect(foreignCalendar?.get("title")).toBe("Foreign calendar secret");
        expect(foreignCalendar?.get("deleted")).toBeNull();
    });

    it("lists only registered tools for an authenticated MCP caller", async () => {
        const credentials = JSON.parse(readFileSync("testUser.json", "utf8")) as { email: string };
        const caller = await UserEntity.findOne({ where: { email: credentials.email } });
        expect(caller).not.toBeNull();
        const tenant = String(caller!.get("tenant"));
        const userId = String(caller!.get("id"));

        const restrictedRole = await RoleEntity.create({
            title: `No directory access ${randomUUID()}`,
            description: "temporary MCP authorization fixture",
            access: {},
            disabled: false,
            tenant,
            createdBy: userId,
            updatedBy: userId,
        });
        const roleId = String(restrictedRole.get("id"));
        fixtureRows.push({ entity: RoleEntity, id: roleId });

        const restrictedUser = await UserEntity.create({
            email: `mcp-directory-viewer-${randomUUID()}@example.test`,
            password: "test-password",
            firstName: "Restricted",
            lastName: "Directory Viewer",
            role: roleId,
            tenant,
            admin: false,
            real: false,
        });
        const restrictedUserId = String(restrictedUser.get("id"));
        fixtureRows.push({ entity: UserEntity, id: restrictedUserId });
        rateLimitedUserIds.push(restrictedUserId);
        const restrictedSession = await issueSession(restrictedUserId, tenant, 120);
        fixtureRows.push({ entity: SessionEntity, id: restrictedSession.sid });
        const response = await app.request("/api/mcp", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${restrictedSession.token}`,
                "Content-Type": "application/json",
                Accept: "application/json, text/event-stream",
            },
            body: JSON.stringify({ jsonrpc: "2.0", id: randomUUID(), method: "tools/list" }),
        });
        expect(response.status).toBe(200);
        const result = (await response.json()) as { result: { tools: Array<{ name: string }> } };
        const listedToolNames = result.result.tools.map(tool => tool.name);
        expect([...listedToolNames].sort()).toEqual([...MCP_AI_TOOL_NAMES].sort());
        expect(listedToolNames).toContain("getTask");
        expect(listedToolNames).not.toContain("searchPeople");
        expect(listedToolNames).not.toContain("getPerson");
        expect(listedToolNames).not.toContain("listCompanies");
        expect(listedToolNames).not.toContain("getCompany");
    });

    it("enforces chat-only people and company access and keeps tags tenant-scoped", async () => {
        const credentials = JSON.parse(readFileSync("testUser.json", "utf8")) as { email: string };
        const baseUser = await UserEntity.findOne({ where: { email: credentials.email } });
        expect(baseUser).not.toBeNull();
        const tenant = String(baseUser!.get("tenant"));
        const ownerId = String(baseUser!.get("id"));
        const foreignTenant = await TenantEntity.create({
            title: `Chat tools foreign tenant ${randomUUID()}`,
            description: "temporary authorization fixture",
            expiry: new Date(Date.now() + 60 * 60 * 1000),
        });
        const foreignTenantId = String(foreignTenant.get("id"));
        fixtureRows.push({ entity: TenantEntity, id: foreignTenantId });

        const createRole = async (roleTenant: string, title: string) => {
            const role = await RoleEntity.create({
                title: `${title} ${randomUUID()}`,
                description: "temporary chat-tool authorization fixture",
                access: {
                    [ROLE_SECTIONS.PEOPLE]: { read: true },
                    [ROLE_SECTIONS.COMPANIES]: { read: true },
                },
                disabled: false,
                tenant: roleTenant,
                createdBy: ownerId,
                updatedBy: ownerId,
            });
            fixtureRows.push({ entity: RoleEntity, id: String(role.get("id")) });
            return role;
        };
        const readerRole = await createRole(tenant, "Chat directory reader");
        const deniedRole = await RoleEntity.create({
            title: `Chat directory denied ${randomUUID()}`,
            description: "temporary chat-tool authorization fixture",
            access: {},
            disabled: false,
            tenant,
            createdBy: ownerId,
            updatedBy: ownerId,
        });
        fixtureRows.push({ entity: RoleEntity, id: String(deniedRole.get("id")) });
        const foreignRole = await createRole(foreignTenantId, "Foreign chat reader");
        const foreignUser = await UserEntity.create({
            email: `chat-foreign-person-${randomUUID()}@example.test`,
            password: "test-password",
            firstName: "Foreign",
            lastName: "Person",
            role: String(foreignRole.get("id")),
            tenant: foreignTenantId,
            admin: false,
            real: true,
        });
        fixtureRows.push({ entity: UserEntity, id: String(foreignUser.get("id")) });
        const foreignCompany = await CompanyEntity.create({
            title: `Foreign chat company ${randomUUID()}`,
            tenant: foreignTenantId,
            createdBy: String(foreignUser.get("id")),
            updatedBy: String(foreignUser.get("id")),
        });
        fixtureRows.push({ entity: CompanyEntity, id: String(foreignCompany.get("id")) });
        const localCompany = await CompanyEntity.create({
            title: `Local chat company ${randomUUID()}`,
            tenant,
            createdBy: ownerId,
            updatedBy: ownerId,
        });
        fixtureRows.push({ entity: CompanyEntity, id: String(localCompany.get("id")) });
        const foreignTag = await TagEntity.create({
            title: `Foreign chat tag ${randomUUID()}`,
            color: "#123456",
            section: "projects",
            type: "tag",
            tenant: foreignTenantId,
            createdBy: String(foreignUser.get("id")),
            updatedBy: String(foreignUser.get("id")),
        });
        fixtureRows.push({ entity: TagEntity, id: String(foreignTag.get("id")) });
        const localTag = await TagEntity.create({
            title: `Local chat tag ${randomUUID()}`,
            color: "#654321",
            section: "projects",
            type: "tag",
            tenant,
            createdBy: ownerId,
            updatedBy: ownerId,
        });
        fixtureRows.push({ entity: TagEntity, id: String(localTag.get("id")) });

        const runAsToolUser = <T>(role: any, fn: () => T) =>
            requestContext.run(
                {
                    user: { ...baseUser!.toJSON(), admin: false, tenant },
                    role: role.toJSON(),
                    instanceId: "chat-tool-authorization-test",
                    requestId: randomUUID(),
                    timestamp: Date.now(),
                } as any,
                fn
            );
        const getPerson = peopleAiTools.find(tool => tool.name === "getPerson")!;
        const searchPeople = peopleAiTools.find(tool => tool.name === "searchPeople")!;
        const listCompanies = orgAiTools.find(tool => tool.name === "listCompanies")!;
        const getCompany = orgAiTools.find(tool => tool.name === "getCompany")!;
        const listTags = orgAiTools.find(tool => tool.name === "listTags")!;

        await expect(
            runAsToolUser(deniedRole, () => searchPeople.execute({ query: "Foreign" }))
        ).rejects.toMatchObject({ statusCode: 403 });
        await expect(runAsToolUser(deniedRole, () => listCompanies.execute({}))).rejects.toMatchObject({
            statusCode: 403,
        });
        await expect(
            runAsToolUser(readerRole, () => getPerson.execute({ personId: String(foreignUser.get("id")) }))
        ).rejects.toMatchObject({ statusCode: 404 });
        await expect(
            runAsToolUser(readerRole, () =>
                getCompany.execute({ companyId: String(foreignCompany.get("id")) })
            )
        ).rejects.toMatchObject({ statusCode: 404 });
        await expect(
            runAsToolUser(readerRole, () => getPerson.execute({ personId: ownerId }))
        ).resolves.toMatchObject({ email: baseUser!.get("email") });
        await expect(
            runAsToolUser(readerRole, () => getCompany.execute({ companyId: String(localCompany.get("id")) }))
        ).resolves.toMatchObject({ title: localCompany.get("title") });

        const visiblePeople = await runAsToolUser(readerRole, () =>
            searchPeople.execute({ query: "Foreign" })
        );
        const visibleCompanies = await runAsToolUser(readerRole, () => listCompanies.execute({}));
        expect(JSON.stringify(visiblePeople)).not.toContain(String(foreignUser.get("id")));
        expect(JSON.stringify(visibleCompanies)).not.toContain(String(foreignCompany.get("id")));
        const visibleTags = await runAsToolUser(readerRole, () => listTags.execute({}));
        expect(JSON.stringify(visibleTags)).toContain(String(localTag.get("id")));
        expect(JSON.stringify(visibleTags)).not.toContain(String(foreignTag.get("id")));
    });

    it("enforces caller permissions on Google-backed MCP event creation", async () => {
        const credentials = JSON.parse(readFileSync("testUser.json", "utf8")) as { email: string };
        const baseUser = await UserEntity.findOne({ where: { email: credentials.email } });
        expect(baseUser).not.toBeNull();
        const tenant = String(baseUser!.get("tenant"));
        const calendarId = `mock-google-calendar-${randomUUID()}`;
        const title = `Mock provider event ${randomUUID()}`;

        const admin = await UserEntity.create({
            email: `mcp-google-calendar-admin-${randomUUID()}@example.test`,
            password: "test-password",
            firstName: "MCP Google",
            lastName: "Admin",
            role: String(baseUser!.get("role")),
            tenant,
            admin: true,
            real: false,
        });
        const adminId = String(admin.get("id"));
        fixtureRows.push({ entity: UserEntity, id: adminId });
        rateLimitedUserIds.push(adminId);
        const adminSession = await issueSession(adminId, tenant, 120);
        fixtureRows.push({ entity: SessionEntity, id: adminSession.sid });

        const readerRole = await RoleEntity.create({
            title: `MCP Google calendar reader ${randomUUID()}`,
            description: "temporary read-only Google calendar fixture",
            access: { [ROLE_SECTIONS.CALENDAR]: { read: true } },
            disabled: false,
            tenant,
            createdBy: adminId,
            updatedBy: adminId,
        });
        const readerRoleId = String(readerRole.get("id"));
        fixtureRows.push({ entity: RoleEntity, id: readerRoleId });
        const reader = await UserEntity.create({
            email: `mcp-google-calendar-reader-${randomUUID()}@example.test`,
            password: "test-password",
            firstName: "MCP Google",
            lastName: "Reader",
            role: readerRoleId,
            tenant,
            admin: false,
            real: false,
        });
        const readerId = String(reader.get("id"));
        fixtureRows.push({ entity: UserEntity, id: readerId });
        rateLimitedUserIds.push(readerId);
        const readerSession = await issueSession(readerId, tenant, 120);
        fixtureRows.push({ entity: SessionEntity, id: readerSession.sid });

        const noAccessRole = await RoleEntity.create({
            title: `MCP Google calendar no-access ${randomUUID()}`,
            description: "temporary no-calendar-access fixture",
            access: {},
            disabled: false,
            tenant,
            createdBy: adminId,
            updatedBy: adminId,
        });
        const noAccessRoleId = String(noAccessRole.get("id"));
        fixtureRows.push({ entity: RoleEntity, id: noAccessRoleId });
        const noAccessUser = await UserEntity.create({
            email: `mcp-google-calendar-no-access-${randomUUID()}@example.test`,
            password: "test-password",
            firstName: "MCP Google",
            lastName: "No Access",
            role: noAccessRoleId,
            tenant,
            admin: false,
            real: false,
        });
        const noAccessUserId = String(noAccessUser.get("id"));
        fixtureRows.push({ entity: UserEntity, id: noAccessUserId });
        rateLimitedUserIds.push(noAccessUserId);
        const noAccessSession = await issueSession(noAccessUserId, tenant, 120);
        fixtureRows.push({ entity: SessionEntity, id: noAccessSession.sid });

        const start = new Date(Date.now() + 60 * 60 * 1000);
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        const providerEvent = {
            id: `provider-event-${randomUUID()}`,
            summary: title,
            start: { dateTime: start.toISOString() },
            end: { dateTime: end.toISOString() },
        };
        const getCalendars = vi
            .spyOn(googleOAuthService, "getCalendars")
            .mockResolvedValue([{ id: calendarId, summary: "Mock calendar", accessRole: "owner" }] as any);
        const createCalendarEvent = vi
            .spyOn(googleOAuthService, "createCalendarEvent")
            .mockResolvedValue(providerEvent as any);

        const callTool = async (
            token: string,
            name: "createCalendarEvent" | "listCalendars",
            arguments_: Record<string, unknown>
        ) => {
            const response = await app.request("/api/mcp", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                    Accept: "application/json, text/event-stream",
                },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    id: randomUUID(),
                    method: "tools/call",
                    params: {
                        name,
                        arguments: arguments_,
                    },
                }),
            });
            expect(response.status).toBe(200);
            return response.json();
        };

        try {
            const [adminResult, readerResult, readerList, noAccessList] = await Promise.all([
                callTool(adminSession.token, "createCalendarEvent", {
                    title,
                    start: start.toISOString(),
                    end: end.toISOString(),
                    source: "google",
                    calendar: calendarId,
                }),
                callTool(readerSession.token, "createCalendarEvent", {
                    title,
                    start: start.toISOString(),
                    end: end.toISOString(),
                    source: "google",
                    calendar: calendarId,
                }),
                callTool(readerSession.token, "listCalendars", { source: "local" }),
                callTool(noAccessSession.token, "listCalendars", { source: "local" }),
            ]);
            expect(adminResult.result.isError).not.toBe(true);
            const created = JSON.parse(adminResult.result.content[0].text);
            expect(created).toMatchObject({
                id: `google_${calendarId}_${providerEvent.id}`,
                title,
                source: "google",
                calendar: calendarId,
            });
            expect(getCalendars).toHaveBeenCalledWith(adminId);
            expect(createCalendarEvent).toHaveBeenCalledWith(
                adminId,
                calendarId,
                expect.objectContaining({ summary: title })
            );

            expect(readerResult.result.isError).toBe(true);
            expect(readerList.result.isError).not.toBe(true);
            expect(noAccessList.result.isError).toBe(true);
            expect(JSON.stringify(noAccessList)).not.toContain("Local calendar");
            expect(getCalendars).toHaveBeenCalledTimes(1);
            expect(createCalendarEvent).toHaveBeenCalledTimes(1);
            expect(await EventEntity.count({ where: { title, tenant } })).toBe(0);
        } finally {
            getCalendars.mockRestore();
            createCalendarEvent.mockRestore();
        }
    });
});
