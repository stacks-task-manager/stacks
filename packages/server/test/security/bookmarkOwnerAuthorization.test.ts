// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
    BookmarkEntity,
    PermissionEntity,
    RoleEntity,
    SessionEntity,
    TenantEntity,
    UserEntity,
} from "@stacks/db";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import app from "../../src/index";
import { issueSession } from "../../src/services/sessions";

const fixtureRows: Array<{ entity: any; id: string }> = [];
let headers: Record<string, string>;
let callerId: string;
let otherUserId: string;
let callerBookmarkId: string;
let otherBookmarkId: string;
let adminBookmarkId: string;
let foreignBookmarkId: string;
let adminHeaders: Record<string, string>;
let adminId: string;
let tenant: string;

async function createBookmark(ownerId: string, tenantId: string) {
    const id = randomUUID();
    const bookmark = await BookmarkEntity.create({
        id,
        title: `Bookmark authorization fixture ${id}`,
        type: "project",
        url: `/project/${id}`,
        pinned: false,
        tenant: tenantId,
        createdBy: ownerId,
        updatedBy: ownerId,
    });
    fixtureRows.push({ entity: BookmarkEntity, id: String(bookmark.get("id")) });

    const permission = await PermissionEntity.create({
        id,
        type: "bookmarks",
        owner: ownerId,
        isPublic: false,
        visibleUsers: [],
        visibleRoles: [],
        tenant: tenantId,
        createdBy: ownerId,
        updatedBy: ownerId,
    });
    fixtureRows.push({ entity: PermissionEntity, id: String(permission.get("id")) });
    return id;
}

describe("bookmark owner authorization", () => {
    beforeAll(async () => {
        const { email } = JSON.parse(readFileSync("testUser.json", "utf8")) as { email: string };
        const baseUser = await UserEntity.findOne({ where: { email } });
        expect(baseUser).not.toBeNull();
        tenant = String(baseUser!.get("tenant"));
        const role = String(baseUser!.get("role"));

        const createViewer = async (label: string, admin = false) => {
            const user = await UserEntity.create({
                email: `${label}-bookmark-${randomUUID()}@example.test`,
                password: "test-password",
                firstName: label,
                lastName: "Bookmark Security Test",
                role,
                tenant,
                admin,
                real: false,
            });
            const id = String(user.get("id"));
            fixtureRows.push({ entity: UserEntity, id });
            return id;
        };

        callerId = await createViewer("Caller");
        otherUserId = await createViewer("Other");
        adminId = await createViewer("Admin", true);
        const session = await issueSession(callerId, tenant, 120);
        fixtureRows.push({ entity: SessionEntity, id: session.sid });
        headers = { Authorization: `Bearer ${session.token}` };
        const adminSession = await issueSession(adminId, tenant, 120);
        fixtureRows.push({ entity: SessionEntity, id: adminSession.sid });
        adminHeaders = { Authorization: `Bearer ${adminSession.token}` };

        callerBookmarkId = await createBookmark(callerId, tenant);
        otherBookmarkId = await createBookmark(otherUserId, tenant);
        adminBookmarkId = await createBookmark(otherUserId, tenant);

        const foreignTenant = await TenantEntity.create({
            title: `Foreign bookmark tenant ${randomUUID()}`,
            description: "temporary security fixture",
            expiry: new Date(Date.now() + 60 * 60 * 1000),
        });
        const foreignTenantId = String(foreignTenant.get("id"));
        fixtureRows.push({ entity: TenantEntity, id: foreignTenantId });
        const foreignRole = await RoleEntity.create({
            title: `Foreign bookmark role ${randomUUID()}`,
            description: "temporary security fixture",
            access: {},
            disabled: false,
            tenant: foreignTenantId,
            createdBy: adminId,
            updatedBy: adminId,
        });
        const foreignRoleId = String(foreignRole.get("id"));
        fixtureRows.push({ entity: RoleEntity, id: foreignRoleId });
        const foreignOwner = await UserEntity.create({
            email: `foreign-bookmark-${randomUUID()}@example.test`,
            password: "test-password",
            firstName: "Foreign",
            lastName: "Bookmark Owner",
            role: foreignRoleId,
            tenant: foreignTenantId,
            admin: false,
            real: false,
        });
        const foreignOwnerId = String(foreignOwner.get("id"));
        fixtureRows.push({ entity: UserEntity, id: foreignOwnerId });
        foreignBookmarkId = await createBookmark(foreignOwnerId, foreignTenantId);
    });

    afterAll(async () => {
        const cleanupErrors: unknown[] = [];
        const rows = fixtureRows.reverse();
        for (const { entity, id } of rows) {
            try {
                await entity.destroy({ where: { id }, force: true });
                if (await entity.findByPk(id)) {
                    cleanupErrors.push(new Error(`Bookmark fixture row ${id} remains after cleanup`));
                }
            } catch (error) {
                cleanupErrors.push(error);
            }
        }
        fixtureRows.length = 0;
        if (cleanupErrors.length) {
            throw new AggregateError(cleanupErrors, "Failed to clean up bookmark authorization fixtures");
        }
    });

    it("lists only bookmarks visible to the authenticated viewer", async () => {
        const response = await app.request("/api/bookmarks", { headers });
        const body = await response.json();
        const ids = body.data.map((bookmark: { id: string }) => bookmark.id);

        expect(response.status).toBe(200);
        expect(ids).toContain(callerBookmarkId);
        expect(ids).not.toContain(otherBookmarkId);
        expect(ids).not.toContain(foreignBookmarkId);
    });

    it("does not let a same-tenant admin list foreign-tenant bookmarks", async () => {
        const response = await app.request("/api/bookmarks", { headers: adminHeaders });
        const body = await response.json();
        const ids = body.data.map((bookmark: { id: string }) => bookmark.id);

        expect(response.status).toBe(200);
        expect(ids).toContain(adminBookmarkId);
        expect(ids).not.toContain(foreignBookmarkId);
    });

    it("ignores forged bookmark identity and tenant fields on creation", async () => {
        const forgedId = randomUUID();
        const response = await app.request("/api/bookmarks", {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({
                id: forgedId,
                title: "Forged bookmark identity fixture",
                pinned: false,
                type: "project",
                url: "/project/forged",
                tenant: randomUUID(),
                createdBy: otherUserId,
                updatedBy: otherUserId,
            }),
        });
        const body = await response.json();
        const bookmarkId = String(body.data.id);
        fixtureRows.push({ entity: BookmarkEntity, id: bookmarkId });

        const permission = await PermissionEntity.findByPk(bookmarkId);
        expect(response.status).toBe(200);
        expect(bookmarkId).not.toBe(forgedId);
        expect(body.data.tenant).toBe(tenant);
        expect(body.data.createdBy).toBe(callerId);
        expect(body.data.updatedBy).toBe(callerId);
        expect(permission?.get("owner")).toBe(callerId);
        expect(permission?.get("tenant")).toBe(tenant);
        fixtureRows.push({ entity: PermissionEntity, id: bookmarkId });
    });

    it("rejects deleting another same-tenant user's bookmark without changing it", async () => {
        const response = await app.request(`/api/bookmarks/${otherBookmarkId}`, {
            method: "DELETE",
            headers,
        });

        expect(response.status).toBe(404);
        expect((await BookmarkEntity.findByPk(otherBookmarkId))?.get("deleted")).toBeNull();
    });

    it("allows the bookmark owner to delete their bookmark", async () => {
        const response = await app.request(`/api/bookmarks/${callerBookmarkId}`, {
            method: "DELETE",
            headers,
        });

        expect(response.status).toBe(200);
        expect((await BookmarkEntity.findByPk(callerBookmarkId))?.get("deleted")).not.toBeNull();
    });

    it("allows a same-tenant administrator to delete another user's bookmark", async () => {
        const response = await app.request(`/api/bookmarks/${adminBookmarkId}`, {
            method: "DELETE",
            headers: adminHeaders,
        });

        expect(response.status).toBe(200);
        expect((await BookmarkEntity.findByPk(adminBookmarkId))?.get("deleted")).not.toBeNull();
    });

    it("keeps a foreign-tenant bookmark hidden from a same-tenant administrator", async () => {
        const response = await app.request(`/api/bookmarks/${foreignBookmarkId}`, {
            method: "DELETE",
            headers: adminHeaders,
        });

        expect(response.status).toBe(404);
        expect((await BookmarkEntity.findByPk(foreignBookmarkId))?.get("deleted")).toBeNull();
    });
});
