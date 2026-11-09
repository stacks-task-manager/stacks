// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { afterAll, describe, expect, it } from "vitest";
import {
    DocumentEntity,
    PermissionEntity,
    ProjectEntity,
    RoleEntity,
    SessionEntity,
    StackEntity,
    TaskEntity,
    UserEntity,
} from "@stacks/db";
import { RECORDTYPE, REPORT_TYPE, ROLE_SECTIONS } from "@stacks/types";
import * as bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import app from "../../src/index";
import { issueSession } from "../../src/services/sessions";

const fixtureRows: Array<{ entity: any; id: string }> = [];

async function createProjectFixture(input: { id: string; title: string; ownerId: string; tenant: string }) {
    const { id, title, ownerId, tenant } = input;
    const createdBy = ownerId;
    const document = await DocumentEntity.create({
        id,
        title,
        type: RECORDTYPE.PROJECT,
        order: 0,
        tenant,
        createdBy,
        updatedBy: createdBy,
    });
    fixtureRows.push({ entity: DocumentEntity, id: String(document.id) });

    const project = await ProjectEntity.create({
        id,
        projectOwner: ownerId,
        tenant,
        createdBy,
        updatedBy: createdBy,
    });
    fixtureRows.push({ entity: ProjectEntity, id: String(project.id) });

    const permission = await PermissionEntity.create({
        id,
        owner: ownerId,
        isPublic: false,
        visibleUsers: [],
        visibleRoles: [],
        tenant,
        createdBy,
        updatedBy: createdBy,
    });
    fixtureRows.push({ entity: PermissionEntity, id: String(permission.id) });

    const stackId = randomUUID();
    const stack = await StackEntity.create({
        id: stackId,
        title: `${title} stack`,
        project: id,
        tenant,
        createdBy,
        updatedBy: createdBy,
    });
    fixtureRows.push({ entity: StackEntity, id: String(stack.id) });

    return { projectId: id, stackId };
}

async function createAssignedTask(input: {
    projectId: string;
    stackId: string;
    tenant: string;
    userId: string;
    title: string;
}) {
    const id = randomUUID();
    const task = await TaskEntity.create({
        id,
        title: input.title,
        project: input.projectId,
        stack: input.stackId,
        assignees: [input.userId],
        done: false,
        tenant: input.tenant,
        createdBy: input.userId,
        updatedBy: input.userId,
    });
    fixtureRows.push({ entity: TaskEntity, id: String(task.id) });
}

describe("report project ACL isolation", () => {
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
            throw new AggregateError(cleanupErrors, "Failed to clean up report ACL fixtures");
        }
    });

    it("excludes task counts from projects hidden by the viewer's project ACL", async () => {
        const { email } = JSON.parse(readFileSync("testUser.json", "utf8")) as { email: string };
        const seededUser = await UserEntity.findOne({ where: { email } });
        expect(seededUser).not.toBeNull();
        const userId = String(seededUser!.id);
        const tenant = String(seededUser!.get("tenant"));

        const role = await RoleEntity.create({
            title: `Report reader ${randomUUID()}`,
            description: "Security fixture",
            access: { [ROLE_SECTIONS.REPORTS]: { read: true } },
            admin: false,
            tenant,
            createdBy: userId,
            updatedBy: userId,
        });
        fixtureRows.push({ entity: RoleEntity, id: String(role.id) });

        const viewer = await UserEntity.create({
            email: `${randomUUID()}@example.test`,
            password: await bcrypt.hash(randomUUID(), 10),
            firstName: "Report",
            lastName: "Viewer",
            role: String(role.id),
            tenant,
            admin: false,
            real: false,
        });
        const viewerId = String(viewer.id);
        fixtureRows.push({ entity: UserEntity, id: viewerId });

        const session = await issueSession(viewerId, tenant, 120);
        fixtureRows.push({ entity: SessionEntity, id: session.sid });

        const visible = await createProjectFixture({
            id: randomUUID(),
            title: "Report-visible project",
            ownerId: viewerId,
            tenant,
        });
        const hidden = await createProjectFixture({
            id: randomUUID(),
            title: "Report-hidden project",
            ownerId: userId,
            tenant,
        });

        await createAssignedTask({
            projectId: visible.projectId,
            stackId: visible.stackId,
            tenant,
            userId: viewerId,
            title: "Visible task",
        });
        await createAssignedTask({
            projectId: hidden.projectId,
            stackId: hidden.stackId,
            tenant,
            userId: viewerId,
            title: "Hidden task",
        });

        const response = await app.request(`/api/reports/${REPORT_TYPE.USER_WORKLOAD_DISTRIBUTION}`, {
            headers: { Authorization: `Bearer ${session.token}` },
        });

        expect(response.status).toBe(200);
        const body = await response.json();
        const viewerReport = body.data.data.find((row: { person: string }) => row.person === viewerId);
        expect(viewerReport.totalTasks).toBe(1);
        expect(viewerReport.projectsList).toEqual([
            { id: visible.projectId, title: "Report-visible project" },
        ]);
    });

    it("denies callers without report read access to both catalog and report data", async () => {
        const { email } = JSON.parse(readFileSync("testUser.json", "utf8")) as { email: string };
        const seededUser = await UserEntity.findOne({ where: { email } });
        expect(seededUser).not.toBeNull();
        const tenant = String(seededUser!.get("tenant"));
        const userId = String(seededUser!.id);

        const role = await RoleEntity.create({
            title: `No report access ${randomUUID()}`,
            description: "Security fixture",
            access: {},
            admin: false,
            tenant,
            createdBy: userId,
            updatedBy: userId,
        });
        fixtureRows.push({ entity: RoleEntity, id: String(role.id) });

        const viewer = await UserEntity.create({
            email: `${randomUUID()}@example.test`,
            password: await bcrypt.hash(randomUUID(), 10),
            firstName: "Restricted",
            lastName: "Report Viewer",
            role: String(role.id),
            tenant,
            admin: false,
            real: false,
        });
        const viewerId = String(viewer.id);
        fixtureRows.push({ entity: UserEntity, id: viewerId });

        const session = await issueSession(viewerId, tenant, 120);
        fixtureRows.push({ entity: SessionEntity, id: session.sid });
        const headers = { Authorization: `Bearer ${session.token}` };

        const [catalog, report] = await Promise.all([
            app.request("/api/reports", { headers }),
            app.request(`/api/reports/${REPORT_TYPE.USER_WORKLOAD_DISTRIBUTION}`, { headers }),
        ]);

        expect(catalog.status).toBe(403);
        expect(report.status).toBe(403);
    });
});
