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

describe("project stack-order relationship authorization", () => {
    it("allows project viewers to reorder only stacks belonging to that project", async () => {
        const credentials = JSON.parse(readFileSync("testUser.json", "utf8")) as { email: string };
        const owner = await UserEntity.findOne({ where: { email: credentials.email } });
        expect(owner).not.toBeNull();
        const tenant = String(owner!.get("tenant"));
        const role = await RoleEntity.findOne({ where: { title: "User", tenant } });
        expect(role).not.toBeNull();

        const viewer = await UserEntity.create({
            email: `project-order-viewer-${randomUUID()}@example.test`,
            password: await bcrypt.hash(randomUUID(), 10),
            firstName: "Project Order",
            lastName: "Viewer",
            role: String(role!.get("id")),
            tenant,
            admin: false,
            real: false,
        });
        const viewerId = String(viewer.get("id"));
        fixtureRows.push({ entity: UserEntity, id: viewerId });
        rateLimitedUserIds.push(viewerId);
        const session = await issueSession(viewerId, tenant, 120);
        fixtureRows.push({ entity: SessionEntity, id: session.sid });
        const headers = { Authorization: `Bearer ${session.token}`, "Content-Type": "application/json" };

        const createProject = async (projectTenant: string, title: string) => {
            const id = randomUUID();
            await DocumentEntity.create({
                id,
                title,
                type: RECORDTYPE.PROJECT,
                order: 0,
                tenant: projectTenant,
                createdBy: String(owner!.get("id")),
                updatedBy: String(owner!.get("id")),
            });
            fixtureRows.push({ entity: DocumentEntity, id });
            await ProjectEntity.create({
                id,
                projectOwner: String(owner!.get("id")),
                tenant: projectTenant,
                createdBy: String(owner!.get("id")),
                updatedBy: String(owner!.get("id")),
            });
            fixtureRows.push({ entity: ProjectEntity, id });
            await PermissionEntity.create({
                id,
                owner: String(owner!.get("id")),
                isPublic: projectTenant === tenant,
                visibleUsers: [],
                visibleRoles: [],
                tenant: projectTenant,
                createdBy: String(owner!.get("id")),
                updatedBy: String(owner!.get("id")),
            });
            fixtureRows.push({ entity: PermissionEntity, id });
            return id;
        };

        const createStack = async (project: string, stackTenant: string, title: string) => {
            const id = randomUUID();
            await StackEntity.create({
                id,
                title,
                project,
                tenant: stackTenant,
                createdBy: String(owner!.get("id")),
                updatedBy: String(owner!.get("id")),
            });
            fixtureRows.push({ entity: StackEntity, id });
            return id;
        };

        const projectId = await createProject(tenant, "Project order authorization target");
        const localStackA = await createStack(projectId, tenant, "Local stack A");
        const localStackB = await createStack(projectId, tenant, "Local stack B");
        const otherProjectId = await createProject(tenant, "Same-tenant project order source");
        const sameTenantForeignStack = await createStack(otherProjectId, tenant, "Other project stack");
        const foreignTenant = await TenantEntity.create({
            title: `Project order authorization ${randomUUID()}`,
            description: "temporary security fixture",
            expiry: new Date(Date.now() + 60 * 60 * 1000),
        });
        const foreignTenantId = String(foreignTenant.get("id"));
        fixtureRows.push({ entity: TenantEntity, id: foreignTenantId });
        const foreignProjectId = await createProject(foreignTenantId, "Foreign-tenant project order source");
        const foreignTenantStack = await createStack(
            foreignProjectId,
            foreignTenantId,
            "Foreign tenant stack"
        );

        const patchOrder = (stacksOrder: string[]) =>
            app.request(`/api/projects/${projectId}`, {
                method: "PATCH",
                headers,
                body: JSON.stringify({ stacksOrder }),
            });

        const validOrder = await patchOrder([localStackB, localStackA]);
        expect(validOrder.status).toBe(200);
        expect((await ProjectEntity.findByPk(projectId))?.get("stacksOrder")).toEqual([
            localStackB,
            localStackA,
        ]);

        const sameTenantForeignOrder = await patchOrder([localStackA, sameTenantForeignStack]);
        expect(sameTenantForeignOrder.status).toBe(404);
        const crossTenantForeignOrder = await patchOrder([localStackA, foreignTenantStack]);
        expect(crossTenantForeignOrder.status).toBe(404);
        const malformedOrder = await patchOrder(["not-a-uuid"]);
        expect(malformedOrder.status).toBe(400);
        expect((await ProjectEntity.findByPk(projectId))?.get("stacksOrder")).toEqual([
            localStackB,
            localStackA,
        ]);
    });
});
