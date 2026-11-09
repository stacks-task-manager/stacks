// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
    CalendarEntity,
    PermissionEntity,
    RateLimitCounterEntity,
    RoleEntity,
    SessionEntity,
    TenantEntity,
    UserEntity,
} from "@stacks/db";
import { ROLE_SECTIONS } from "@stacks/types";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { Op } from "sequelize";
import app from "../../src/index";
import { issueSession } from "../../src/services/sessions";
import { rateLimitKeyHash } from "../../src/utils/rateLimit";

const fixtureRows: Array<{ entity: any; id: string }> = [];
const rateLimitedUserIds: string[] = [];
let viewerHeaders: Record<string, string>;
let peerCalendarId: string;
let tenant: string;
let viewerCalendarId: string;
let adminTargetCalendarId: string;
let foreignAdminHeaders: Record<string, string>;
let sameTenantAdminHeaders: Record<string, string>;

describe("calendar tenant-default authorization", () => {
    beforeAll(async () => {
        const { email } = JSON.parse(readFileSync("testUser.json", "utf8")) as { email: string };
        const baseUser = await UserEntity.findOne({ where: { email } });
        expect(baseUser).not.toBeNull();
        tenant = String(baseUser!.get("tenant"));
        const calendarWriterRole = await RoleEntity.create({
            title: `Calendar writer ${randomUUID()}`,
            description: "temporary security fixture",
            access: { [ROLE_SECTIONS.CALENDAR]: { read: true, write: true } },
            disabled: false,
            tenant,
            createdBy: String(baseUser!.get("id")),
            updatedBy: String(baseUser!.get("id")),
        });
        const calendarWriterRoleId = String(calendarWriterRole.get("id"));
        fixtureRows.push({ entity: RoleEntity, id: calendarWriterRoleId });
        const sameTenantAdmin = await UserEntity.create({
            email: `same-tenant-calendar-admin-${randomUUID()}@example.test`,
            password: "test-password",
            firstName: "Same Tenant",
            lastName: "Calendar Admin",
            role: calendarWriterRoleId,
            tenant,
            admin: true,
            real: false,
        });
        const sameTenantAdminId = String(sameTenantAdmin.get("id"));
        fixtureRows.push({ entity: UserEntity, id: sameTenantAdminId });
        rateLimitedUserIds.push(sameTenantAdminId);
        const sameTenantAdminSession = await issueSession(sameTenantAdminId, tenant, 120);
        fixtureRows.push({ entity: SessionEntity, id: sameTenantAdminSession.sid });
        sameTenantAdminHeaders = { Authorization: `Bearer ${sameTenantAdminSession.token}` };

        const viewer = await UserEntity.create({
            email: `viewer-calendar-default-${randomUUID()}@example.test`,
            password: "test-password",
            firstName: "Viewer",
            lastName: "Calendar Default Security Test",
            role: calendarWriterRoleId,
            tenant,
            admin: false,
            real: false,
        });
        const viewerId = String(viewer.get("id"));
        fixtureRows.push({ entity: UserEntity, id: viewerId });
        rateLimitedUserIds.push(viewerId);
        const session = await issueSession(viewerId, tenant, 120);
        fixtureRows.push({ entity: SessionEntity, id: session.sid });
        viewerHeaders = { Authorization: `Bearer ${session.token}` };

        const createResponse = await app.request("/api/calendars", {
            method: "POST",
            headers: { ...viewerHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({ title: "Viewer calendar", primary: false }),
        });
        expect(createResponse.status).toBe(200);
        viewerCalendarId = (await createResponse.json()).data.id;
        fixtureRows.push({ entity: CalendarEntity, id: viewerCalendarId });
        fixtureRows.push({ entity: PermissionEntity, id: viewerCalendarId });

        const peer = await UserEntity.create({
            email: `peer-calendar-${randomUUID()}@example.test`,
            password: "test-password",
            firstName: "Peer",
            lastName: "Calendar Security Test",
            role: calendarWriterRoleId,
            tenant,
            admin: false,
            real: false,
        });
        const peerId = String(peer.get("id"));
        fixtureRows.push({ entity: UserEntity, id: peerId });
        rateLimitedUserIds.push(peerId);
        const peerSession = await issueSession(peerId, tenant, 120);
        fixtureRows.push({ entity: SessionEntity, id: peerSession.sid });
        const peerCalendarResponse = await app.request("/api/calendars", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${peerSession.token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ title: "Peer calendar", primary: false }),
        });
        expect(peerCalendarResponse.status).toBe(200);
        peerCalendarId = (await peerCalendarResponse.json()).data.id;
        fixtureRows.push({ entity: CalendarEntity, id: peerCalendarId });
        fixtureRows.push({ entity: PermissionEntity, id: peerCalendarId });
        const adminTargetResponse = await app.request("/api/calendars", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${peerSession.token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ title: "Admin target calendar", primary: false }),
        });
        expect(adminTargetResponse.status).toBe(200);
        adminTargetCalendarId = (await adminTargetResponse.json()).data.id;
        fixtureRows.push({ entity: CalendarEntity, id: adminTargetCalendarId });
        fixtureRows.push({ entity: PermissionEntity, id: adminTargetCalendarId });

        const foreignTenant = await TenantEntity.create({
            title: `Foreign calendar tenant ${randomUUID()}`,
            description: "temporary security fixture",
            expiry: new Date(Date.now() + 60 * 60 * 1000),
        });
        const foreignTenantId = String(foreignTenant.get("id"));
        fixtureRows.push({ entity: TenantEntity, id: foreignTenantId });
        const foreignRole = await RoleEntity.create({
            title: `Foreign calendar admin role ${randomUUID()}`,
            description: "temporary security fixture",
            access: {},
            disabled: false,
            tenant: foreignTenantId,
            createdBy: viewerId,
            updatedBy: viewerId,
        });
        const foreignRoleId = String(foreignRole.get("id"));
        fixtureRows.push({ entity: RoleEntity, id: foreignRoleId });
        const foreignAdmin = await UserEntity.create({
            email: `foreign-calendar-admin-${randomUUID()}@example.test`,
            password: "test-password",
            firstName: "Foreign Calendar",
            lastName: "Admin",
            role: foreignRoleId,
            tenant: foreignTenantId,
            admin: true,
            real: false,
        });
        const foreignAdminId = String(foreignAdmin.get("id"));
        fixtureRows.push({ entity: UserEntity, id: foreignAdminId });
        rateLimitedUserIds.push(foreignAdminId);
        const foreignAdminSession = await issueSession(foreignAdminId, foreignTenantId, 120);
        fixtureRows.push({ entity: SessionEntity, id: foreignAdminSession.sid });
        foreignAdminHeaders = { Authorization: `Bearer ${foreignAdminSession.token}` };
    });

    afterAll(async () => {
        const cleanupErrors: unknown[] = [];
        const keyHashes = rateLimitedUserIds.map(userId =>
            rateLimitKeyHash("authenticated-api-user", userId)
        );
        if (keyHashes.length) {
            try {
                await RateLimitCounterEntity.destroy({ where: { keyHash: { [Op.in]: keyHashes } } });
                expect(
                    await RateLimitCounterEntity.count({ where: { keyHash: { [Op.in]: keyHashes } } })
                ).toBe(0);
            } catch (error) {
                cleanupErrors.push(error);
            }
        }
        for (const { entity, id } of fixtureRows.reverse()) {
            try {
                await entity.destroy({ where: { id }, force: true });
            } catch (error) {
                cleanupErrors.push(error);
            }
        }
        fixtureRows.length = 0;
        if (cleanupErrors.length) {
            throw new AggregateError(cleanupErrors, "Failed to clean up calendar default fixtures");
        }
    });

    it("denies viewers default creation and changing an owned calendar to default", async () => {
        const before = await CalendarEntity.count({ where: { tenant, primary: true, deleted: null } });
        const createResponse = await app.request("/api/calendars", {
            method: "POST",
            headers: { ...viewerHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({ title: "Forged default", primary: true }),
        });
        const updateResponse = await app.request(`/api/calendars/${viewerCalendarId}`, {
            method: "PATCH",
            headers: { ...viewerHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({ primary: true }),
        });

        expect(createResponse.status).toBe(403);
        expect(updateResponse.status).toBe(403);
        expect(await CalendarEntity.count({ where: { tenant, primary: true, deleted: null } })).toBe(before);
        expect((await CalendarEntity.findByPk(viewerCalendarId))?.get("primary")).toBe(false);
    });

    it("allows calendar readers to list calendars but denies all write methods", async () => {
        const { email } = JSON.parse(readFileSync("testUser.json", "utf8")) as { email: string };
        const baseUser = await UserEntity.findOne({ where: { email } });
        expect(baseUser).not.toBeNull();
        const readerRole = await RoleEntity.create({
            title: `Calendar reader ${randomUUID()}`,
            description: "temporary read-only calendar fixture",
            access: { [ROLE_SECTIONS.CALENDAR]: { read: true } },
            disabled: false,
            tenant,
            createdBy: String(baseUser!.get("id")),
            updatedBy: String(baseUser!.get("id")),
        });
        const readerRoleId = String(readerRole.get("id"));
        fixtureRows.push({ entity: RoleEntity, id: readerRoleId });

        const reader = await UserEntity.create({
            email: `calendar-reader-${randomUUID()}@example.test`,
            password: "test-password",
            firstName: "Calendar",
            lastName: "Reader",
            role: readerRoleId,
            tenant,
            admin: false,
            real: false,
        });
        const readerId = String(reader.get("id"));
        fixtureRows.push({ entity: UserEntity, id: readerId });
        rateLimitedUserIds.push(readerId);
        const readerSession = await issueSession(readerId, tenant, 120);
        fixtureRows.push({ entity: SessionEntity, id: readerSession.sid });
        const readerHeaders = { Authorization: `Bearer ${readerSession.token}` };

        const calendarId = randomUUID();
        await CalendarEntity.create({
            id: calendarId,
            title: "Read-only calendar",
            source: "local",
            primary: false,
            tenant,
            createdBy: readerId,
            updatedBy: readerId,
        });
        fixtureRows.push({ entity: CalendarEntity, id: calendarId });
        await PermissionEntity.create({
            id: calendarId,
            owner: readerId,
            isPublic: false,
            visibleUsers: [],
            visibleRoles: [],
            tenant,
            createdBy: readerId,
            updatedBy: readerId,
        });
        fixtureRows.push({ entity: PermissionEntity, id: calendarId });

        const listResponse = await app.request("/api/calendars", { headers: readerHeaders });
        expect(listResponse.status).toBe(200);
        const listed = (await listResponse.json()).data as Array<{ id: string }>;
        expect(listed.map(calendar => calendar.id)).toContain(calendarId);

        const createResponse = await app.request("/api/calendars", {
            method: "POST",
            headers: { ...readerHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({ title: "Forged calendar", primary: false }),
        });
        const updateResponse = await app.request(`/api/calendars/${calendarId}`, {
            method: "PATCH",
            headers: { ...readerHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({ title: "Forged calendar edit" }),
        });
        const deleteResponse = await app.request(`/api/calendars/${calendarId}`, {
            method: "DELETE",
            headers: readerHeaders,
        });

        expect(createResponse.status).toBe(403);
        expect(updateResponse.status).toBe(403);
        expect(deleteResponse.status).toBe(403);
        const unchanged = await CalendarEntity.findByPk(calendarId);
        expect(unchanged?.get("title")).toBe("Read-only calendar");
        expect(unchanged?.get("deleted")).toBeNull();
        expect(await CalendarEntity.count({ where: { tenant, title: "Forged calendar" } })).toBe(0);
    });

    it("denies viewers updating or deleting a different user's calendar", async () => {
        const calendar = await CalendarEntity.findByPk(peerCalendarId);
        expect(calendar).not.toBeNull();
        const originalTitle = String(calendar!.get("title"));
        const headers = { ...viewerHeaders, "Content-Type": "application/json" };

        const updateResponse = await app.request(`/api/calendars/${peerCalendarId}`, {
            method: "PATCH",
            headers,
            body: JSON.stringify({ title: "forged peer calendar edit" }),
        });
        const deleteResponse = await app.request(`/api/calendars/${peerCalendarId}`, {
            method: "DELETE",
            headers,
        });

        expect(updateResponse.status).toBe(403);
        expect(deleteResponse.status).toBe(403);
        const unchanged = await CalendarEntity.findByPk(peerCalendarId);
        expect(unchanged?.get("title")).toBe(originalTitle);
        expect(unchanged?.get("deleted")).toBeNull();
        expect(await PermissionEntity.findByPk(peerCalendarId)).not.toBeNull();
    });

    it("allows a same-tenant admin to update and delete another user's calendar", async () => {
        const updateResponse = await app.request(`/api/calendars/${adminTargetCalendarId}`, {
            method: "PATCH",
            headers: { ...sameTenantAdminHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({ title: "updated by same-tenant admin" }),
        });

        expect(updateResponse.status).toBe(200);
        expect((await CalendarEntity.findByPk(adminTargetCalendarId))?.get("title")).toBe(
            "updated by same-tenant admin"
        );

        const deleteResponse = await app.request(`/api/calendars/${adminTargetCalendarId}`, {
            method: "DELETE",
            headers: sameTenantAdminHeaders,
        });

        expect(deleteResponse.status).toBe(200);
        expect((await CalendarEntity.findByPk(adminTargetCalendarId))?.get("deleted")).not.toBeNull();
    });

    it("denies a foreign-tenant admin updating or deleting another tenant's calendar", async () => {
        const calendar = await CalendarEntity.findByPk(peerCalendarId);
        expect(calendar).not.toBeNull();
        const originalTitle = String(calendar!.get("title"));

        const updateResponse = await app.request(`/api/calendars/${peerCalendarId}`, {
            method: "PATCH",
            headers: { ...foreignAdminHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({ title: "forged foreign admin edit" }),
        });
        const deleteResponse = await app.request(`/api/calendars/${peerCalendarId}`, {
            method: "DELETE",
            headers: foreignAdminHeaders,
        });

        expect(updateResponse.status).toBe(404);
        expect(deleteResponse.status).toBe(404);
        const unchanged = await CalendarEntity.findByPk(peerCalendarId);
        expect(unchanged?.get("title")).toBe(originalTitle);
        expect(unchanged?.get("deleted")).toBeNull();
        expect(await PermissionEntity.findByPk(peerCalendarId)).not.toBeNull();
    });
});
