// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * T03: realtime delivery authorization (S02). Raw socket frames, queues, presence
 * and statistics must obey the canonical tenant/ACL/RBAC rules before
 * serialization, with no client-side filtering. Fixtures use two tenants and one
 * private ACL; every recipient is a real WS client and every event is a real
 * emit through request context.
 */
import { describe, expect, test } from "vitest";
import { startSocketHarness } from "../helpers/socketHarness";
import { getAuthToken, getAuthenticatedHeaders, mintSessionToken } from "../helpers/authHelper";
import { getCookieSecret } from "../../src/config/secrets";
import { RoleEntity, TenantEntity, UserEntity } from "@stacks/db";
import { POLLINGACTIONS, POLLINGTYPE } from "@stacks/types";
import type { IPermissions } from "@stacks/types";
import {
    queueMessage,
    sendRealtimeInvalidation,
    sendRealtimeUpdate,
    sendRealtimeUpdateToUser,
} from "../../src/events";
import { requestContext } from "../../src/services/requestContext";
import { randomUUID } from "node:crypto";

/** Rows seeded by these tests; hard-deleted by cleanupSeededRows so fixtures never leak. */
const seededRows: any[] = [];

const cleanupSeededRows = async (): Promise<void> => {
    while (seededRows.length > 0) {
        const row = seededRows.pop();
        try {
            await row.destroy({ force: true });
        } catch (error) {
            console.warn("T03 fixture cleanup failed:", error);
        }
    }
};

/** Session-bound token for a fixture account; the row is cleaned up with the rest. */
const mintToken = async (uid: string, expiresIn: number): Promise<string> => {
    const tenant = await TenantEntity.findOne({ where: {} });
    const { token, row } = await mintSessionToken(uid, String(tenant.get("id")), expiresIn);
    seededRows.push(row);
    return token;
};

const createTenant = async (title: string): Promise<any> => {
    const tenant = await TenantEntity.create({
        title: `${title} ${randomUUID()}`,
        description: "temporary fixture",
        expiry: new Date(Date.now() + 60 * 60 * 1000),
    });
    seededRows.push(tenant);
    return tenant;
};

const systemUser = async (): Promise<any> => await UserEntity.findOne({ where: { system: true } });

const createRole = async (tenant: any, title: string): Promise<any> => {
    const system = await systemUser();
    const role = await RoleEntity.create({
        title,
        description: "temporary fixture",
        access: {},
        disabled: false,
        tenant: tenant.get("id"),
        createdBy: String(system.get("id")),
        updatedBy: String(system.get("id")),
    });
    seededRows.push(role);
    return role;
};

const createUser = async (tenant: any, role: any, fields: Record<string, any> = {}): Promise<any> => {
    const user = await UserEntity.create({
        email: `t03-${randomUUID()}@example.com`,
        password: "testpassword123",
        firstName: "Realtime",
        lastName: "Subject",
        real: true,
        role: role.get("id"),
        tenant: tenant.get("id"),
        ...fields,
    });
    seededRows.push(user);
    return user;
};

/** Two tenants: A owns the private ACL fixture, B must never see A's frames. */
const fixture = async (): Promise<{
    tenantA: any;
    tenantB: any;
    acl: IPermissions;
    ownerA: any;
    roleHolderA: any;
    allowedUserA: any;
    unrelatedA: any;
    adminA: any;
    userB: any;
    adminB: any;
}> => {
    const tenantA = await TenantEntity.findOne({ where: {} });
    const tenantB = await createTenant("T03 foreign");
    const roleUserA = await RoleEntity.findOne({ where: { title: "User", tenant: tenantA.get("id") } });
    const roleCollabA = await RoleEntity.findOne({
        where: { title: "Collaborator", tenant: tenantA.get("id") },
    });
    const roleUserB = await createRole(tenantB, "User");

    const ownerA = await createUser(tenantA, roleUserA);
    const roleHolderA = await createUser(tenantA, roleCollabA);
    const allowedUserA = await createUser(tenantA, roleUserA);
    const unrelatedA = await createUser(tenantA, roleUserA);
    const adminA = await createUser(tenantA, roleUserA, { admin: true });
    const userB = await createUser(tenantB, roleUserB);
    const adminB = await createUser(tenantB, roleUserB, { admin: true });

    const acl = {
        id: randomUUID(),
        type: POLLINGTYPE.TASK,
        isPublic: false,
        owner: String(ownerA.get("id")),
        visibleUsers: [String(allowedUserA.get("id"))],
        visibleRoles: [String(roleCollabA.get("id"))],
    } as IPermissions;

    return { tenantA, tenantB, acl, ownerA, roleHolderA, allowedUserA, unrelatedA, adminA, userB, adminB };
};

/** Opens a real WS client for a fixture user and waits for its acknowledgment. */
const connectAs = async (harness: any, user: any): Promise<{ client: any; frames: string[] }> => {
    const token = await mintToken(String(user.get("id")), 600);
    const { opened, client, frames } = await harness.openClient(
        { Authorization: `Bearer ${token}` },
        { origin: false }
    );
    expect(opened).toBe(true);
    expect(await harness.waitFor(async () => frames.length > 0)).toBe(true);
    expect(JSON.parse(frames[0]).type).toBe("connection_ack");
    return { client, frames };
};

const statsFor = async (harness: any, token: string): Promise<any> => {
    const response = await harness.request("/ws/stats", { Authorization: `Bearer ${token}` });
    expect(response.status).toBe(200);
    return JSON.parse(response.body).data;
};

const framesOf = (frames: string[], type: string): any[] =>
    frames.map(raw => JSON.parse(raw)).filter(frame => frame.type === type);

const updateFramesFor = (frames: string[], record: string): any[] =>
    framesOf(frames, "update").filter(frame => String(frame.payload?.record) === record);

describe("Realtime delivery authorization", () => {
    test("a private broadcast reaches only the owner, allowed role, allowed user and tenant admin", async () => {
        const f = await fixture();
        const harness = await startSocketHarness();
        try {
            const owner = await connectAs(harness, f.ownerA);
            const roleHolder = await connectAs(harness, f.roleHolderA);
            const allowedUser = await connectAs(harness, f.allowedUserA);
            const admin = await connectAs(harness, f.adminA);
            const unrelated = await connectAs(harness, f.unrelatedA);
            const foreign = await connectAs(harness, f.userB);
            const foreignAdmin = await connectAs(harness, f.adminB);

            const record = `t03-record-${randomUUID()}`;
            requestContext.run(
                {
                    user: {
                        id: String(f.ownerA.get("id")),
                        tenant: String(f.tenantA.get("id")),
                        role: String(f.ownerA.get("role")),
                        admin: false,
                    } as any,
                    instanceId: `t03-instance-${randomUUID()}`,
                    role: {} as any,
                    requestId: randomUUID(),
                    timestamp: Date.now(),
                },
                () =>
                    sendRealtimeUpdate({
                        type: POLLINGTYPE.TASK,
                        action: POLLINGACTIONS.CREATE,
                        record,
                        permissions: f.acl,
                        data: { taskId: record, title: "private fixture" },
                    })
            );

            for (const recipient of [owner, roleHolder, allowedUser, admin]) {
                expect(
                    await harness.waitFor(async () => updateFramesFor(recipient.frames, record).length > 0)
                ).toBe(true);
            }
            for (const recipient of [unrelated, foreign, foreignAdmin]) {
                expect(updateFramesFor(recipient.frames, record)).toHaveLength(0);
            }
        } finally {
            await harness.close();
            await cleanupSeededRows();
        }
    });

    test("a missing audience context fails closed", async () => {
        const f = await fixture();
        const harness = await startSocketHarness();
        try {
            const owner = await connectAs(harness, f.ownerA);
            const record = `t03-no-context-${randomUUID()}`;
            sendRealtimeUpdate({
                type: POLLINGTYPE.TASK,
                action: POLLINGACTIONS.CREATE,
                record,
                permissions: f.acl,
                data: { taskId: record },
            });
            expect(await harness.waitFor(async () => owner.frames.length > 1, 1500)).toBe(false);
            expect(updateFramesFor(owner.frames, record)).toHaveLength(0);
        } finally {
            await harness.close();
            await cleanupSeededRows();
        }
    });

    test("a tenant-public event reaches every tenant-A client and no tenant-B client", async () => {
        const f = await fixture();
        const harness = await startSocketHarness();
        try {
            const owner = await connectAs(harness, f.ownerA);
            const unrelated = await connectAs(harness, f.unrelatedA);
            const foreign = await connectAs(harness, f.userB);

            const record = `t03-tenant-public-${randomUUID()}`;
            requestContext.run(
                {
                    user: {
                        id: String(f.ownerA.get("id")),
                        tenant: String(f.tenantA.get("id")),
                        role: String(f.ownerA.get("role")),
                        admin: false,
                    } as any,
                    instanceId: `t03-instance-${randomUUID()}`,
                    role: {} as any,
                    requestId: randomUUID(),
                    timestamp: Date.now(),
                },
                () =>
                    sendRealtimeUpdate({
                        type: POLLINGTYPE.TASK,
                        action: POLLINGACTIONS.CREATE,
                        record,
                        data: { taskId: record },
                    })
            );

            for (const recipient of [owner, unrelated]) {
                expect(
                    await harness.waitFor(async () => updateFramesFor(recipient.frames, record).length > 0)
                ).toBe(true);
            }
            expect(updateFramesFor(foreign.frames, record)).toHaveLength(0);
        } finally {
            await harness.close();
            await cleanupSeededRows();
        }
    });

    test("targeted updates still obey the resource ACL", async () => {
        const f = await fixture();
        const harness = await startSocketHarness();
        try {
            const owner = await connectAs(harness, f.ownerA);
            const unrelated = await connectAs(harness, f.unrelatedA);

            const record = `t03-targeted-${randomUUID()}`;
            requestContext.run(
                {
                    user: {
                        id: String(f.ownerA.get("id")),
                        tenant: String(f.tenantA.get("id")),
                        role: String(f.ownerA.get("role")),
                        admin: false,
                    } as any,
                    instanceId: `t03-instance-${randomUUID()}`,
                    role: {} as any,
                    requestId: randomUUID(),
                    timestamp: Date.now(),
                },
                () => {
                    sendRealtimeUpdateToUser(String(f.unrelatedA.get("id")), {
                        type: POLLINGTYPE.TASK,
                        action: POLLINGACTIONS.CREATE,
                        record,
                        permissions: f.acl,
                        data: { taskId: record },
                    });
                    sendRealtimeUpdateToUser(String(f.ownerA.get("id")), {
                        type: POLLINGTYPE.TASK,
                        action: POLLINGACTIONS.UPDATE,
                        record,
                        permissions: f.acl,
                        data: { taskId: record },
                    });
                }
            );

            expect(await harness.waitFor(async () => updateFramesFor(owner.frames, record).length > 0)).toBe(
                true
            );
            expect(updateFramesFor(unrelated.frames, record)).toHaveLength(0);
        } finally {
            await harness.close();
            await cleanupSeededRows();
        }
    });

    test("queued frames are re-authorized when a client reconnects", async () => {
        const f = await fixture();
        const harness = await startSocketHarness();
        try {
            const record = `t03-queued-${randomUUID()}`;
            const audience = { tenant: String(f.tenantA.get("id")), permissions: f.acl };
            const frame = {
                type: "update",
                payload: {
                    type: POLLINGTYPE.TASK,
                    action: POLLINGACTIONS.CREATE,
                    record,
                    user: String(f.ownerA.get("id")),
                    timestamp: Date.now(),
                },
                timestamp: Date.now(),
            };
            queueMessage(String(f.unrelatedA.get("id")), frame, audience);
            queueMessage(String(f.allowedUserA.get("id")), frame, audience);

            const unrelated = await connectAs(harness, f.unrelatedA);
            expect(updateFramesFor(unrelated.frames, record)).toHaveLength(0);

            const allowed = await connectAs(harness, f.allowedUserA);
            expect(
                await harness.waitFor(async () => updateFramesFor(allowed.frames, record).length > 0)
            ).toBe(true);
        } finally {
            await harness.close();
            await cleanupSeededRows();
        }
    });

    test("presence broadcasts stay inside the tenant", async () => {
        const f = await fixture();
        const harness = await startSocketHarness();
        try {
            const sender = await connectAs(harness, f.ownerA);
            const peerA = await connectAs(harness, f.unrelatedA);
            const foreign = await connectAs(harness, f.userB);

            sender.client.send(JSON.stringify({ type: "user_status", payload: { status: "online" } }));

            expect(
                await harness.waitFor(async () => framesOf(peerA.frames, "user_status_updated").length > 0)
            ).toBe(true);
            expect(framesOf(foreign.frames, "user_status_updated")).toHaveLength(0);
        } finally {
            await harness.close();
            await cleanupSeededRows();
        }
    });

    test("removal invalidations reach previous ACL holders without the record body", async () => {
        const f = await fixture();
        const harness = await startSocketHarness();
        try {
            const owner = await connectAs(harness, f.ownerA);
            const unrelated = await connectAs(harness, f.unrelatedA);

            const record = `t03-revoked-${randomUUID()}`;
            requestContext.run(
                {
                    user: {
                        id: String(f.ownerA.get("id")),
                        tenant: String(f.tenantA.get("id")),
                        role: String(f.ownerA.get("role")),
                        admin: false,
                    } as any,
                    instanceId: `t03-instance-${randomUUID()}`,
                    role: {} as any,
                    requestId: randomUUID(),
                    timestamp: Date.now(),
                },
                () =>
                    sendRealtimeInvalidation(record, POLLINGTYPE.TASK, POLLINGACTIONS.DELETED, {
                        tenant: String(f.tenantA.get("id")),
                        permissions: f.acl,
                    })
            );

            expect(
                await harness.waitFor(async () =>
                    updateFramesFor(owner.frames, record).some(
                        frame => frame.payload?.action === POLLINGACTIONS.DELETED
                    )
                )
            ).toBe(true);
            const delivered = updateFramesFor(owner.frames, record)[0];
            expect(delivered.payload?.data).toBeUndefined();
            expect(updateFramesFor(unrelated.frames, record)).toHaveLength(0);
        } finally {
            await harness.close();
            await cleanupSeededRows();
        }
    });

    test("connection statistics are scoped to the caller's tenant", async () => {
        const f = await fixture();
        const harness = await startSocketHarness();
        try {
            const unauthenticated = await harness.request("/ws/stats");
            expect(unauthenticated.status).toBe(401);

            const tokenA = await mintToken(String(f.ownerA.get("id")), 600);
            const tokenB = await mintToken(String(f.userB.get("id")), 600);

            const beforeA = await statsFor(harness, tokenA);
            const beforeB = await statsFor(harness, tokenB);

            await connectAs(harness, f.ownerA);
            await connectAs(harness, f.unrelatedA);
            await connectAs(harness, f.userB);

            const scopedA = await statsFor(harness, tokenA);
            const scopedB = await statsFor(harness, tokenB);
            expect(scopedA.activeConnections).toBe(beforeA.activeConnections + 2);
            expect(scopedB.activeConnections).toBe(beforeB.activeConnections + 1);
            expect(scopedA.connections).toHaveLength(scopedA.activeConnections);
        } finally {
            await harness.close();
            await cleanupSeededRows();
        }
    });
});
