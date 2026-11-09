// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
    DocumentEntity,
    NotepadEntity,
    PermissionEntity,
    RoleEntity,
    SessionEntity,
    TenantEntity,
    UserEntity,
} from "@stacks/db";
import { RECORDTYPE } from "@stacks/types";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import app from "../../src/index";
import { issueSession } from "../../src/services/sessions";

const fixtureRows: Array<{ entity: any; id: string }> = [];
let ownerHeaders: Record<string, string>;
let viewerHeaders: Record<string, string>;
let foreignHeaders: Record<string, string>;
let tenant: string;
let notepadId: string;

describe("notepad authorization", () => {
    beforeAll(async () => {
        const { email } = JSON.parse(readFileSync("testUser.json", "utf8")) as { email: string };
        const baseUser = await UserEntity.findOne({ where: { email } });
        expect(baseUser).not.toBeNull();
        tenant = String(baseUser!.get("tenant"));
        const role = String(baseUser!.get("role"));

        const createUser = async (label: string, userTenant: string, userRole = role) => {
            const user = await UserEntity.create({
                email: `${label}-notepad-${randomUUID()}@example.test`,
                password: "test-password",
                firstName: label,
                lastName: "Notepad Authorization Test",
                role: userRole,
                tenant: userTenant,
                admin: false,
                real: false,
            });
            const id = String(user.get("id"));
            fixtureRows.push({ entity: UserEntity, id });
            const session = await issueSession(id, userTenant, 120);
            fixtureRows.push({ entity: SessionEntity, id: session.sid });
            return { id, headers: { Authorization: `Bearer ${session.token}` } };
        };

        const owner = await createUser("owner", tenant);
        const viewer = await createUser("viewer", tenant);
        ownerHeaders = owner.headers;
        viewerHeaders = viewer.headers;

        const foreignTenantEntity = await TenantEntity.create({
            title: `Foreign notepad ${randomUUID()}`,
            description: "temporary security fixture",
            expiry: new Date(Date.now() + 60 * 60 * 1000),
        });
        const foreignTenant = String(foreignTenantEntity.get("id"));
        fixtureRows.push({ entity: TenantEntity, id: foreignTenant });
        const foreignRole = await RoleEntity.create({
            title: `Foreign notepad role ${randomUUID()}`,
            description: "temporary security fixture",
            access: {},
            disabled: false,
            tenant: foreignTenant,
            createdBy: owner.id,
            updatedBy: owner.id,
        });
        const foreignRoleId = String(foreignRole.get("id"));
        fixtureRows.push({ entity: RoleEntity, id: foreignRoleId });
        const foreignOwner = await createUser("foreign", foreignTenant, foreignRoleId);
        foreignHeaders = foreignOwner.headers;

        notepadId = randomUUID();
        await DocumentEntity.create({
            id: notepadId,
            title: "Notepad authorization fixture",
            type: RECORDTYPE.NOTEPAD,
            parent: "00000000-0000-0000-0000-000000000000",
            order: 0,
            tenant,
            createdBy: owner.id,
            updatedBy: owner.id,
        });
        fixtureRows.push({ entity: DocumentEntity, id: notepadId });
        await NotepadEntity.create({
            id: notepadId,
            content: "owner content",
            tenant,
            createdBy: owner.id,
            updatedBy: owner.id,
        });
        fixtureRows.push({ entity: NotepadEntity, id: notepadId });
        await PermissionEntity.create({
            id: notepadId,
            owner: owner.id,
            isPublic: true,
            visibleUsers: [],
            visibleRoles: [],
            tenant,
            createdBy: owner.id,
            updatedBy: owner.id,
        });
        fixtureRows.push({ entity: PermissionEntity, id: notepadId });
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
            throw new AggregateError(cleanupErrors, "Failed to clean up notepad authorization fixtures");
        }
    });

    it("allows the ACL owner to update a public notepad", async () => {
        const response = await app.request(`/api/notepads/${notepadId}`, {
            method: "PATCH",
            headers: { ...ownerHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({ content: "owner updated content" }),
        });

        expect(response.status).toBe(200);
        expect((await NotepadEntity.findByPk(notepadId))?.get("content")).toBe("owner updated content");
    });

    it("allows public reads but rejects same-tenant viewer writes without changing content", async () => {
        const readResponse = await app.request(`/api/notepads/${notepadId}`, { headers: viewerHeaders });
        expect(readResponse.status).toBe(200);
        expect((await readResponse.json()).data.content).toBe("owner updated content");

        const writeResponse = await app.request(`/api/notepads/${notepadId}`, {
            method: "PATCH",
            headers: { ...viewerHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({ content: "viewer must not overwrite" }),
        });

        expect(writeResponse.status).toBe(403);
        expect((await NotepadEntity.findByPk(notepadId))?.get("content")).toBe("owner updated content");
    });

    it("hides a notepad from another tenant and preserves its content", async () => {
        const response = await app.request(`/api/notepads/${notepadId}`, {
            method: "PATCH",
            headers: { ...foreignHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({ content: "foreign tenant must not overwrite" }),
        });

        expect(response.status).toBe(404);
        expect((await NotepadEntity.findByPk(notepadId))?.get("content")).toBe("owner updated content");
    });
});
