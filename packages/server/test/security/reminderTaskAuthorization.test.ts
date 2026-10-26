// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
    DocumentEntity,
    PermissionEntity,
    ProjectEntity,
    ReminderEntity,
    RateLimitCounterEntity,
    SessionEntity,
    StackEntity,
    TaskEntity,
    TenantEntity,
    UserEntity,
} from "@stacks/db";
import { RECORDTYPE } from "@stacks/types";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { Op } from "sequelize";
import app from "../../src/index";
import { getAuthToken } from "../helpers/authHelper";
import { issueSession } from "../../src/services/sessions";
import { rateLimitKeyHash } from "../../src/utils/rateLimit";

const fixtureRows: Array<{ entity: any; id: string }> = [];
let headers: Record<string, string>;
let callerId: string;
let otherLocalPersonId: string;
let tenant: string;
let localTaskId: string;
let hiddenTaskId: string;
let sharedTaskId: string;
let foreignTaskId: string;
let foreignTenantId: string;
let taskOwnerHeaders: Record<string, string>;
let adminId: string;
let adminHeaders: Record<string, string>;

async function createTaskFixture(input: {
    title: string;
    tenant: string;
    ownerId: string;
    projectVisibleToCaller: boolean;
}) {
    const id = randomUUID();
    const document = await DocumentEntity.create({
        id,
        title: input.title,
        type: RECORDTYPE.PROJECT,
        order: 0,
        tenant: input.tenant,
        createdBy: input.ownerId,
        updatedBy: input.ownerId,
    });
    fixtureRows.push({ entity: DocumentEntity, id: String(document.id) });

    const project = await ProjectEntity.create({
        id,
        projectOwner: input.ownerId,
        tenant: input.tenant,
        createdBy: input.ownerId,
        updatedBy: input.ownerId,
    });
    fixtureRows.push({ entity: ProjectEntity, id: String(project.id) });

    const projectPermission = await PermissionEntity.create({
        id,
        owner: input.ownerId,
        isPublic: false,
        visibleUsers: input.projectVisibleToCaller && input.ownerId !== callerId ? [callerId] : [],
        visibleRoles: [],
        tenant: input.tenant,
        createdBy: input.ownerId,
        updatedBy: input.ownerId,
    });
    fixtureRows.push({ entity: PermissionEntity, id: String(projectPermission.id) });

    const stackId = randomUUID();
    const stack = await StackEntity.create({
        id: stackId,
        title: `${input.title} stack`,
        project: id,
        tenant: input.tenant,
        createdBy: input.ownerId,
        updatedBy: input.ownerId,
    });
    fixtureRows.push({ entity: StackEntity, id: String(stack.id) });

    const taskId = randomUUID();
    const task = await TaskEntity.create({
        id: taskId,
        title: `${input.title} task`,
        project: id,
        stack: stackId,
        assignees: [input.ownerId],
        tenant: input.tenant,
        createdBy: input.ownerId,
        updatedBy: input.ownerId,
    });
    fixtureRows.push({ entity: TaskEntity, id: String(task.id) });

    const taskPermission = await PermissionEntity.create({
        id: taskId,
        owner: input.ownerId,
        isPublic: false,
        visibleUsers: input.projectVisibleToCaller && input.ownerId !== callerId ? [callerId] : [],
        visibleRoles: [],
        tenant: input.tenant,
        createdBy: input.ownerId,
        updatedBy: input.ownerId,
    });
    fixtureRows.push({ entity: PermissionEntity, id: String(taskPermission.id) });

    return { projectId: id, taskId };
}

async function createReminder(recordId: string, ownerId = callerId, tenantId = tenant) {
    const reminderId = randomUUID();
    const reminder = await ReminderEntity.create({
        id: reminderId,
        title: `Reminder fixture ${reminderId}`,
        subtitle: "temporary security fixture",
        recordId,
        recordType: "task",
        date: new Date(Date.now() + 60 * 60 * 1000),
        tenant: tenantId,
        createdBy: ownerId,
        updatedBy: ownerId,
    });
    fixtureRows.push({ entity: ReminderEntity, id: String(reminder.id) });
    return reminder;
}

async function submitReminder(recordId: string, requestHeaders = headers) {
    return app.request("/api/reminders", {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify({
            title: "Reminder security regression",
            subtitle: "temporary fixture",
            date: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            recordId,
            recordType: "task",
            url: `/task/${recordId}`,
        }),
    });
}

describe("reminder task authorization", () => {
    beforeAll(async () => {
        const { email } = JSON.parse(readFileSync("testUser.json", "utf8")) as { email: string };
        const caller = await UserEntity.findOne({ where: { email } });
        expect(caller).not.toBeNull();
        callerId = String(caller!.id);
        tenant = String(caller!.get("tenant"));
        const admin = await UserEntity.create({
            email: `admin-reminder-${randomUUID()}@example.test`,
            password: "test-password",
            firstName: "Reminder",
            lastName: "Admin",
            role: String(caller!.get("role")),
            tenant,
            admin: true,
            real: false,
        });
        adminId = String(admin.get("id"));
        fixtureRows.push({ entity: UserEntity, id: adminId });
        const adminSession = await issueSession(adminId, tenant, 120);
        fixtureRows.push({ entity: SessionEntity, id: adminSession.sid });
        adminHeaders = {
            Authorization: `Bearer ${adminSession.token}`,
            "Content-Type": "application/json",
        };
        headers = {
            Authorization: `Bearer ${await getAuthToken()}`,
            "Content-Type": "application/json",
        };

        const otherLocalPerson = await UserEntity.create({
            email: `other-reminder-${randomUUID()}@example.test`,
            password: "test-password",
            firstName: "Other",
            lastName: "Reminder User",
            role: String(caller!.get("role")),
            tenant,
            real: false,
        });
        otherLocalPersonId = String(otherLocalPerson.get("id"));
        fixtureRows.push({ entity: UserEntity, id: otherLocalPersonId });
        const otherLocalSession = await issueSession(otherLocalPersonId, tenant, 120);
        fixtureRows.push({ entity: SessionEntity, id: otherLocalSession.sid });
        taskOwnerHeaders = {
            Authorization: `Bearer ${otherLocalSession.token}`,
            "Content-Type": "application/json",
        };

        const local = await createTaskFixture({
            title: "Caller reminder project",
            tenant,
            ownerId: callerId,
            projectVisibleToCaller: true,
        });
        localTaskId = local.taskId;

        const hidden = await createTaskFixture({
            title: "Hidden reminder project",
            tenant,
            ownerId: otherLocalPersonId,
            projectVisibleToCaller: false,
        });
        hiddenTaskId = hidden.taskId;

        const shared = await createTaskFixture({
            title: "Shared reminder project",
            tenant,
            ownerId: otherLocalPersonId,
            projectVisibleToCaller: true,
        });
        sharedTaskId = shared.taskId;

        const foreignTenant = await TenantEntity.create({
            title: `Foreign reminder tenant ${randomUUID()}`,
            description: "temporary security fixture",
            expiry: new Date(Date.now() + 60 * 60 * 1000),
        });
        foreignTenantId = String(foreignTenant.get("id"));
        fixtureRows.push({ entity: TenantEntity, id: foreignTenantId });

        const foreign = await createTaskFixture({
            title: "Foreign reminder project",
            tenant: foreignTenantId,
            ownerId: callerId,
            projectVisibleToCaller: false,
        });
        foreignTaskId = foreign.taskId;
    });

    afterAll(async () => {
        const cleanupErrors: unknown[] = [];
        try {
            const userIds = [callerId, otherLocalPersonId].filter(Boolean);
            const keyHashes = userIds.map(userId => rateLimitKeyHash("authenticated-api-user", userId));
            await RateLimitCounterEntity.destroy({ where: { keyHash: { [Op.in]: keyHashes } } });
        } catch (error) {
            cleanupErrors.push(error);
        }
        for (const { entity, id } of fixtureRows.reverse()) {
            try {
                await entity.destroy({ where: { id }, force: true });
            } catch (error) {
                cleanupErrors.push(error);
            }
        }
        fixtureRows.length = 0;
        if (cleanupErrors.length) {
            throw new AggregateError(cleanupErrors, "Failed to clean up reminder authorization fixtures");
        }
    });

    it("allows the task owner to create and list a reminder", async () => {
        const created = await submitReminder(localTaskId);
        const body = await created.json();
        if (body.data?.id) fixtureRows.push({ entity: ReminderEntity, id: body.data.id });
        const listed = await app.request(`/api/reminders/${localTaskId}`, { headers });

        expect(created.status).toBe(200);
        expect(listed.status).toBe(200);
        expect(await listed.json()).toMatchObject({
            success: true,
            data: [
                expect.objectContaining({
                    recordId: localTaskId,
                }),
            ],
        });
    });

    it("allows a same-tenant admin to create and delete reminders on another user's task", async () => {
        const foreignRead = await app.request(`/api/reminders/${foreignTaskId}`, { headers: adminHeaders });
        const foreignCreate = await submitReminder(foreignTaskId, adminHeaders);
        const created = await submitReminder(sharedTaskId, adminHeaders);
        const body = await created.json();
        if (body.data?.id) fixtureRows.push({ entity: ReminderEntity, id: String(body.data.id) });

        expect(foreignRead.status).toBe(404);
        expect(foreignCreate.status).toBe(404);
        expect(await ReminderEntity.count({ where: { recordId: foreignTaskId, tenant } })).toBe(0);
        expect(created.status).toBe(200);
        expect(body.data.recordId).toBe(sharedTaskId);

        const removed = await app.request(`/api/reminders/${body.data.id}`, {
            method: "DELETE",
            headers: adminHeaders,
        });

        expect(removed.status).toBe(200);
        expect((await ReminderEntity.findByPk(body.data.id))?.get("deleted")).not.toBeNull();
    });

    it("hides reminders attached to a task outside the caller's tenant", async () => {
        const reminder = await createReminder(foreignTaskId, callerId, foreignTenantId);
        const response = await app.request(`/api/reminders/${foreignTaskId}`, { headers });

        expect(response.status).toBe(404);
        expect(await ReminderEntity.findByPk(reminder.id)).not.toBeNull();
    });

    it("rejects reminder creation for a task outside the caller's tenant", async () => {
        const response = await submitReminder(foreignTaskId);

        expect(response.status).toBe(404);
        expect(await ReminderEntity.count({ where: { recordId: foreignTaskId, tenant } })).toBe(0);
    });

    it("rejects reminder creation for an ACL-hidden task", async () => {
        const response = await submitReminder(hiddenTaskId);

        expect(response.status).toBe(404);
        expect(await ReminderEntity.count({ where: { recordId: hiddenTaskId, tenant } })).toBe(0);
    });

    it("denies a visible non-owner creating or deleting a reminder on another user's task", async () => {
        const ownerReminder = await createReminder(sharedTaskId, otherLocalPersonId);

        const createResponse = await submitReminder(sharedTaskId);
        const deleteResponse = await app.request(`/api/reminders/${ownerReminder.id}`, {
            method: "DELETE",
            headers,
        });
        const ownerCreateResponse = await submitReminder(sharedTaskId, taskOwnerHeaders);
        const ownerCreateBody = await ownerCreateResponse.json();
        if (ownerCreateBody.data?.id) {
            fixtureRows.push({ entity: ReminderEntity, id: String(ownerCreateBody.data.id) });
        }
        expect(createResponse.status).toBe(403);
        expect(
            await ReminderEntity.count({ where: { recordId: sharedTaskId, tenant, createdBy: callerId } })
        ).toBe(0);
        expect(deleteResponse.status).toBe(403);
        expect((await ReminderEntity.findByPk(ownerReminder.id))?.get("deleted")).toBeNull();
        expect(ownerCreateResponse.status).toBe(200);

        const ownerDeleteResponse = await app.request(`/api/reminders/${ownerReminder.id}`, {
            method: "DELETE",
            headers: taskOwnerHeaders,
        });
        expect(ownerDeleteResponse.status).toBe(200);
    });

    it("does not let a caller delete a reminder on a task outside the caller's tenant", async () => {
        const reminder = await createReminder(foreignTaskId, callerId, foreignTenantId);
        const response = await app.request(`/api/reminders/${reminder.id}`, { method: "DELETE", headers });

        expect(response.status).toBe(404);
        expect((await ReminderEntity.findByPk(reminder.id))?.get("deleted")).toBeNull();
    });

    it("does not let a caller delete a reminder on an ACL-hidden task", async () => {
        const reminder = await createReminder(hiddenTaskId, callerId, tenant);
        const response = await app.request(`/api/reminders/${reminder.id}`, { method: "DELETE", headers });

        expect(response.status).toBe(404);
        expect((await ReminderEntity.findByPk(reminder.id))?.get("deleted")).toBeNull();
    });
});
