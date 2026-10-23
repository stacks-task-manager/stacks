// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { afterEach, describe, expect, it } from "vitest";
import {
    ActivityEntity,
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
import { POLLINGTYPE, RECORDTYPE, ROLE_SECTIONS } from "@stacks/types";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { Op } from "sequelize";
import app from "../../src/index";
import { getAuthToken } from "../helpers/authHelper";
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

describe("Activity API field allowlist", () => {
    it("does not accept client-supplied identity, tenant, author, or deletion metadata", async () => {
        const credentials = JSON.parse(readFileSync("testUser.json", "utf8")) as { email: string };
        const caller = await UserEntity.findOne({ where: { email: credentials.email } });
        expect(caller).not.toBeNull();

        const callerId = String(caller!.get("id"));
        const tenantId = String(caller!.get("tenant"));
        const foreignTenantId = randomUUID();
        const spoofedPersonId = randomUUID();
        const spoofedActivityId = randomUUID();
        const projectId = randomUUID();
        const stackId = randomUUID();
        const taskId = randomUUID();
        const createdAt = new Date("2001-01-01T00:00:00.000Z");

        const projectDocument = await DocumentEntity.create({
            id: projectId,
            title: "activity mass assignment fixture",
            type: RECORDTYPE.PROJECT,
            order: 0,
            tenant: tenantId,
            createdBy: callerId,
            updatedBy: callerId,
        });
        fixtureRows.push({ entity: DocumentEntity, id: projectDocument.id });

        const project = await ProjectEntity.create({
            id: projectId,
            projectOwner: callerId,
            tenant: tenantId,
            createdBy: callerId,
            updatedBy: callerId,
        });
        fixtureRows.push({ entity: ProjectEntity, id: project.id });

        const projectPermissions = await PermissionEntity.create({
            id: projectId,
            owner: callerId,
            isPublic: false,
            visibleUsers: [callerId],
            visibleRoles: [],
            type: POLLINGTYPE.PROJECT,
            tenant: tenantId,
            createdBy: callerId,
            updatedBy: callerId,
        });
        fixtureRows.push({ entity: PermissionEntity, id: projectPermissions.id });

        const stack = await StackEntity.create({
            id: stackId,
            title: "activity mass assignment fixture",
            project: projectId,
            tenant: tenantId,
            createdBy: callerId,
            updatedBy: callerId,
        });
        fixtureRows.push({ entity: StackEntity, id: stack.id });

        const task = await TaskEntity.create({
            id: taskId,
            title: "activity mass assignment fixture",
            project: projectId,
            stack: stackId,
            tenant: tenantId,
            createdBy: callerId,
            updatedBy: callerId,
        });
        fixtureRows.push({ entity: TaskEntity, id: task.id });

        const taskPermissions = await PermissionEntity.create({
            id: taskId,
            owner: callerId,
            isPublic: false,
            visibleUsers: [callerId],
            visibleRoles: [],
            type: POLLINGTYPE.TASK,
            tenant: tenantId,
            createdBy: callerId,
            updatedBy: callerId,
        });
        fixtureRows.push({ entity: PermissionEntity, id: taskPermissions.id });

        const token = await getAuthToken();
        const response = await app.request("/api/activities", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                resourceId: taskId,
                resourceType: "task",
                type: "log",
                title: "allowed user activity",
                id: spoofedActivityId,
                tenant: foreignTenantId,
                person: spoofedPersonId,
                createdBy: spoofedPersonId,
                updatedBy: spoofedPersonId,
                created: createdAt,
                updated: createdAt,
                deleted: createdAt,
                deletedBy: spoofedPersonId,
            }),
        });

        expect(response.status).toBe(200);
        const body = await response.json();
        const activity = body.data;
        expect(activity.id).not.toBe(spoofedActivityId);
        expect(activity.tenant).toBe(tenantId);
        expect(activity.person).toBe(callerId);
        expect(activity.createdBy).toBe(callerId);
        expect(activity.updatedBy).toBe(callerId);
        expect(activity.deleted ?? null).toBeNull();
        expect(activity.deletedBy ?? null).toBeNull();

        const storedActivity = await ActivityEntity.findOne({ where: { id: activity.id } });
        expect(storedActivity).not.toBeNull();
        fixtureRows.push({ entity: ActivityEntity, id: activity.id });
        expect(storedActivity!.get("deleted")).toBeNull();
        expect(storedActivity!.get("tenant")).toBe(tenantId);
    });

    it("denies a visible non-owner forging a task log while allowing the task owner", async () => {
        const credentials = JSON.parse(readFileSync("testUser.json", "utf8")) as { email: string };
        const caller = await UserEntity.findOne({ where: { email: credentials.email } });
        expect(caller).not.toBeNull();
        const callerId = String(caller!.get("id"));
        const tenantId = String(caller!.get("tenant"));
        expect(caller!.get("admin")).toBe(false);
        const commentsRole = await RoleEntity.create({
            title: `Activity comment writer ${randomUUID()}`,
            description: "temporary security fixture",
            access: { [ROLE_SECTIONS.COMMENTS]: { read: true, write: true } },
            disabled: false,
            tenant: tenantId,
            createdBy: callerId,
            updatedBy: callerId,
        });
        const commentsRoleId = String(commentsRole.get("id"));
        fixtureRows.push({ entity: RoleEntity, id: commentsRoleId });
        const noCommentsRole = await RoleEntity.create({
            title: `Activity reader ${randomUUID()}`,
            description: "temporary security fixture",
            access: {},
            disabled: false,
            tenant: tenantId,
            createdBy: callerId,
            updatedBy: callerId,
        });
        const noCommentsRoleId = String(noCommentsRole.get("id"));
        fixtureRows.push({ entity: RoleEntity, id: noCommentsRoleId });
        const viewer = await UserEntity.create({
            email: `activity-log-viewer-${randomUUID()}@example.test`,
            password: "test-password",
            firstName: "Activity Log Viewer",
            lastName: "Security Fixture",
            role: commentsRoleId,
            tenant: tenantId,
            admin: false,
            real: false,
        });
        const viewerId = String(viewer.get("id"));
        fixtureRows.push({ entity: UserEntity, id: viewerId });
        rateLimitedUserIds.push(viewerId);
        const viewerSession = await issueSession(viewerId, tenantId, 120);
        fixtureRows.push({ entity: SessionEntity, id: viewerSession.sid });
        const noCommentsUser = await UserEntity.create({
            email: `activity-reader-${randomUUID()}@example.test`,
            password: "test-password",
            firstName: "Activity Reader",
            lastName: "Security Fixture",
            role: noCommentsRoleId,
            tenant: tenantId,
            admin: false,
            real: false,
        });
        const noCommentsUserId = String(noCommentsUser.get("id"));
        fixtureRows.push({ entity: UserEntity, id: noCommentsUserId });
        rateLimitedUserIds.push(noCommentsUserId);
        const noCommentsSession = await issueSession(noCommentsUserId, tenantId, 120);
        fixtureRows.push({ entity: SessionEntity, id: noCommentsSession.sid });
        const admin = await UserEntity.create({
            email: `activity-admin-${randomUUID()}@example.test`,
            password: "test-password",
            firstName: "Activity Admin",
            lastName: "Security Fixture",
            role: noCommentsRoleId,
            tenant: tenantId,
            admin: true,
            real: false,
        });
        const adminId = String(admin.get("id"));
        fixtureRows.push({ entity: UserEntity, id: adminId });
        rateLimitedUserIds.push(adminId);
        const adminSession = await issueSession(adminId, tenantId, 120);
        fixtureRows.push({ entity: SessionEntity, id: adminSession.sid });

        const projectId = randomUUID();
        await DocumentEntity.create({
            id: projectId,
            title: "Activity log authorization project",
            type: RECORDTYPE.PROJECT,
            order: 0,
            tenant: tenantId,
            createdBy: callerId,
            updatedBy: callerId,
        });
        fixtureRows.push({ entity: DocumentEntity, id: projectId });
        await ProjectEntity.create({
            id: projectId,
            projectOwner: callerId,
            tenant: tenantId,
            createdBy: callerId,
            updatedBy: callerId,
        });
        fixtureRows.push({ entity: ProjectEntity, id: projectId });
        await PermissionEntity.create({
            id: projectId,
            owner: callerId,
            isPublic: true,
            visibleUsers: [],
            visibleRoles: [],
            type: POLLINGTYPE.PROJECT,
            tenant: tenantId,
            createdBy: callerId,
            updatedBy: callerId,
        });
        fixtureRows.push({ entity: PermissionEntity, id: projectId });

        const stackId = randomUUID();
        await StackEntity.create({
            id: stackId,
            title: "Activity log authorization stack",
            project: projectId,
            tenant: tenantId,
            createdBy: callerId,
            updatedBy: callerId,
        });
        fixtureRows.push({ entity: StackEntity, id: stackId });
        const taskId = randomUUID();
        await TaskEntity.create({
            id: taskId,
            title: "Activity log authorization task",
            project: projectId,
            stack: stackId,
            tenant: tenantId,
            createdBy: callerId,
            updatedBy: callerId,
        });
        fixtureRows.push({ entity: TaskEntity, id: taskId });
        await PermissionEntity.create({
            id: taskId,
            owner: callerId,
            isPublic: true,
            visibleUsers: [],
            visibleRoles: [],
            type: POLLINGTYPE.TASK,
            tenant: tenantId,
            createdBy: callerId,
            updatedBy: callerId,
        });
        fixtureRows.push({ entity: PermissionEntity, id: taskId });

        const createLog = (authorization: string) =>
            app.request("/api/activities", {
                method: "POST",
                headers: { Authorization: authorization, "Content-Type": "application/json" },
                body: JSON.stringify({
                    resourceId: taskId,
                    resourceType: "task",
                    type: "log",
                    content: "Task title changed",
                    change: { field: "title", before: "Original", after: "Forged" },
                }),
            });

        const viewerResponse = await createLog(`Bearer ${viewerSession.token}`);
        const noCommentsResponse = await app.request("/api/activities", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${noCommentsSession.token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                resourceId: taskId,
                resourceType: "task",
                type: "message",
                content: "This comment must be denied",
            }),
        });
        const viewerCommentResponse = await app.request("/api/activities", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${viewerSession.token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                resourceId: taskId,
                resourceType: "task",
                type: "message",
                content: "Visible task comment from the configured comments writer",
            }),
        });
        const adminCommentResponse = await app.request("/api/activities", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${adminSession.token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                resourceId: taskId,
                resourceType: "task",
                type: "message",
                content: "Same-tenant admin comment without a comments role",
            }),
        });
        const ownerResponse = await createLog(`Bearer ${await getAuthToken()}`);
        const activities = await ActivityEntity.findAll({ where: { resourceId: taskId } });
        for (const activity of activities) {
            fixtureRows.push({ entity: ActivityEntity, id: String(activity.get("id")) });
        }

        expect(viewerResponse.status).toBe(403);
        expect(noCommentsResponse.status).toBe(403);
        expect(viewerCommentResponse.status).toBe(200);
        expect(adminCommentResponse.status).toBe(200);
        expect(ownerResponse.status).toBe(200);
        expect(activities).toHaveLength(3);
        expect(activities.find(activity => activity.get("type") === "message")?.get("person")).toBe(viewerId);
        expect(
            activities.find(
                activity => activity.get("type") === "message" && activity.get("person") === adminId
            )
        ).toBeDefined();
        expect(activities.find(activity => activity.get("type") === "log")?.get("person")).toBe(callerId);
    });

    it("does not create activity on a public task in another tenant", async () => {
        const credentials = JSON.parse(readFileSync("testUser.json", "utf8")) as { email: string };
        const caller = await UserEntity.findOne({ where: { email: credentials.email } });
        expect(caller).not.toBeNull();
        const tenant = await TenantEntity.create({
            title: `Foreign activity target ${randomUUID()}`,
            description: "temporary security fixture",
            disabled: false,
            expiry: new Date(Date.now() + 60 * 60 * 1000),
        });
        const foreignTenantId = String(tenant.get("id"));
        fixtureRows.push({ entity: TenantEntity, id: foreignTenantId });

        const foreignOwnerId = randomUUID();
        const projectId = randomUUID();
        const stackId = randomUUID();
        const taskId = randomUUID();
        await DocumentEntity.create({
            id: projectId,
            title: "Public foreign activity project",
            type: RECORDTYPE.PROJECT,
            order: 0,
            tenant: foreignTenantId,
            createdBy: foreignOwnerId,
            updatedBy: foreignOwnerId,
        });
        fixtureRows.push({ entity: DocumentEntity, id: projectId });
        await ProjectEntity.create({
            id: projectId,
            projectOwner: foreignOwnerId,
            tenant: foreignTenantId,
            createdBy: foreignOwnerId,
            updatedBy: foreignOwnerId,
        });
        fixtureRows.push({ entity: ProjectEntity, id: projectId });
        await PermissionEntity.create({
            id: projectId,
            owner: foreignOwnerId,
            isPublic: true,
            visibleUsers: [],
            visibleRoles: [],
            type: POLLINGTYPE.PROJECT,
            tenant: foreignTenantId,
            createdBy: foreignOwnerId,
            updatedBy: foreignOwnerId,
        });
        fixtureRows.push({ entity: PermissionEntity, id: projectId });
        await StackEntity.create({
            id: stackId,
            title: "Public foreign activity stack",
            project: projectId,
            tenant: foreignTenantId,
            createdBy: foreignOwnerId,
            updatedBy: foreignOwnerId,
        });
        fixtureRows.push({ entity: StackEntity, id: stackId });
        await TaskEntity.create({
            id: taskId,
            title: "Public foreign activity task",
            project: projectId,
            stack: stackId,
            tenant: foreignTenantId,
            createdBy: foreignOwnerId,
            updatedBy: foreignOwnerId,
        });
        fixtureRows.push({ entity: TaskEntity, id: taskId });
        await PermissionEntity.create({
            id: taskId,
            owner: foreignOwnerId,
            isPublic: true,
            visibleUsers: [],
            visibleRoles: [],
            type: POLLINGTYPE.TASK,
            tenant: foreignTenantId,
            createdBy: foreignOwnerId,
            updatedBy: foreignOwnerId,
        });
        fixtureRows.push({ entity: PermissionEntity, id: taskId });

        const response = await app.request("/api/activities", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${await getAuthToken()}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                resourceId: taskId,
                resourceType: "task",
                type: "message",
                content: "Cross-tenant activity must not be persisted",
            }),
        });

        expect(response.status).toBe(404);
        expect(await ActivityEntity.count({ where: { resourceId: taskId } })).toBe(0);
    });
});
