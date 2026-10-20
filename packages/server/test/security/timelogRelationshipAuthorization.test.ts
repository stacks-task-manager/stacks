// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
    DocumentEntity,
    PermissionEntity,
    ProjectEntity,
    RoleEntity,
    StackEntity,
    TaskEntity,
    TenantEntity,
    TimelogEntity,
    UserEntity,
} from "@stacks/db";
import { RECORDTYPE } from "@stacks/types";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import app from "../../src/index";
import { getAuthToken } from "../helpers/authHelper";

const fixtureRows: Array<{ entity: any; id: string }> = [];
let headers: Record<string, string>;
let callerId: string;
let tenant: string;
let foreignPersonId: string;
let otherLocalPersonId: string;
let localProjectId: string;
let otherLocalProjectId: string;
let localTaskId: string;
let secondLocalTaskId: string;
let foreignProjectId: string;
let foreignTaskId: string;
let foreignTimelogId: string;
let foreignTimelogMarker: string;
let localTimelogId: string;

async function createProjectAndTask(input: {
    title: string;
    tenant: string;
    ownerId: string;
    withTask: boolean;
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
        visibleUsers: [],
        visibleRoles: [],
        tenant: input.tenant,
        createdBy: input.ownerId,
        updatedBy: input.ownerId,
    });
    fixtureRows.push({ entity: PermissionEntity, id: String(projectPermission.id) });

    if (!input.withTask) return { projectId: id };

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
        visibleUsers: [],
        visibleRoles: [],
        tenant: input.tenant,
        createdBy: input.ownerId,
        updatedBy: input.ownerId,
    });
    fixtureRows.push({ entity: PermissionEntity, id: String(taskPermission.id) });

    return { projectId: id, taskId };
}

async function submitTimelog(input: { person?: string; project?: string }) {
    const description = `Timelog relationship fixture ${randomUUID()}`;
    const response = await app.request("/api/timelogs", {
        method: "POST",
        headers,
        body: JSON.stringify({
            person: input.person ?? callerId,
            project: input.project ?? localProjectId,
            task: localTaskId,
            date: new Date().toISOString(),
            description,
            duration: 3600,
        }),
    });
    const body = await response.json();
    if (body.data?.id) fixtureRows.push({ entity: TimelogEntity, id: body.data.id });
    return { response, body };
}

describe("timelog relationship authorization", () => {
    beforeAll(async () => {
        const { email } = JSON.parse(readFileSync("testUser.json", "utf8")) as { email: string };
        const caller = await UserEntity.findOne({ where: { email } });
        expect(caller).not.toBeNull();
        callerId = String(caller!.id);
        tenant = String(caller!.get("tenant"));
        expect(caller!.get("admin")).toBe(false);
        headers = {
            Authorization: `Bearer ${await getAuthToken()}`,
            "Content-Type": "application/json",
        };

        const otherLocalPerson = await UserEntity.create({
            email: `other-local-timelog-${randomUUID()}@example.test`,
            password: "test-password",
            firstName: "Other",
            lastName: "Local User",
            role: String(caller!.get("role")),
            tenant,
            real: false,
        });
        otherLocalPersonId = String(otherLocalPerson.get("id"));
        fixtureRows.push({ entity: UserEntity, id: otherLocalPersonId });

        const foreignTenant = await TenantEntity.create({
            title: `Foreign timelog tenant ${randomUUID()}`,
            description: "temporary security fixture",
            expiry: new Date(Date.now() + 60 * 60 * 1000),
        });
        const foreignTenantId = String(foreignTenant.get("id"));
        fixtureRows.push({ entity: TenantEntity, id: foreignTenantId });

        const foreignRole = await RoleEntity.create({
            title: `Foreign timelog role ${randomUUID()}`,
            description: "temporary security fixture",
            access: {},
            disabled: false,
            tenant: foreignTenantId,
            createdBy: callerId,
            updatedBy: callerId,
        });
        const foreignRoleId = String(foreignRole.get("id"));
        fixtureRows.push({ entity: RoleEntity, id: foreignRoleId });

        const foreignUser = await UserEntity.create({
            email: `foreign-timelog-${randomUUID()}@example.test`,
            password: "test-password",
            firstName: "Foreign",
            lastName: "Timelog User",
            role: foreignRoleId,
            tenant: foreignTenantId,
            real: false,
        });
        foreignPersonId = String(foreignUser.get("id"));
        fixtureRows.push({ entity: UserEntity, id: foreignPersonId });

        const local = await createProjectAndTask({
            title: "Local timelog project",
            tenant,
            ownerId: callerId,
            withTask: true,
        });
        localProjectId = local.projectId;
        localTaskId = local.taskId!;

        const originalTask = await TaskEntity.findByPk(localTaskId);
        secondLocalTaskId = randomUUID();
        const secondTask = await TaskEntity.create({
            id: secondLocalTaskId,
            title: "Second local timelog task",
            project: localProjectId,
            stack: String(originalTask!.get("stack")),
            assignees: [callerId],
            tenant,
            createdBy: callerId,
            updatedBy: callerId,
        });
        fixtureRows.push({ entity: TaskEntity, id: String(secondTask.id) });
        const secondTaskPermission = await PermissionEntity.create({
            id: secondLocalTaskId,
            owner: callerId,
            isPublic: false,
            visibleUsers: [],
            visibleRoles: [],
            tenant,
            createdBy: callerId,
            updatedBy: callerId,
        });
        fixtureRows.push({ entity: PermissionEntity, id: String(secondTaskPermission.id) });

        const otherLocal = await createProjectAndTask({
            title: "Other local timelog project",
            tenant,
            ownerId: callerId,
            withTask: false,
        });
        otherLocalProjectId = otherLocal.projectId;

        const foreign = await createProjectAndTask({
            title: "Foreign timelog project",
            tenant: foreignTenantId,
            ownerId: foreignPersonId,
            withTask: true,
        });
        foreignProjectId = foreign.projectId;
        foreignTaskId = foreign.taskId!;

        foreignTimelogMarker = `Foreign timelog fixture ${randomUUID()}`;
        const foreignTimelog = await TimelogEntity.create({
            description: foreignTimelogMarker,
            date: new Date(),
            duration: 3600,
            person: foreignPersonId,
            project: foreignProjectId,
            task: foreignTaskId,
            tenant: foreignTenantId,
            createdBy: foreignPersonId,
            updatedBy: foreignPersonId,
        });
        foreignTimelogId = String(foreignTimelog.id);
        fixtureRows.push({ entity: TimelogEntity, id: foreignTimelogId });
    });

    afterAll(async () => {
        const cleanupErrors: unknown[] = [];
        for (const { entity, id } of fixtureRows.reverse()) {
            try {
                await entity.destroy({ where: { id }, force: true });
            } catch (error) {
                cleanupErrors.push(error);
            }
        }
        fixtureRows.length = 0;
        if (cleanupErrors.length) {
            throw new AggregateError(cleanupErrors, "Failed to clean up timelog relationship fixtures");
        }
    });

    it("allows a same-tenant person, project, and task relationship", async () => {
        const { response, body } = await submitTimelog({});

        expect(response.status).toBe(200);
        expect(body.data).toMatchObject({ person: callerId, project: localProjectId, task: localTaskId });
        localTimelogId = body.data.id;
    });

    it("returns own task logs while hiding an existing foreign-tenant task log", async () => {
        const ownResponse = await app.request(`/api/timelogs?task=${localTaskId}`, { headers });
        const ownBody = await ownResponse.json();

        expect(ownResponse.status).toBe(200);
        expect(ownBody.data.map((entry: { id: string }) => entry.id)).toContain(localTimelogId);

        for (const query of [`project=${foreignProjectId}`, `task=${foreignTaskId}`]) {
            const response = await app.request(`/api/timelogs?${query}`, { headers });
            const body = await response.json();

            expect(response.status).toBe(404);
            expect(JSON.stringify(body)).not.toContain(foreignTimelogMarker);
        }
    });

    it("rejects a cross-tenant person reference on create", async () => {
        const { response } = await submitTimelog({ person: foreignPersonId });

        expect(response.status).toBe(404);
        expect(await TimelogEntity.count({ where: { person: foreignPersonId, task: localTaskId } })).toBe(0);
    });

    it("prevents a non-admin from creating a timelog for another same-tenant person", async () => {
        const { response } = await submitTimelog({ person: otherLocalPersonId });

        expect(response.status).toBe(403);
        expect(await TimelogEntity.count({ where: { person: otherLocalPersonId, task: localTaskId } })).toBe(
            0
        );
    });

    it("rejects a cross-tenant project reference on create", async () => {
        const { response } = await submitTimelog({ project: foreignProjectId });

        expect(response.status).toBe(404);
        expect(await TimelogEntity.count({ where: { project: foreignProjectId, task: localTaskId } })).toBe(
            0
        );
    });

    it("rejects a task paired with a different same-tenant project", async () => {
        const { response } = await submitTimelog({ project: otherLocalProjectId });

        expect(response.status).toBe(404);
        expect(
            await TimelogEntity.count({ where: { project: otherLocalProjectId, task: localTaskId } })
        ).toBe(0);
    });

    it("recalculates both task totals when moving an owned timelog", async () => {
        const created = await submitTimelog({});
        const response = await app.request(`/api/timelogs/${created.body.data.id}`, {
            method: "PATCH",
            headers,
            body: JSON.stringify({
                person: callerId,
                project: localProjectId,
                task: secondLocalTaskId,
                date: new Date().toISOString(),
                description: "Move within the same project",
                duration: 3600,
            }),
        });

        expect(response.status).toBe(200);
        expect((await TimelogEntity.findByPk(created.body.data.id))?.get("task")).toBe(secondLocalTaskId);
        expect((await TaskEntity.findByPk(secondLocalTaskId))?.get("timeSpent")).toBe(3600);
        // The same-tenant control above leaves its own 3600-second log on the original task.
        expect((await TaskEntity.findByPk(localTaskId))?.get("timeSpent")).toBe(3600);
    });

    it("rejects reassigning an owned timelog to a foreign person", async () => {
        const created = await submitTimelog({});
        const response = await app.request(`/api/timelogs/${created.body.data.id}`, {
            method: "PATCH",
            headers,
            body: JSON.stringify({
                person: foreignPersonId,
                project: localProjectId,
                task: localTaskId,
                date: new Date().toISOString(),
                description: "Attempted foreign reassignment",
                duration: 3600,
            }),
        });

        expect(response.status).toBe(404);
        expect((await TimelogEntity.findByPk(created.body.data.id))?.get("person")).toBe(callerId);
    });

    it("prevents a non-admin from reassigning an owned timelog to another same-tenant person", async () => {
        const created = await submitTimelog({});
        const response = await app.request(`/api/timelogs/${created.body.data.id}`, {
            method: "PATCH",
            headers,
            body: JSON.stringify({
                person: otherLocalPersonId,
                project: localProjectId,
                task: localTaskId,
                date: new Date().toISOString(),
                description: "Attempted same-tenant reassignment",
                duration: 3600,
            }),
        });

        expect(response.status).toBe(403);
        expect((await TimelogEntity.findByPk(created.body.data.id))?.get("person")).toBe(callerId);
    });

    it("rejects moving an owned timelog to a foreign project", async () => {
        const created = await submitTimelog({});
        const response = await app.request(`/api/timelogs/${created.body.data.id}`, {
            method: "PATCH",
            headers,
            body: JSON.stringify({
                person: callerId,
                project: foreignProjectId,
                task: localTaskId,
                date: new Date().toISOString(),
                description: "Attempted foreign project move",
                duration: 3600,
            }),
        });

        expect(response.status).toBe(404);
        expect((await TimelogEntity.findByPk(created.body.data.id))?.get("project")).toBe(localProjectId);
    });

    it("limits another person's task log to project approvers", async () => {
        const otherLog = await TimelogEntity.create({
            description: `Approver visibility fixture ${randomUUID()}`,
            date: new Date(),
            duration: 1800,
            person: otherLocalPersonId,
            project: localProjectId,
            task: localTaskId,
            tenant,
            createdBy: otherLocalPersonId,
            updatedBy: otherLocalPersonId,
        });
        fixtureRows.push({ entity: TimelogEntity, id: String(otherLog.id) });

        const beforeApproval = await app.request(`/api/timelogs?project=${localProjectId}&start=2020-01-01`, {
            headers,
        });
        const beforeApprovalBody = await beforeApproval.json();
        expect(beforeApproval.status).toBe(200);
        expect(beforeApprovalBody.data.map((entry: { id: string }) => entry.id)).not.toContain(
            String(otherLog.id)
        );

        await ProjectEntity.update({ approvers: [callerId] }, { where: { id: localProjectId, tenant } });

        const afterApproval = await app.request(`/api/timelogs?task=${localTaskId}&end=2099-12-31`, {
            headers,
        });
        const afterApprovalBody = await afterApproval.json();
        expect(afterApproval.status).toBe(200);
        expect(afterApprovalBody.data.map((entry: { id: string }) => entry.id)).toContain(
            String(otherLog.id)
        );
    });

    it("does not let a project approver delete another person's timelog", async () => {
        const marker = `Approver cannot delete fixture ${randomUUID()}`;
        const otherLog = await TimelogEntity.create({
            description: marker,
            date: new Date(),
            duration: 1800,
            person: otherLocalPersonId,
            project: localProjectId,
            task: localTaskId,
            tenant,
            createdBy: otherLocalPersonId,
            updatedBy: otherLocalPersonId,
        });
        const otherLogId = String(otherLog.id);
        fixtureRows.push({ entity: TimelogEntity, id: otherLogId });

        const response = await app.request(`/api/timelogs/${otherLogId}`, {
            method: "DELETE",
            headers,
        });
        const body = await response.json();

        expect(response.status).toBe(403);
        expect(JSON.stringify(body)).not.toContain(marker);
        const persisted = await TimelogEntity.findByPk(otherLogId);
        expect(persisted?.get("deleted")).toBeNull();
        expect(persisted?.get("person")).toBe(otherLocalPersonId);
    });

    it("hides and preserves a foreign-tenant timelog on direct delete", async () => {
        const response = await app.request(`/api/timelogs/${foreignTimelogId}`, {
            method: "DELETE",
            headers,
        });
        const body = await response.json();

        expect(response.status).toBe(404);
        expect(JSON.stringify(body)).not.toContain(foreignTimelogMarker);
        const persisted = await TimelogEntity.findByPk(foreignTimelogId);
        expect(persisted?.get("deleted")).toBeNull();
    });

    it("allows the timelog owner to delete their own pending entry", async () => {
        const created = await submitTimelog({});
        const timelogId = String(created.body.data.id);
        const response = await app.request(`/api/timelogs/${timelogId}`, {
            method: "DELETE",
            headers,
        });

        expect(response.status).toBe(200);
        expect((await TimelogEntity.findByPk(timelogId))?.get("deleted")).not.toBeNull();
    });
});
