// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { EmailQueueEntity, RateLimitCounterEntity, RoleEntity, SessionEntity, UserEntity } from "@stacks/db";
import { EMAIL_TEMPLATES, ROLE_ACTIONS, ROLE_SECTIONS } from "@stacks/types";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import app from "../../src/index";
import { hashAccountToken } from "../../src/services/accountTokens";
import { issueSession } from "../../src/services/sessions";
import { rateLimitKeyHash } from "../../src/utils/rateLimit";

const fixtureRows: Array<{ entity: any; id: string }> = [];
const rateLimitedUserIds: string[] = [];
const resendTargetIds: string[] = [];
let tenant: string;
let viewerId: string;
let adminId: string;
let readerId: string;
let readerRoleId: string;
let viewerHeaders: Record<string, string>;
let adminHeaders: Record<string, string>;
let readerHeaders: Record<string, string>;

describe("people directory database role authorization", () => {
    beforeAll(async () => {
        const { email } = JSON.parse(readFileSync("testUser.json", "utf8")) as { email: string };
        const seededUser = await UserEntity.findOne({ where: { email } });
        expect(seededUser).not.toBeNull();
        tenant = String(seededUser!.get("tenant"));

        const role = await RoleEntity.create({
            title: `No people access ${randomUUID()}`,
            description: "temporary security fixture",
            access: {},
            disabled: false,
            tenant,
            createdBy: String(seededUser!.get("id")),
            updatedBy: String(seededUser!.get("id")),
        });
        const roleId = String(role.get("id"));
        fixtureRows.push({ entity: RoleEntity, id: roleId });

        const readerRole = await RoleEntity.create({
            title: `People read only ${randomUUID()}`,
            description: "temporary security fixture",
            access: { [ROLE_SECTIONS.PEOPLE]: { [ROLE_ACTIONS.READ]: true } },
            disabled: false,
            tenant,
            createdBy: String(seededUser!.get("id")),
            updatedBy: String(seededUser!.get("id")),
        });
        readerRoleId = String(readerRole.get("id"));
        fixtureRows.push({ entity: RoleEntity, id: readerRoleId });

        const createUser = async (label: string, admin: boolean, assignedRoleId = roleId) => {
            const user = await UserEntity.create({
                email: `${label}-people-role-${randomUUID()}@example.test`,
                password: `temporary-${randomUUID()}`,
                firstName: label,
                lastName: "People Role Authorization",
                role: assignedRoleId,
                tenant,
                admin,
                real: false,
            });
            const id = String(user.get("id"));
            fixtureRows.push({ entity: UserEntity, id });
            rateLimitedUserIds.push(id);
            const session = await issueSession(id, tenant, 120);
            fixtureRows.push({ entity: SessionEntity, id: session.sid });
            return { id, headers: { Authorization: `Bearer ${session.token}` } };
        };

        const viewer = await createUser("viewer", false);
        viewerId = viewer.id;
        viewerHeaders = viewer.headers;
        const admin = await createUser("admin", true);
        adminId = admin.id;
        adminHeaders = admin.headers;
        const reader = await createUser("reader", false, readerRoleId);
        readerId = reader.id;
        readerHeaders = reader.headers;
    });

    afterAll(async () => {
        for (const userId of resendTargetIds) {
            await EmailQueueEntity.destroy({ where: { userId }, force: true });
            expect(await EmailQueueEntity.count({ where: { userId } })).toBe(0);
        }
        resendTargetIds.length = 0;

        const keyHashes = rateLimitedUserIds.map(userId =>
            rateLimitKeyHash("authenticated-api-user", userId)
        );
        if (keyHashes.length) {
            await RateLimitCounterEntity.destroy({ where: { keyHash: keyHashes } });
            expect(await RateLimitCounterEntity.count({ where: { keyHash: keyHashes } })).toBe(0);
        }
        rateLimitedUserIds.length = 0;

        const cleanupErrors: unknown[] = [];
        const rows = fixtureRows.reverse();
        for (const { entity, id } of rows) {
            try {
                await entity.destroy({ where: { id }, force: true });
                if (await entity.findByPk(id)) {
                    cleanupErrors.push(new Error(`People role fixture row ${id} remains after cleanup`));
                }
            } catch (error) {
                cleanupErrors.push(error);
            }
        }
        fixtureRows.length = 0;
        if (cleanupErrors.length) {
            throw new AggregateError(cleanupErrors, "Failed to clean up people role fixtures");
        }
    });

    it("enforces people read access on directory, birthdays, and other profiles while allowing self and admins", async () => {
        const directory = await app.request("/api/people", { headers: viewerHeaders });
        const birthdays = await app.request(
            "/api/people/birthdays?from=2026-01-01T00:00:00.000Z&to=2026-12-31T23:59:59.999Z",
            { headers: viewerHeaders }
        );
        const otherProfile = await app.request(`/api/people/${adminId}`, {
            headers: viewerHeaders,
        });
        const selfProfile = await app.request(`/api/people/${viewerId}`, { headers: viewerHeaders });
        const adminDirectory = await app.request("/api/people", { headers: adminHeaders });

        expect(directory.status).toBe(403);
        expect(birthdays.status).toBe(403);
        expect(otherProfile.status).toBe(403);
        expect(selfProfile.status).toBe(200);
        expect(adminDirectory.status).toBe(200);
    });

    it("allows a non-admin people reader to list people but not create them", async () => {
        const directory = await app.request("/api/people", { headers: readerHeaders });
        expect(directory.status).toBe(200);
        const body = await directory.json();
        expect(body.data.map((person: { id: string }) => person.id)).toContain(readerId);

        const email = `forbidden-reader-create-${randomUUID()}@example.test`;
        const create = await app.request("/api/people", {
            method: "POST",
            headers: { ...readerHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({
                firstName: "Forbidden",
                lastName: "Read-only reader",
                role: readerRoleId,
                real: false,
                email,
            }),
        });

        expect(create.status).toBe(403);
        expect(await UserEntity.findOne({ where: { email } })).toBeNull();
    });

    it("restricts activation-link resend to admins without disclosing target existence or token", async () => {
        const existingActivationHash = "a".repeat(64);
        const target = await UserEntity.create({
            email: `pending-activation-${randomUUID()}@example.test`,
            password: `temporary-${randomUUID()}`,
            firstName: "Pending",
            lastName: "Activation",
            role: readerRoleId,
            tenant,
            admin: false,
            real: true,
            disabled: true,
            activationTokenHash: existingActivationHash,
            activationTokenExpiresAt: new Date(Date.now() + 60_000),
        });
        const targetId = String(target.get("id"));
        fixtureRows.push({ entity: UserEntity, id: targetId });
        resendTargetIds.push(targetId);

        const resend = (headers: Record<string, string>, id: string) =>
            app.request(`/api/people/${id}/resend-activation`, { method: "POST", headers });

        const denied = await resend(readerHeaders, targetId);
        const deniedUnknownId = await resend(readerHeaders, randomUUID());
        expect(denied.status).toBe(403);
        expect(deniedUnknownId.status).toBe(denied.status);
        expect((await UserEntity.findByPk(targetId))?.get("activationTokenHash")).toBe(
            existingActivationHash
        );
        expect(await EmailQueueEntity.count({ where: { userId: targetId } })).toBe(0);

        const allowed = await resend(adminHeaders, targetId);
        expect(allowed.status).toBe(200);
        const responseBody = await allowed.json();
        expect(responseBody.data).not.toHaveProperty("activationTokenHash");

        const updatedTarget = await UserEntity.findByPk(targetId);
        expect(updatedTarget?.get("activationTokenHash")).toMatch(/^[0-9a-f]{64}$/);
        expect(updatedTarget?.get("activationTokenHash")).not.toBe(existingActivationHash);

        const queued = await EmailQueueEntity.findOne({
            where: { userId: targetId, template: EMAIL_TEMPLATES.REGISTRATION },
            order: [["id", "DESC"]],
        });
        expect(queued).not.toBeNull();
        const verificationLink = (queued!.get("data") as { verificationLink: string }).verificationLink;
        const token = verificationLink.split("/").at(-1)!;
        expect(token).toMatch(/^[0-9a-f]{64}$/);
        expect(updatedTarget?.get("activationTokenHash")).toBe(hashAccountToken(token));
        expect(JSON.stringify(responseBody)).not.toContain(token);
    });
});
