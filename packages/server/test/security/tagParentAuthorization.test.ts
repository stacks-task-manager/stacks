// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { afterEach, describe, expect, it } from "vitest";
import {
    DocumentEntity,
    PermissionEntity,
    ProjectEntity,
    RoleEntity,
    TagEntity,
    UserEntity,
} from "@stacks/db";
import { RECORDTYPE, ROLE_SECTIONS } from "@stacks/types";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import app from "../../src/index";
import { getAuthToken } from "../helpers/authHelper";

const fixtureRows: Array<{ entity: any; id: string }> = [];
let roleAccessRestore: { roleId: string; access: unknown } | undefined;

afterEach(async () => {
    if (roleAccessRestore) {
        await RoleEntity.update(
            { access: roleAccessRestore.access },
            { where: { id: roleAccessRestore.roleId } }
        );
        roleAccessRestore = undefined;
    }
    for (const { entity, id } of fixtureRows.reverse()) {
        await entity.destroy({ where: { id }, force: true });
    }
    fixtureRows.length = 0;
});

describe("project tag parent authorization", () => {
    it("rejects foreign project parents for tag create and update while allowing local projects", async () => {
        const credentials = JSON.parse(readFileSync("testUser.json", "utf8")) as { email: string };
        const user = await UserEntity.findOne({ where: { email: credentials.email } });
        expect(user).not.toBeNull();
        const userId = String(user!.id);
        const tenant = String(user!.get("tenant"));
        const role = await RoleEntity.findOne({ where: { id: user!.get("role"), tenant } });
        expect(role).not.toBeNull();
        roleAccessRestore = {
            roleId: String(role!.get("id")),
            access: role!.get("access"),
        };
        await role!.update({
            access: {
                ...(role!.get("access") as Record<string, unknown>),
                [ROLE_SECTIONS.PROJECT_SETTINGS]: { read: true, write: true },
                [ROLE_SECTIONS.PEOPLE]: { read: true, write: true },
            },
        });
        const headers = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await getAuthToken()}`,
        };

        const createProject = async (projectTenant: string) => {
            const id = randomUUID();
            await DocumentEntity.create({
                id,
                title: "Tag parent authorization fixture",
                type: RECORDTYPE.PROJECT,
                order: 0,
                tenant: projectTenant,
                createdBy: userId,
                updatedBy: userId,
            });
            fixtureRows.push({ entity: DocumentEntity, id });
            await ProjectEntity.create({
                id,
                projectOwner: userId,
                tenant: projectTenant,
                createdBy: userId,
                updatedBy: userId,
            });
            fixtureRows.push({ entity: ProjectEntity, id });
            await PermissionEntity.create({
                id,
                owner: userId,
                isPublic: true,
                visibleUsers: [],
                visibleRoles: [],
                tenant: projectTenant,
                createdBy: userId,
                updatedBy: userId,
            });
            fixtureRows.push({ entity: PermissionEntity, id });
            return id;
        };

        const foreignProject = await createProject(randomUUID());
        const localProject = await createProject(tenant);
        const postTag = async (title: string, parent: string) =>
            app.request("/api/tags", {
                method: "POST",
                headers,
                body: JSON.stringify({ title, color: "#123456", section: "projects", type: "tag", parent }),
            });

        const createDenied = await postTag(`Foreign parent ${randomUUID()}`, foreignProject);
        expect(createDenied.status).toBe(404);
        const createWrongSection = await app.request("/api/tags", {
            method: "POST",
            headers,
            body: JSON.stringify({
                title: `People tag parent ${randomUUID()}`,
                color: "#123456",
                section: "people",
                type: "tag",
                parent: foreignProject,
            }),
        });
        expect(createWrongSection.status).toBe(404);

        const createAllowed = await postTag(`Local parent ${randomUUID()}`, localProject);
        expect(createAllowed.status).toBe(200);
        const created = (await createAllowed.json()).data as { id: string };
        fixtureRows.push({ entity: TagEntity, id: created.id });

        const suppliedTagId = randomUUID();
        const forgedTenant = randomUUID();
        const massAssignmentAttempt = await app.request("/api/tags", {
            method: "POST",
            headers,
            body: JSON.stringify({
                title: `Mass assignment ${randomUUID()}`,
                color: "#123456",
                section: "people",
                type: "tag",
                id: suppliedTagId,
                tenant: forgedTenant,
                createdBy: forgedTenant,
                updatedBy: forgedTenant,
            }),
        });
        expect(massAssignmentAttempt.status).toBe(200);
        const massAssignedTag = (await massAssignmentAttempt.json()).data as { id: string };
        fixtureRows.push({ entity: TagEntity, id: massAssignedTag.id });
        expect(massAssignedTag.id).not.toBe(suppliedTagId);
        const persistedMassAssignmentTag = await TagEntity.findByPk(massAssignedTag.id);
        expect(persistedMassAssignmentTag?.get("tenant")).toBe(tenant);
        expect(persistedMassAssignmentTag?.get("createdBy")).toBe(userId);
        expect(persistedMassAssignmentTag?.get("updatedBy")).toBe(userId);

        const updateWrongSection = await app.request(`/api/tags/${created.id}`, {
            method: "PATCH",
            headers,
            body: JSON.stringify({
                title: `People parent ${randomUUID()}`,
                color: "#123456",
                section: "people",
                type: "tag",
                parent: foreignProject,
            }),
        });
        expect(updateWrongSection.status).toBe(404);

        const updateDenied = await app.request(`/api/tags/${created.id}`, {
            method: "PATCH",
            headers,
            body: JSON.stringify({
                title: `Local parent ${randomUUID()}`,
                color: "#123456",
                section: "projects",
                type: "tag",
                parent: foreignProject,
            }),
        });
        expect(updateDenied.status).toBe(404);
        const persisted = await TagEntity.findOne({ where: { id: created.id, tenant } });
        expect(persisted?.get("parent")).toBe(localProject);
    });
});
