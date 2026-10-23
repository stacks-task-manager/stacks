// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PreferenceEntity, RateLimitCounterEntity, SessionEntity, UserEntity } from "@stacks/db";
import { defaultPreferences } from "@stacks/types";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { Op } from "sequelize";
import app from "../../src/index";
import { issueSession } from "../../src/services/sessions";
import { rateLimitKeyHash } from "../../src/utils/rateLimit";

const fixtureRows: Array<{ entity: any; id: string }> = [];
const fixtureUserIds: string[] = [];
let callerId: string;
let otherUserId: string;
let tenant: string;
let callerHeaders: Record<string, string>;
let otherUserHeaders: Record<string, string>;
let callerPreferenceId: string | undefined;
let otherPreferenceId: string;
let rateLimitIp: string;

describe("preference ownership authorization", () => {
    beforeAll(async () => {
        const { email } = JSON.parse(readFileSync("testUser.json", "utf8")) as { email: string };
        const baseUser = await UserEntity.findOne({ where: { email } });
        expect(baseUser).not.toBeNull();
        tenant = String(baseUser!.get("tenant"));

        const createUser = async (label: string) => {
            const user = await UserEntity.create({
                email: `preferences-${label}-${randomUUID()}@example.test`,
                password: "test-password",
                firstName: label,
                lastName: "Preferences Security Test",
                role: String(baseUser!.get("role")),
                tenant,
                admin: false,
                real: false,
            });
            const id = String(user.get("id"));
            fixtureUserIds.push(id);
            fixtureRows.push({ entity: UserEntity, id });
            const session = await issueSession(id, tenant, 120);
            fixtureRows.push({ entity: SessionEntity, id: session.sid });
            return {
                id,
                headers: { Authorization: `Bearer ${session.token}`, "Content-Type": "application/json" },
            };
        };

        const caller = await createUser("caller");
        callerId = caller.id;
        callerHeaders = caller.headers;
        const otherUser = await createUser("other");
        otherUserId = otherUser.id;
        otherUserHeaders = otherUser.headers;

        const otherPreference = await PreferenceEntity.create({
            userId: otherUserId,
            preferences: { ...defaultPreferences, darkMode: false },
            tenant,
            createdBy: otherUserId,
            updatedBy: otherUserId,
        });
        otherPreferenceId = String(otherPreference.get("id"));
        fixtureRows.push({ entity: PreferenceEntity, id: otherPreferenceId });
    });

    afterAll(async () => {
        const cleanupErrors: unknown[] = [];
        try {
            const keyHashes = [
                ...fixtureUserIds.map(userId => rateLimitKeyHash("authenticated-api-user", userId)),
                ...(rateLimitIp ? [rateLimitKeyHash("unauthenticated-api-ip", rateLimitIp)] : []),
            ];
            await RateLimitCounterEntity.destroy({ where: { keyHash: { [Op.in]: keyHashes } } });
            expect(await RateLimitCounterEntity.count({ where: { keyHash: { [Op.in]: keyHashes } } })).toBe(
                0
            );
        } catch (error) {
            cleanupErrors.push(error);
        }
        for (const { entity, id } of fixtureRows.reverse()) {
            try {
                await entity.destroy({ where: { id }, force: true });
                if (await entity.count({ where: { id }, paranoid: false })) {
                    cleanupErrors.push(new Error(`Preference fixture ${id} remains after cleanup`));
                }
            } catch (error) {
                cleanupErrors.push(error);
            }
        }
        fixtureRows.length = 0;
        if (cleanupErrors.length) {
            throw new AggregateError(cleanupErrors, "Failed to clean up preference authorization fixtures");
        }
    });

    it("creates and updates only the authenticated user's preference row", async () => {
        rateLimitIp = `198.51.100.${Math.floor(Math.random() * 254) + 1}`;
        const forgedTenant = randomUUID();
        const payload = {
            ...defaultPreferences,
            darkMode: true,
            userId: otherUserId,
            tenant: forgedTenant,
            createdBy: otherUserId,
            updatedBy: otherUserId,
        };

        const createResponse = await app.request(
            "/api/preferences",
            {
                method: "PATCH",
                headers: callerHeaders,
                body: JSON.stringify(payload),
            },
            { incoming: { socket: { remoteAddress: rateLimitIp } } }
        );
        expect(createResponse.status).toBe(200);

        const callerPreference = await PreferenceEntity.findOne({ where: { userId: callerId } });
        expect(callerPreference).not.toBeNull();
        callerPreferenceId = String(callerPreference!.get("id"));
        fixtureRows.push({ entity: PreferenceEntity, id: callerPreferenceId });
        expect(callerPreference!.get("tenant")).toBe(tenant);
        expect(callerPreference!.get("createdBy")).toBe(callerId);
        expect(callerPreference!.get("preferences")).not.toHaveProperty("userId");
        expect(callerPreference!.get("preferences")).not.toHaveProperty("tenant");
        const otherBeforeUpdate = await PreferenceEntity.findByPk(otherPreferenceId);
        expect(otherBeforeUpdate?.get("userId")).toBe(otherUserId);
        expect(otherBeforeUpdate?.get("preferences")).toMatchObject({ darkMode: false });

        const updateResponse = await app.request(
            "/api/preferences",
            {
                method: "PATCH",
                headers: otherUserHeaders,
                body: JSON.stringify({ ...defaultPreferences, darkMode: true }),
            },
            { incoming: { socket: { remoteAddress: rateLimitIp } } }
        );
        expect(updateResponse.status).toBe(200);

        const persistedCaller = await PreferenceEntity.findByPk(callerPreferenceId);
        const persistedOther = await PreferenceEntity.findByPk(otherPreferenceId);
        expect(persistedCaller?.get("preferences")).toMatchObject({ darkMode: true });
        expect(persistedOther?.get("userId")).toBe(otherUserId);
        expect(persistedOther?.get("preferences")).toMatchObject({ darkMode: true });
        expect(persistedOther?.get("tenant")).toBe(tenant);
    });
});
