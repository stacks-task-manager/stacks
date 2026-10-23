// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { afterAll, describe, expect, it } from "vitest";
import { ROLE_SECTIONS } from "@stacks/types";
import { RoleEntity, SessionEntity, UserEntity } from "@stacks/db";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import app from "../../src/index";
import { issueSession } from "../../src/services/sessions";

const fixtureRows: Array<{ entity: any; id: string }> = [];

describe("people update role authorization", () => {
    afterAll(async () => {
        const cleanupErrors: unknown[] = [];
        for (const { entity, id } of fixtureRows.reverse()) {
            try {
                await entity.destroy({ where: { id }, force: true });
                if (await entity.findByPk(id)) cleanupErrors.push(new Error(`Fixture row ${id} remains`));
            } catch (error) {
                cleanupErrors.push(error);
            }
        }
        if (cleanupErrors.length) {
            throw new AggregateError(cleanupErrors, "Failed to clean up people update fixtures");
        }
    });

    it("limits profile edits to self and admins regardless of people role access", async () => {
        const credentials = JSON.parse(readFileSync("testUser.json", "utf8")) as { email: string };
        const seededUser = await UserEntity.findOne({ where: { email: credentials.email } });
        expect(seededUser).not.toBeNull();
        const tenant = String(seededUser!.get("tenant"));
        const seedUserId = String(seededUser!.get("id"));

        const readOnlyRole = await RoleEntity.create({
            title: `People read-only ${randomUUID()}`,
            description: "temporary security fixture",
            access: { [ROLE_SECTIONS.PEOPLE]: { read: true, write: false } },
            disabled: false,
            tenant,
            createdBy: seedUserId,
            updatedBy: seedUserId,
        });
        const readOnlyRoleId = String(readOnlyRole.get("id"));
        fixtureRows.push({ entity: RoleEntity, id: readOnlyRoleId });

        const writerRole = await RoleEntity.create({
            title: `People writer ${randomUUID()}`,
            description: "temporary security fixture",
            access: { [ROLE_SECTIONS.PEOPLE]: { read: true, write: true } },
            disabled: false,
            tenant,
            createdBy: seedUserId,
            updatedBy: seedUserId,
        });
        const writerRoleId = String(writerRole.get("id"));
        fixtureRows.push({ entity: RoleEntity, id: writerRoleId });

        const createActor = async (roleId: string, prefix: string, admin = false) => {
            const actor = await UserEntity.create({
                email: `${prefix}-${randomUUID()}@example.test`,
                password: "temporary-security-test-password",
                firstName: prefix,
                lastName: "People Update",
                role: roleId,
                tenant,
                admin,
                real: true,
            });
            const actorId = String(actor.get("id"));
            fixtureRows.push({ entity: UserEntity, id: actorId });
            const session = await issueSession(actorId, tenant, 120);
            fixtureRows.push({ entity: SessionEntity, id: session.sid });
            return {
                id: actorId,
                headers: {
                    Authorization: `Bearer ${session.token}`,
                    "Content-Type": "application/json",
                },
            };
        };

        const readOnlyActor = await createActor(readOnlyRoleId, "people-read-only");
        const writer = await createActor(writerRoleId, "people-writer");
        const admin = await createActor(readOnlyRoleId, "people-admin", true);
        const contact = await UserEntity.create({
            email: `people-contact-${randomUUID()}@example.test`,
            password: "temporary-security-test-password",
            firstName: "Original",
            lastName: "Contact",
            role: readOnlyRoleId,
            tenant,
            admin: false,
            real: false,
            createdBy: seedUserId,
            updatedBy: seedUserId,
        });
        const contactId = String(contact.get("id"));
        fixtureRows.push({ entity: UserEntity, id: contactId });

        const denied = await app.request(`/api/people/${contactId}`, {
            method: "PATCH",
            headers: readOnlyActor.headers,
            body: JSON.stringify({ firstName: "Must remain unchanged" }),
        });
        expect(denied.status).toBe(404);
        expect((await UserEntity.findByPk(contactId))?.get("firstName")).toBe("Original");

        const selfUpdate = await app.request(`/api/people/${readOnlyActor.id}`, {
            method: "PATCH",
            headers: readOnlyActor.headers,
            body: JSON.stringify({ title: "Self profile update" }),
        });
        expect(selfUpdate.status).toBe(200);

        const writerDenied = await app.request(`/api/people/${contactId}`, {
            method: "PATCH",
            headers: writer.headers,
            body: JSON.stringify({ firstName: "Writer update" }),
        });
        expect(writerDenied.status).toBe(404);
        expect((await UserEntity.findByPk(contactId))?.get("firstName")).toBe("Original");

        const adminAllowed = await app.request(`/api/people/${contactId}`, {
            method: "PATCH",
            headers: admin.headers,
            body: JSON.stringify({ firstName: "Admin update" }),
        });
        expect(adminAllowed.status).toBe(200);
        expect((await UserEntity.findByPk(contactId))?.get("firstName")).toBe("Admin update");
    });
});
