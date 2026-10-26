// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { afterEach, describe, expect, it } from "vitest";
import {
    RateLimitCounterEntity,
    RoleEntity,
    SessionEntity,
    TenantEntity,
    TagEntity,
    UserEntity,
} from "@stacks/db";
import { ROLE_SECTIONS } from "@stacks/types";
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

describe("tag role authorization", () => {
    it("requires the matching section write role for tag creation and updates", async () => {
        const credentials = JSON.parse(readFileSync("testUser.json", "utf8")) as { email: string };
        const seededUser = await UserEntity.findOne({ where: { email: credentials.email } });
        expect(seededUser).not.toBeNull();
        const tenant = String(seededUser!.get("tenant"));
        const actorId = String(seededUser!.get("id"));

        const createRole = async (label: string, access: Record<string, unknown>) => {
            const role = await RoleEntity.create({
                title: `Tag authorization ${label} ${randomUUID()}`,
                description: "temporary security fixture",
                access,
                disabled: false,
                tenant,
                createdBy: actorId,
                updatedBy: actorId,
            });
            const id = String(role.get("id"));
            fixtureRows.push({ entity: RoleEntity, id });
            return id;
        };
        const deniedRole = await createRole("denied", {});
        const peopleWriterRole = await createRole("people writer", {
            [ROLE_SECTIONS.PEOPLE]: { read: true, write: true },
        });
        const projectSettingsWriterRole = await createRole("project settings writer", {
            [ROLE_SECTIONS.PROJECT_SETTINGS]: { read: true, write: true },
        });

        const createUser = async (role: string) => {
            const user = await UserEntity.create({
                email: `tag-auth-${randomUUID()}@example.test`,
                password: await bcrypt.hash(randomUUID(), 10),
                firstName: "Tag",
                lastName: "Authorization",
                role,
                tenant,
                admin: false,
                real: false,
            });
            const id = String(user.get("id"));
            fixtureRows.push({ entity: UserEntity, id });
            rateLimitedUserIds.push(id);
            const session = await issueSession(id, tenant, 120);
            fixtureRows.push({ entity: SessionEntity, id: session.sid });
            return { Authorization: `Bearer ${session.token}`, "Content-Type": "application/json" };
        };
        const deniedHeaders = await createUser(deniedRole);
        const writerHeaders = await createUser(peopleWriterRole);
        const projectWriterHeaders = await createUser(projectSettingsWriterRole);
        const tagBody = (title: string, section: "people" | "projects" = "people") =>
            JSON.stringify({ title, color: "#123456", section, type: "tag" });

        const foreignTenant = await TenantEntity.create({
            title: `Tag role tenant ${randomUUID()}`,
            description: "temporary security fixture",
            expiry: new Date(Date.now() + 60 * 60 * 1000),
        });
        const foreignTenantId = String(foreignTenant.get("id"));
        fixtureRows.push({ entity: TenantEntity, id: foreignTenantId });
        const foreignRole = await RoleEntity.create({
            title: `Tag foreign role ${randomUUID()}`,
            description: "temporary security fixture",
            access: {},
            disabled: false,
            tenant: foreignTenantId,
            createdBy: actorId,
            updatedBy: actorId,
        });
        const foreignRoleId = String(foreignRole.get("id"));
        fixtureRows.push({ entity: RoleEntity, id: foreignRoleId });
        const foreignUser = await UserEntity.create({
            email: `tag-foreign-${randomUUID()}@example.test`,
            password: await bcrypt.hash(randomUUID(), 10),
            firstName: "Foreign Tag",
            lastName: "Owner",
            role: foreignRoleId,
            tenant: foreignTenantId,
            admin: false,
            real: false,
        });
        fixtureRows.push({ entity: UserEntity, id: String(foreignUser.get("id")) });
        const foreignTag = await TagEntity.create({
            title: `Foreign tag ${randomUUID()}`,
            color: "#123456",
            section: "people",
            type: "tag",
            tenant: foreignTenantId,
            createdBy: String(foreignUser.get("id")),
            updatedBy: String(foreignUser.get("id")),
        });
        fixtureRows.push({ entity: TagEntity, id: String(foreignTag.get("id")) });

        const deniedCreate = await app.request("/api/tags", {
            method: "POST",
            headers: deniedHeaders,
            body: tagBody(`Denied ${randomUUID()}`),
        });
        expect(deniedCreate.status).toBe(403);

        const allowedCreate = await app.request("/api/tags", {
            method: "POST",
            headers: writerHeaders,
            body: tagBody(`Allowed ${randomUUID()}`),
        });
        expect(allowedCreate.status).toBe(200);
        const created = (await allowedCreate.json()).data as { id: string };
        fixtureRows.push({ entity: TagEntity, id: created.id });

        const allowedProjectCreate = await app.request("/api/tags", {
            method: "POST",
            headers: projectWriterHeaders,
            body: tagBody(`Allowed project ${randomUUID()}`, "projects"),
        });
        expect(allowedProjectCreate.status).toBe(200);
        const projectTag = (await allowedProjectCreate.json()).data as { id: string };
        fixtureRows.push({ entity: TagEntity, id: projectTag.id });

        const deniedUpdate = await app.request(`/api/tags/${created.id}`, {
            method: "PATCH",
            headers: deniedHeaders,
            body: tagBody(`Changed ${randomUUID()}`),
        });
        expect(deniedUpdate.status).toBe(403);
        const persisted = await TagEntity.findByPk(created.id);
        expect(persisted?.get("title")).toContain("Allowed");

        const peopleWriterEdit = await app.request(`/api/tags/${created.id}`, {
            method: "PATCH",
            headers: writerHeaders,
            body: tagBody(`Allowed people update ${randomUUID()}`),
        });
        expect(peopleWriterEdit.status).toBe(200);
        const peopleWriterToProjectMove = await app.request(`/api/tags/${created.id}`, {
            method: "PATCH",
            headers: writerHeaders,
            body: tagBody("forged people-to-project move", "projects"),
        });
        expect(peopleWriterToProjectMove.status).toBe(403);
        expect((await TagEntity.findByPk(created.id))?.get("section")).toBe("people");

        const peopleWriterProjectEdit = await app.request(`/api/tags/${projectTag.id}`, {
            method: "PATCH",
            headers: writerHeaders,
            body: tagBody("forged project edit", "projects"),
        });
        expect(peopleWriterProjectEdit.status).toBe(403);
        const projectWriterToPeopleMove = await app.request(`/api/tags/${projectTag.id}`, {
            method: "PATCH",
            headers: projectWriterHeaders,
            body: tagBody("forged project-to-people move"),
        });
        expect(projectWriterToPeopleMove.status).toBe(403);
        expect((await TagEntity.findByPk(projectTag.id))?.get("section")).toBe("projects");

        const foreignUpdate = await app.request(`/api/tags/${foreignTag.get("id")}`, {
            method: "PATCH",
            headers: writerHeaders,
            body: tagBody(`Foreign edit attempt ${randomUUID()}`),
        });
        expect(foreignUpdate.status).toBe(404);
        expect((await TagEntity.findByPk(String(foreignTag.get("id"))))?.get("title")).toBe(
            foreignTag.get("title")
        );
    });
});
