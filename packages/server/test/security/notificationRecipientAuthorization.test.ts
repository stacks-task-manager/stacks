// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NotificationEntity, RoleEntity, TenantEntity, UserEntity } from "@stacks/db";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import app from "../../src/index";
import { getAuthToken, mintSessionToken } from "../helpers/authHelper";

const createdNotificationIds: string[] = [];
const additionalFixtureRows: Array<{ entity: any; id: string }> = [];
let headers: Record<string, string>;
let callerNotificationId: string;
let otherUserNotificationId: string;
let tenant: string;
let callerId: string;
let otherUserId: string;
let foreignNotificationId: string;
let foreignNotificationMessage: string;
let adminUserId: string;
let adminToken: string;
let adminSessionRow: any;

describe("notification recipient authorization", () => {
    beforeAll(async () => {
        const { email } = JSON.parse(readFileSync("testUser.json", "utf8")) as { email: string };
        const caller = await UserEntity.findOne({ where: { email } });
        expect(caller).not.toBeNull();
        callerId = String(caller!.get("id"));
        tenant = String(caller!.get("tenant"));
        headers = {
            Authorization: `Bearer ${await getAuthToken()}`,
            "Content-Type": "application/json",
        };

        const otherUser = await UserEntity.create({
            email: `other-notification-${randomUUID()}@example.test`,
            password: "test-password",
            firstName: "Other",
            lastName: "Notification User",
            role: String(caller!.get("role")),
            tenant,
            real: false,
        });
        otherUserId = String(otherUser.get("id"));

        const callerNotification = await NotificationEntity.create({
            subject: "Caller notification fixture",
            message: "owned by the caller",
            recipient: callerId,
            tenant,
            createdBy: callerId,
            updatedBy: callerId,
        });
        callerNotificationId = String(callerNotification.get("id"));
        createdNotificationIds.push(callerNotificationId);

        const otherUserNotification = await NotificationEntity.create({
            subject: "Other notification fixture",
            message: "owned by another same-tenant user",
            recipient: otherUserId,
            tenant,
            createdBy: otherUserId,
            updatedBy: otherUserId,
        });
        otherUserNotificationId = String(otherUserNotification.get("id"));
        createdNotificationIds.push(otherUserNotificationId);

        const admin = await UserEntity.create({
            email: `admin-notification-${randomUUID()}@example.test`,
            password: "test-password",
            firstName: "Notification",
            lastName: "Admin",
            role: String(caller!.get("role")),
            tenant,
            admin: true,
            real: false,
        });
        adminUserId = String(admin.get("id"));
        additionalFixtureRows.push({ entity: UserEntity, id: adminUserId });
        const adminSession = await mintSessionToken(adminUserId, tenant, 600);
        adminToken = adminSession.token;
        adminSessionRow = adminSession.row;

        const foreignTenant = await TenantEntity.create({
            title: `Foreign notification tenant ${randomUUID()}`,
            description: "temporary security fixture",
            expiry: new Date(Date.now() + 60 * 60 * 1000),
        });
        const foreignTenantId = String(foreignTenant.get("id"));
        additionalFixtureRows.push({ entity: TenantEntity, id: foreignTenantId });
        const systemUser = await UserEntity.findOne({ where: { system: true } });
        expect(systemUser).not.toBeNull();
        const foreignRole = await RoleEntity.create({
            title: `Foreign notification role ${randomUUID()}`,
            description: "temporary security fixture",
            access: {},
            disabled: false,
            tenant: foreignTenantId,
            createdBy: String(systemUser!.get("id")),
            updatedBy: String(systemUser!.get("id")),
        });
        const foreignRoleId = String(foreignRole.get("id"));
        additionalFixtureRows.push({ entity: RoleEntity, id: foreignRoleId });
        const foreignUser = await UserEntity.create({
            email: `foreign-notification-${randomUUID()}@example.test`,
            password: "test-password",
            firstName: "Foreign",
            lastName: "Notification User",
            role: foreignRoleId,
            tenant: foreignTenantId,
            real: false,
        });
        const foreignUserId = String(foreignUser.get("id"));
        additionalFixtureRows.push({ entity: UserEntity, id: foreignUserId });
        foreignNotificationMessage = `Foreign notification secret ${randomUUID()}`;
        const foreignNotification = await NotificationEntity.create({
            subject: "Foreign tenant notification",
            message: foreignNotificationMessage,
            recipient: foreignUserId,
            tenant: foreignTenantId,
            createdBy: foreignUserId,
            updatedBy: foreignUserId,
        });
        foreignNotificationId = String(foreignNotification.get("id"));
        createdNotificationIds.push(foreignNotificationId);
    });

    afterAll(async () => {
        const cleanupErrors: unknown[] = [];
        for (const id of createdNotificationIds) {
            try {
                await NotificationEntity.destroy({ where: { id }, force: true });
            } catch (error) {
                cleanupErrors.push(error);
            }
        }
        try {
            if (adminSessionRow) await adminSessionRow.destroy({ force: true });
        } catch (error) {
            cleanupErrors.push(error);
        }
        try {
            if (otherUserId) await UserEntity.destroy({ where: { id: otherUserId }, force: true });
        } catch (error) {
            cleanupErrors.push(error);
        }
        for (const { entity, id } of additionalFixtureRows.reverse()) {
            try {
                await entity.destroy({ where: { id }, force: true });
            } catch (error) {
                cleanupErrors.push(error);
            }
        }
        if (cleanupErrors.length) {
            throw new AggregateError(cleanupErrors, "Failed to clean up notification authorization fixtures");
        }
    });

    it("lists only unread notifications addressed to the caller", async () => {
        const response = await app.request("/api/notifications", { headers });
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.data.map((notification: { id: string }) => notification.id)).toContain(
            callerNotificationId
        );
        expect(body.data.map((notification: { id: string }) => notification.id)).not.toContain(
            otherUserNotificationId
        );
    });

    it("hides another same-tenant user's notification when marking it as read", async () => {
        const response = await app.request(`/api/notifications/${otherUserNotificationId}`, {
            method: "PATCH",
            headers,
        });
        const missing = await app.request(`/api/notifications/${randomUUID()}`, {
            method: "PATCH",
            headers,
        });

        expect(response.status).toBe(404);
        expect(response.status).toBe(missing.status);
        expect(await response.text()).not.toContain("Other notification fixture");
        expect((await NotificationEntity.findByPk(otherUserNotificationId))?.get("read")).toBe(false);
    });

    it("hides another same-tenant user's notification when deleting it", async () => {
        const response = await app.request(`/api/notifications/${otherUserNotificationId}`, {
            method: "DELETE",
            headers,
        });
        const missing = await app.request(`/api/notifications/${randomUUID()}`, {
            method: "DELETE",
            headers,
        });

        expect(response.status).toBe(404);
        expect(response.status).toBe(missing.status);
        expect(await response.text()).not.toContain("Other notification fixture");
        expect(await NotificationEntity.findByPk(otherUserNotificationId)).not.toBeNull();
    });

    it("keeps foreign-tenant notifications hidden from a same-tenant administrator", async () => {
        const adminHeaders = { Authorization: `Bearer ${adminToken}` };
        const read = await app.request(`/api/notifications/${foreignNotificationId}`, {
            method: "PATCH",
            headers: adminHeaders,
        });
        const readBody = await read.text();
        expect(read.status).toBe(404);
        expect(readBody).not.toContain(foreignNotificationMessage);

        const remove = await app.request(`/api/notifications/${foreignNotificationId}`, {
            method: "DELETE",
            headers: adminHeaders,
        });
        const removeBody = await remove.text();
        expect(remove.status).toBe(404);
        expect(removeBody).not.toContain(foreignNotificationMessage);
        expect(await NotificationEntity.findByPk(foreignNotificationId)).not.toBeNull();
    });

    it("allows the recipient to mark their own notification as read and delete it", async () => {
        const readResponse = await app.request(`/api/notifications/${callerNotificationId}`, {
            method: "PATCH",
            headers,
        });
        expect(readResponse.status).toBe(200);
        expect((await NotificationEntity.findByPk(callerNotificationId))?.get("read")).toBe(true);

        const deleteResponse = await app.request(`/api/notifications/${callerNotificationId}`, {
            method: "DELETE",
            headers,
        });
        expect(deleteResponse.status).toBe(200);
        expect(await NotificationEntity.findByPk(callerNotificationId)).toBeNull();
    });
});
