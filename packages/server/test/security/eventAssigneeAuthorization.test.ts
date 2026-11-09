import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import {
    EventEntity,
    PermissionEntity,
    RateLimitCounterEntity,
    RoleEntity,
    SessionEntity,
    TenantEntity,
    UserEntity,
} from "@stacks/db";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { ROLE_SECTIONS } from "@stacks/types";
import app from "../../src/index";
import { rateLimitKeyHash } from "../../src/utils/rateLimit";
import { issueSession } from "../../src/services/sessions";

const fixtureRows: Array<{ entity: any; id: string }> = [];
const persistentFixtureRows: Array<{ entity: any; id: string }> = [];
const rateLimitedUserIds: string[] = [];
let headers: Record<string, string>;

afterEach(async () => {
    const keyHashes = rateLimitedUserIds.map(userId => rateLimitKeyHash("authenticated-api-user", userId));
    if (keyHashes.length) {
        await RateLimitCounterEntity.destroy({ where: { keyHash: keyHashes } });
        expect(await RateLimitCounterEntity.count({ where: { keyHash: keyHashes } })).toBe(0);
    }
    rateLimitedUserIds.length = 0;

    for (const { entity, id } of fixtureRows.reverse()) {
        await entity.destroy({ where: { id }, force: true });
    }
    fixtureRows.length = 0;
});

afterAll(async () => {
    for (const { entity, id } of persistentFixtureRows.reverse()) {
        await entity.destroy({ where: { id }, force: true });
    }
    persistentFixtureRows.length = 0;
});

describe("event assignee tenant authorization", () => {
    let callerId: string;

    beforeAll(async () => {
        const credentials = JSON.parse(readFileSync("testUser.json", "utf8")) as { email: string };
        const baseUser = await UserEntity.findOne({ where: { email: credentials.email } });
        expect(baseUser).not.toBeNull();
        const tenant = String(baseUser!.get("tenant"));
        const role = await RoleEntity.create({
            title: `Event writer ${randomUUID()}`,
            description: "temporary security fixture",
            access: { [ROLE_SECTIONS.CALENDAR]: { read: true, write: true } },
            disabled: false,
            tenant,
            createdBy: String(baseUser!.get("id")),
            updatedBy: String(baseUser!.get("id")),
        });
        const roleId = String(role.get("id"));
        persistentFixtureRows.push({ entity: RoleEntity, id: roleId });
        const caller = await UserEntity.create({
            email: `event-writer-${randomUUID()}@example.test`,
            password: "test-password",
            firstName: "Event",
            lastName: "Writer",
            role: roleId,
            tenant,
            admin: false,
            real: false,
        });
        callerId = String(caller.get("id"));
        persistentFixtureRows.push({ entity: UserEntity, id: callerId });
        const session = await issueSession(callerId, tenant, 120);
        persistentFixtureRows.push({ entity: SessionEntity, id: session.sid });
        headers = { Authorization: `Bearer ${session.token}`, "Content-Type": "application/json" };
    });

    const createForeignUser = async () => {
        const tenant = await TenantEntity.create({
            title: `Event assignee tenant ${randomUUID()}`,
            description: "temporary security fixture",
            expiry: new Date(Date.now() + 60 * 60 * 1000),
        });
        fixtureRows.push({ entity: TenantEntity, id: String(tenant.get("id")) });

        const role = await RoleEntity.create({
            title: "Event assignee user",
            description: "temporary security fixture",
            access: {},
            disabled: false,
            tenant: String(tenant.get("id")),
            createdBy: callerId,
            updatedBy: callerId,
        });
        fixtureRows.push({ entity: RoleEntity, id: String(role.get("id")) });

        const user = await UserEntity.create({
            email: `event-assignee-${randomUUID()}@example.test`,
            password: "test-password",
            firstName: "Foreign",
            lastName: "Assignee",
            role: String(role.get("id")),
            tenant: String(tenant.get("id")),
            real: false,
        });
        fixtureRows.push({ entity: UserEntity, id: String(user.get("id")) });
        return String(user.get("id"));
    };

    const createEvent = async (assignees: string[] = [], extraFields: Record<string, unknown> = {}) => {
        const start = new Date(Date.now() + 60_000);
        const response = await app.request("/api/events", {
            method: "POST",
            headers,
            body: JSON.stringify({
                title: "Event assignee authorization fixture",
                start: start.toISOString(),
                end: new Date(start.getTime() + 60_000).toISOString(),
                assignees,
                ...extraFields,
            }),
        });
        const body = await response.json();
        if (response.ok) {
            fixtureRows.push({ entity: PermissionEntity, id: body.data.id });
            fixtureRows.push({ entity: EventEntity, id: body.data.id });
        }
        return { response, body };
    };

    test("allows a same-tenant assignee", async () => {
        const { response, body } = await createEvent([callerId]);

        expect(response.status).toBe(200);
        expect(body.data.assignees).toEqual([callerId]);
    });

    test("ignores forged event identity and tenant fields on creation", async () => {
        const forgedId = randomUUID();
        const { response, body } = await createEvent([], {
            id: forgedId,
            tenant: randomUUID(),
            createdBy: randomUUID(),
            updatedBy: randomUUID(),
        });

        const saved = await EventEntity.findByPk(body.data.id);
        const permission = await PermissionEntity.findByPk(body.data.id);
        expect(response.status).toBe(200);
        expect(body.data.id).not.toBe(forgedId);
        expect(saved?.get("tenant")).toBe(String((await UserEntity.findByPk(callerId))?.get("tenant")));
        expect(saved?.get("createdBy")).toBe(callerId);
        expect(saved?.get("updatedBy")).toBe(callerId);
        expect(permission?.get("owner")).toBe(callerId);
    });

    test("rejects a foreign-tenant assignee when creating an event", async () => {
        const foreignUserId = await createForeignUser();

        const { response } = await createEvent([foreignUserId]);

        expect(response.status).toBe(404);
        expect(await EventEntity.count({ where: { title: "Event assignee authorization fixture" } })).toBe(0);
    });

    test("rejects a foreign-tenant assignee update without changing the event", async () => {
        const { response: createResponse, body } = await createEvent();
        expect(createResponse.status).toBe(200);
        const foreignUserId = await createForeignUser();

        const updateResponse = await app.request(`/api/events/${body.data.id}`, {
            method: "PATCH",
            headers,
            body: JSON.stringify({ assignees: [foreignUserId] }),
        });

        expect(updateResponse.status).toBe(404);
        const saved = await EventEntity.findByPk(body.data.id);
        expect(saved?.get("assignees")).toEqual([]);
    });

    test("denies a same-tenant viewer mutating a public event owned by another user", async () => {
        const { response: createResponse, body } = await createEvent();
        expect(createResponse.status).toBe(200);
        const caller = await UserEntity.findByPk(callerId);
        expect(caller).not.toBeNull();
        const viewer = await UserEntity.create({
            email: `event-viewer-${randomUUID()}@example.test`,
            password: "test-password",
            firstName: "Event Viewer",
            lastName: "Authorization Test",
            role: String(caller!.get("role")),
            tenant: String(caller!.get("tenant")),
            admin: false,
            real: false,
        });
        const viewerId = String(viewer.get("id"));
        fixtureRows.push({ entity: UserEntity, id: viewerId });
        const session = await issueSession(viewerId, String(caller!.get("tenant")), 120);
        fixtureRows.push({ entity: SessionEntity, id: session.sid });
        const viewerHeaders = {
            Authorization: `Bearer ${session.token}`,
            "Content-Type": "application/json",
        };
        const foreignUserId = await createForeignUser();

        const sameTenantAssigneeResponse = await app.request(`/api/events/${body.data.id}`, {
            method: "PATCH",
            headers: viewerHeaders,
            body: JSON.stringify({ assignees: [callerId] }),
        });
        const foreignTenantAssigneeResponse = await app.request(`/api/events/${body.data.id}`, {
            method: "PATCH",
            headers: viewerHeaders,
            body: JSON.stringify({ assignees: [foreignUserId] }),
        });

        const updateResponse = await app.request(`/api/events/${body.data.id}`, {
            method: "PATCH",
            headers: viewerHeaders,
            body: JSON.stringify({ title: "forged public event edit" }),
        });
        const savedBeforeMove = await EventEntity.findByPk(body.data.id);
        const moveResponse = await app.request(`/api/events/${body.data.id}/move`, {
            method: "PATCH",
            headers: viewerHeaders,
            body: JSON.stringify({ calendar: String(savedBeforeMove?.get("calendar")), source: "local" }),
        });
        const deleteResponse = await app.request(`/api/events/${body.data.id}`, {
            method: "DELETE",
            headers: viewerHeaders,
        });

        expect(sameTenantAssigneeResponse.status).toBe(403);
        expect(foreignTenantAssigneeResponse.status).toBe(403);
        expect(updateResponse.status).toBe(403);
        expect(moveResponse.status).toBe(403);
        expect(deleteResponse.status).toBe(403);
        const saved = await EventEntity.findByPk(body.data.id);
        expect(saved?.get("title")).toBe("Event assignee authorization fixture");
        expect(saved?.get("deleted")).toBeNull();
        expect((await PermissionEntity.findByPk(body.data.id))?.get("owner")).toBe(callerId);
    });

    test("allows calendar reads but denies event mutations to a read-only calendar role", async () => {
        const { response: createResponse, body } = await createEvent();
        expect(createResponse.status).toBe(200);

        const caller = await UserEntity.findByPk(callerId);
        expect(caller).not.toBeNull();
        const tenant = String(caller!.get("tenant"));
        const readerRole = await RoleEntity.create({
            title: `Event calendar reader ${randomUUID()}`,
            description: "temporary read-only event fixture",
            access: { [ROLE_SECTIONS.CALENDAR]: { read: true, write: false } },
            disabled: false,
            tenant,
            createdBy: callerId,
            updatedBy: callerId,
        });
        fixtureRows.push({ entity: RoleEntity, id: String(readerRole.get("id")) });

        const reader = await UserEntity.create({
            email: `event-calendar-reader-${randomUUID()}@example.test`,
            password: "test-password",
            firstName: "Calendar Reader",
            lastName: "Authorization Test",
            role: String(readerRole.get("id")),
            tenant,
            admin: false,
            real: false,
        });
        const readerId = String(reader.get("id"));
        fixtureRows.push({ entity: UserEntity, id: readerId });
        rateLimitedUserIds.push(readerId);
        const session = await issueSession(readerId, tenant, 120);
        fixtureRows.push({ entity: SessionEntity, id: session.sid });
        const readerHeaders = {
            Authorization: `Bearer ${session.token}`,
            "Content-Type": "application/json",
        };

        const calendarRead = await app.request("/api/calendars", { headers: readerHeaders });
        expect(calendarRead.status).toBe(200);

        const eventId = String(body.data.id);
        const storedEvent = await EventEntity.findByPk(eventId);
        expect(storedEvent).not.toBeNull();
        const eventFrom = new Date(Date.parse(body.data.start) - 1_000).toISOString();
        const eventTo = new Date(Date.parse(body.data.end) + 1_000).toISOString();
        const readQuery = new URLSearchParams({ from: eventFrom, to: eventTo, calendars: "local" });
        const eventsRead = await app.request(`/api/events?${readQuery}`, { headers: readerHeaders });
        expect(eventsRead.status).toBe(200);
        const eventsReadBody = await eventsRead.json();
        expect(eventsReadBody.data.map((event: { id: string }) => event.id)).toContain(eventId);
        const eventCountRead = await app.request(
            `/api/events/count?${new URLSearchParams({ from: eventFrom, to: eventTo })}`,
            { headers: readerHeaders }
        );
        expect(eventCountRead.status).toBe(200);
        expect((await eventCountRead.json()).data).toBeGreaterThanOrEqual(1);

        const start = new Date(Date.now() + 60_000);
        const createAttemptTitle = `Read-only event create ${randomUUID()}`;
        const responses = await Promise.all([
            app.request("/api/events", {
                method: "POST",
                headers: readerHeaders,
                body: JSON.stringify({
                    title: createAttemptTitle,
                    start: start.toISOString(),
                    end: new Date(start.getTime() + 60_000).toISOString(),
                    assignees: [],
                }),
            }),
            app.request(`/api/events/${eventId}`, {
                method: "PATCH",
                headers: readerHeaders,
                body: JSON.stringify({ title: "Read-only event edit attempt" }),
            }),
            app.request(`/api/events/${eventId}/move`, {
                method: "PATCH",
                headers: readerHeaders,
                body: JSON.stringify({ calendar: storedEvent!.get("calendar"), source: "local" }),
            }),
            app.request(`/api/events/${eventId}`, { method: "DELETE", headers: readerHeaders }),
        ]);

        expect(responses.map(response => response.status)).toEqual([403, 403, 403, 403]);
        const unchangedEvent = await EventEntity.findByPk(eventId);
        expect(unchangedEvent?.get("title")).toBe("Event assignee authorization fixture");
        expect(unchangedEvent?.get("calendar")).toBe(storedEvent!.get("calendar"));
        expect(unchangedEvent?.get("deleted")).toBeNull();
        expect(await EventEntity.count({ where: { title: createAttemptTitle, tenant } })).toBe(0);
    });

    test("keeps another tenant's admin from mutating the event", async () => {
        const ownerEventTitle = `Owner event read sentinel ${randomUUID()}`;
        const { response: createResponse, body } = await createEvent([], { title: ownerEventTitle });
        expect(createResponse.status).toBe(200);

        const tenant = await TenantEntity.create({
            title: `Foreign event admin tenant ${randomUUID()}`,
            description: "temporary security fixture",
            expiry: new Date(Date.now() + 60 * 60 * 1000),
        });
        const tenantId = String(tenant.get("id"));
        fixtureRows.push({ entity: TenantEntity, id: tenantId });
        const caller = await UserEntity.findByPk(callerId);
        expect(caller).not.toBeNull();
        const role = await RoleEntity.create({
            title: `Foreign event admin ${randomUUID()}`,
            description: "temporary security fixture",
            access: {},
            admin: true,
            disabled: false,
            tenant: tenantId,
            createdBy: callerId,
            updatedBy: callerId,
        });
        const roleId = String(role.get("id"));
        fixtureRows.push({ entity: RoleEntity, id: roleId });
        const admin = await UserEntity.create({
            email: `foreign-event-admin-${randomUUID()}@example.test`,
            password: "test-password",
            firstName: "Foreign Event Admin",
            lastName: "Authorization Test",
            role: roleId,
            tenant: tenantId,
            admin: true,
            real: false,
        });
        const adminId = String(admin.get("id"));
        fixtureRows.push({ entity: UserEntity, id: adminId });
        const session = await issueSession(adminId, tenantId, 120);
        fixtureRows.push({ entity: SessionEntity, id: session.sid });
        const adminHeaders = {
            Authorization: `Bearer ${session.token}`,
            "Content-Type": "application/json",
        };

        const foreignEventTitle = `Foreign event read sentinel ${randomUUID()}`;
        const foreignEventResponse = await app.request("/api/events", {
            method: "POST",
            headers: adminHeaders,
            body: JSON.stringify({
                title: foreignEventTitle,
                start: body.data.start,
                end: body.data.end,
                source: "local",
            }),
        });
        expect(foreignEventResponse.status).toBe(200);
        const foreignEventBody = await foreignEventResponse.json();
        const foreignEventId = String(foreignEventBody.data.id);
        fixtureRows.push({ entity: PermissionEntity, id: foreignEventId });
        fixtureRows.push({ entity: EventEntity, id: foreignEventId });
        const eventFrom = new Date(Date.parse(body.data.start) - 1_000).toISOString();
        const eventTo = new Date(Date.parse(body.data.end) + 1_000).toISOString();
        const readQuery = new URLSearchParams({ from: eventFrom, to: eventTo, calendars: "local" });
        const foreignEventsRead = await app.request(`/api/events?${readQuery}`, { headers: adminHeaders });
        expect(foreignEventsRead.status).toBe(200);
        const foreignEventsBody = await foreignEventsRead.json();
        const foreignVisibleEventIds = foreignEventsBody.data.map((event: { id: string }) => event.id);
        expect(foreignVisibleEventIds).toContain(foreignEventId);
        expect(foreignVisibleEventIds).not.toContain(body.data.id);
        expect(JSON.stringify(foreignEventsBody)).not.toContain(ownerEventTitle);
        const foreignEventCount = await app.request(
            `/api/events/count?${new URLSearchParams({ from: eventFrom, to: eventTo })}`,
            { headers: adminHeaders }
        );
        expect(foreignEventCount.status).toBe(200);
        expect((await foreignEventCount.json()).data).toBe(1);

        const updateResponse = await app.request(`/api/events/${body.data.id}`, {
            method: "PATCH",
            headers: adminHeaders,
            body: JSON.stringify({ title: "foreign admin edit" }),
        });
        const deleteResponse = await app.request(`/api/events/${body.data.id}`, {
            method: "DELETE",
            headers: adminHeaders,
        });

        expect(updateResponse.status).toBe(404);
        expect(deleteResponse.status).toBe(404);
        const saved = await EventEntity.findByPk(body.data.id);
        expect(saved?.get("title")).toBe(ownerEventTitle);
        expect(saved?.get("deleted")).toBeNull();
        expect((await PermissionEntity.findByPk(body.data.id))?.get("owner")).toBe(callerId);
    });
});
