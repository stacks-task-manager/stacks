// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * T02: WebSocket upgrades must be authorized before the handshake. A rejected
 * identity never enters the connection registries and never receives an
 * acknowledgment, stats, update, or queued frame.
 */
import { describe, expect, it, test } from "vitest";
import { startSocketHarness } from "../helpers/socketHarness";
import { getAuthToken, getAuthenticatedHeaders, mintSessionToken } from "../helpers/authHelper";
import { getCookieSecret } from "../../src/config/secrets";
import { RoleEntity, TenantEntity, UserEntity } from "@stacks/db";
import { serializeSigned } from "hono/utils/cookie";
import { randomUUID } from "node:crypto";

/** Rows seeded by these tests; hard-deleted by cleanupSeededRows so fixtures never leak. */
const seededRows: any[] = [];

const cleanupSeededRows = async (): Promise<void> => {
    while (seededRows.length > 0) {
        const row = seededRows.pop();
        try {
            await row.destroy({ force: true });
        } catch (error) {
            console.warn("T02 fixture cleanup failed:", error);
        }
    }
};

const uidOf = (token: string): string =>
    JSON.parse(Buffer.from(token.split(".")[1], "base64").toString()).uid;

/** Session-bound token for a fixture account; the row is cleaned up with the rest. */
const mintToken = async (uid: string, expiresIn: number): Promise<string> => {
    const tenant = await TenantEntity.findOne({ where: {} });
    const { token, row } = await mintSessionToken(uid, String(tenant.get("id")), expiresIn);
    seededRows.push(row);
    return token;
};

const seededUser = async (fields: Record<string, any>) => {
    const tenant = await TenantEntity.findOne({ where: {} });
    const role = await RoleEntity.findOne({ where: { title: "User", tenant: tenant.get("id") } });
    const user = await UserEntity.create({
        email: `t02-${randomUUID()}@example.com`,
        password: "testpassword123",
        firstName: "Socket",
        lastName: "Subject",
        real: true,
        role: role.get("id"),
        tenant: tenant.get("id"),
        ...fields,
    });
    seededRows.push(user);
    return user;
};

const userInDisabledTenant = async () => {
    const tenant = await TenantEntity.create({
        title: `T02 disabled ${randomUUID()}`,
        description: "temporary fixture",
        disabled: true,
        expiry: new Date(Date.now() + 60 * 60 * 1000),
    });
    seededRows.push(tenant);
    const seeded = await TenantEntity.findOne({ where: {} });
    const role = await RoleEntity.findOne({ where: { title: "User", tenant: seeded.get("id") } });
    const user = await UserEntity.create({
        email: `t02-${randomUUID()}@example.com`,
        password: "testpassword123",
        firstName: "Socket",
        lastName: "Subject",
        real: true,
        role: role.get("id"),
        tenant: tenant.get("id"),
    });
    seededRows.push(user);
    return user;
};

const activeConnections = async (harness: any): Promise<number> => {
    const response = await harness.request("/ws/stats", await getAuthenticatedHeaders());
    expect(response.status).toBe(200);
    return JSON.parse(response.body).data.activeConnections;
};

describe("WebSocket upgrade authorization", () => {
    test("a client without credentials is rejected before the upgrade", async () => {
        const harness = await startSocketHarness();
        try {
            const before = await activeConnections(harness);
            const { opened, outcome, frames } = await harness.openClient();
            expect(opened).toBe(false);
            expect(outcome).toBe("unexpected-response: 401");
            expect(frames).toHaveLength(0);
            expect(await activeConnections(harness)).toBe(before);
        } finally {
            await harness.close();
            await cleanupSeededRows();
        }
    });

    test("a malformed or expired token is rejected before the upgrade", async () => {
        const token = await getAuthToken();
        const uid = uidOf(token);
        const harness = await startSocketHarness();
        const before = await activeConnections(harness);
        try {
            const malformed = await harness.openClient({ Authorization: "Bearer not-a-jwt" });
            expect(malformed.opened).toBe(false);
            expect(malformed.outcome).toBe("unexpected-response: 401");
            expect(malformed.frames).toHaveLength(0);

            const expired = await harness.openClient({
                Authorization: `Bearer ${await mintToken(uid, -60)}`,
            });
            expect(expired.opened).toBe(false);
            expect(expired.outcome).toBe("unexpected-response: 401");
            expect(expired.frames).toHaveLength(0);

            expect(await activeConnections(harness)).toBe(before);
        } finally {
            await harness.close();
            await cleanupSeededRows();
        }
    });

    test("a valid token for an unknown account is rejected before the upgrade", async () => {
        const harness = await startSocketHarness();
        try {
            const before = await activeConnections(harness);
            const stranger = await harness.openClient({
                Authorization: `Bearer ${await mintToken(randomUUID(), 60)}`,
            });
            expect(stranger.opened).toBe(false);
            expect(stranger.outcome).toBe("unexpected-response: 401");
            expect(stranger.frames).toHaveLength(0);
            expect(await activeConnections(harness)).toBe(before);
        } finally {
            await harness.close();
            await cleanupSeededRows();
        }
    });

    test("a disabled or deleted account cannot upgrade", async () => {
        const disabled = await seededUser({ disabled: true });
        const deleted = await seededUser({ deleted: new Date() });
        const harness = await startSocketHarness();
        const before = await activeConnections(harness);
        try {
            for (const row of [disabled, deleted]) {
                const rejected = await harness.openClient({
                    Authorization: `Bearer ${await mintToken(String(row.get("id")), 60)}`,
                });
                expect(rejected.opened).toBe(false);
                expect(rejected.outcome).toBe("unexpected-response: 403");
                expect(rejected.frames).toHaveLength(0);
            }
            expect(await activeConnections(harness)).toBe(before);
        } finally {
            await harness.close();
            await cleanupSeededRows();
        }
    });

    test("a disabled tenant cannot upgrade", async () => {
        const user = await userInDisabledTenant();
        const harness = await startSocketHarness();
        const before = await activeConnections(harness);
        try {
            const rejected = await harness.openClient({
                Authorization: `Bearer ${await mintToken(String(user.get("id")), 60)}`,
            });
            expect(rejected.opened).toBe(false);
            expect(rejected.outcome).toBe("unexpected-response: 403");
            expect(rejected.frames).toHaveLength(0);
            expect(await activeConnections(harness)).toBe(before);
        } finally {
            await harness.close();
            await cleanupSeededRows();
        }
    });

    test("a native client with a bearer token and no Origin connects", async () => {
        const token = await getAuthToken();
        const harness = await startSocketHarness();
        const before = await activeConnections(harness);
        try {
            const { opened, outcome, client, frames } = await harness.openClient(
                { Authorization: `Bearer ${token}` },
                { origin: false }
            );
            expect(opened).toBe(true);
            expect(outcome).toBe("open");
            expect(await harness.waitFor(async () => frames.length > 0)).toBe(true);
            const ack = JSON.parse(frames[0]);
            expect(ack.type).toBe("connection_ack");
            expect(String(ack.payload.userId)).toBe(uidOf(token));
            expect(await activeConnections(harness)).toBe(before + 1);
            client.close();
        } finally {
            await harness.close();
            await cleanupSeededRows();
        }
    });

    test("a browser client with the session cookie and a trusted Origin connects", async () => {
        const token = await getAuthToken();
        const harness = await startSocketHarness();
        const previousOrigin = process.env.APP_ORIGIN;
        process.env.APP_ORIGIN = `http://localhost:${harness.port}`;
        try {
            const cookieHeader = await serializeSigned("auth_token", token, getCookieSecret());
            const { opened, frames } = await harness.openClient({
                Cookie: cookieHeader,
                Origin: `http://localhost:${harness.port}`,
            });
            expect(opened).toBe(true);
            expect(await harness.waitFor(async () => frames.length > 0)).toBe(true);
            expect(JSON.parse(frames[0]).type).toBe("connection_ack");
        } finally {
            if (previousOrigin === undefined) {
                delete process.env.APP_ORIGIN;
            } else {
                process.env.APP_ORIGIN = previousOrigin;
            }
            await harness.close();
            await cleanupSeededRows();
        }
    });

    test("a cookie client without an Origin header cannot upgrade", async () => {
        const token = await getAuthToken();
        const harness = await startSocketHarness();
        try {
            const before = await activeConnections(harness);
            const cookieHeader = await serializeSigned("auth_token", token, getCookieSecret());

            const noOrigin = await harness.openClient({ Cookie: cookieHeader }, { origin: false });
            expect(noOrigin.opened).toBe(false);
            expect(noOrigin.outcome).toBe("unexpected-response: 403");
            expect(noOrigin.frames).toHaveLength(0);

            const expiredWithForeignOrigin = await harness.openClient({
                Authorization: `Bearer ${await mintToken(uidOf(token), -60)}`,
                Origin: "https://elsewhere.example",
            });
            expect(expiredWithForeignOrigin.opened).toBe(false);
            expect(expiredWithForeignOrigin.outcome).toBe("unexpected-response: 401");
            expect(expiredWithForeignOrigin.frames).toHaveLength(0);

            expect(await activeConnections(harness)).toBe(before);
        } finally {
            await harness.close();
            await cleanupSeededRows();
        }
    });

    test("a foreign Origin is rejected even with a valid bearer token", async () => {
        const token = await getAuthToken();
        const harness = await startSocketHarness();
        try {
            const before = await activeConnections(harness);
            const rejected = await harness.openClient({
                Authorization: `Bearer ${token}`,
                Origin: "https://elsewhere.example",
            });
            expect(rejected.opened).toBe(false);
            expect(rejected.outcome).toBe("unexpected-response: 403");
            expect(rejected.frames).toHaveLength(0);
            expect(await activeConnections(harness)).toBe(before);
        } finally {
            await harness.close();
            await cleanupSeededRows();
        }
    });

    test("a bearer token carried in the query string never authenticates", async () => {
        const token = await getAuthToken();
        const harness = await startSocketHarness();
        try {
            const before = await activeConnections(harness);
            const rejected = await harness.openClient(undefined, undefined, `/ws?token=${token}`);
            expect(rejected.opened).toBe(false);
            expect(rejected.outcome).toBe("unexpected-response: 401");
            expect(rejected.frames).toHaveLength(0);
            expect(await activeConnections(harness)).toBe(before);
        } finally {
            await harness.close();
            await cleanupSeededRows();
        }
    });

    test("revoking an account mid-session closes the socket with 1008", async () => {
        const user = await seededUser({});
        const token = await mintToken(String(user.get("id")), 600);
        const harness = await startSocketHarness();
        const before = await activeConnections(harness);
        try {
            const { opened, client, frames, closeCodes } = await harness.openClient(
                { Authorization: `Bearer ${token}` },
                { origin: false }
            );
            expect(opened).toBe(true);
            expect(await harness.waitFor(async () => frames.length > 0)).toBe(true);
            expect(JSON.parse(frames[0]).type).toBe("connection_ack");
            expect(await activeConnections(harness)).toBe(before + 1);

            await UserEntity.update({ disabled: true }, { where: { id: user.get("id") }, returning: false });
            client.send(JSON.stringify({ type: "ping", messageId: randomUUID() }));

            expect(await harness.waitFor(async () => closeCodes.includes(1008))).toBe(true);
            expect(await activeConnections(harness)).toBe(before);
        } finally {
            await harness.close();
            await cleanupSeededRows();
        }
    });
});
