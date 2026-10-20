// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
    DocumentEntity,
    CompanyEntity,
    PermissionEntity,
    ProjectEntity,
    SessionEntity,
    StackEntity,
    TaskEntity,
    TenantEntity,
    UserEntity,
} from "@stacks/db";
import { RECORDTYPE } from "@stacks/types";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import app from "../../src/index";
import { issueSession } from "../../src/services/sessions";

const fixtureRows: Array<{ entity: any; id: string }> = [];
let headers: Record<string, string>;
let ownerHeaders: Record<string, string>;
let adminHeaders: Record<string, string>;
let tenant: string;
let callerId: string;
let otherOwnerId: string;
let foreignOwnerId: string;
let foreignTenantId: string;
let foreignCompanyId: string;
let unrelatedStackId: string;

describe("document create owner authorization", () => {
    beforeAll(async () => {
        const { email } = JSON.parse(readFileSync("testUser.json", "utf8")) as { email: string };
        const baseUser = await UserEntity.findOne({ where: { email } });
        expect(baseUser).not.toBeNull();
        tenant = String(baseUser!.get("tenant"));
        const role = String(baseUser!.get("role"));

        const createViewer = async (firstName: string) => {
            const user = await UserEntity.create({
                email: `${firstName.toLowerCase()}-document-${randomUUID()}@example.test`,
                password: "test-password",
                firstName,
                lastName: "Document Owner Test",
                role,
                tenant,
                admin: false,
                real: false,
            });
            const id = String(user.get("id"));
            fixtureRows.push({ entity: UserEntity, id });
            return id;
        };

        callerId = await createViewer("Caller");
        otherOwnerId = await createViewer("Other");
        const foreignTenant = await TenantEntity.create({
            title: `Foreign document owner ${randomUUID()}`,
            description: "temporary security fixture",
            expiry: new Date(Date.now() + 60 * 60 * 1000),
        });
        foreignTenantId = String(foreignTenant.get("id"));
        fixtureRows.push({ entity: TenantEntity, id: foreignTenantId });
        const foreignOwner = await UserEntity.create({
            email: `foreign-document-${randomUUID()}@example.test`,
            password: "test-password",
            firstName: "Foreign",
            lastName: "Document Owner Test",
            role,
            tenant: foreignTenantId,
            admin: false,
            real: false,
        });
        foreignOwnerId = String(foreignOwner.get("id"));
        fixtureRows.push({ entity: UserEntity, id: foreignOwnerId });
        const foreignCompany = await CompanyEntity.create({
            title: `Foreign project company ${randomUUID()}`,
            tenant: foreignTenantId,
            createdBy: foreignOwnerId,
            updatedBy: foreignOwnerId,
        });
        foreignCompanyId = String(foreignCompany.get("id"));
        fixtureRows.push({ entity: CompanyEntity, id: foreignCompanyId });
        const unrelatedProjectId = randomUUID();
        await DocumentEntity.create({
            id: unrelatedProjectId,
            title: `Unrelated project ${randomUUID()}`,
            type: RECORDTYPE.PROJECT,
            order: 0,
            tenant,
            createdBy: callerId,
            updatedBy: callerId,
        });
        fixtureRows.push({ entity: DocumentEntity, id: unrelatedProjectId });
        await ProjectEntity.create({
            id: unrelatedProjectId,
            tenant,
            createdBy: callerId,
            updatedBy: callerId,
        });
        fixtureRows.push({ entity: ProjectEntity, id: unrelatedProjectId });
        await PermissionEntity.create({
            id: unrelatedProjectId,
            owner: callerId,
            isPublic: false,
            visibleUsers: [],
            visibleRoles: [],
            tenant,
            createdBy: callerId,
            updatedBy: callerId,
        });
        fixtureRows.push({ entity: PermissionEntity, id: unrelatedProjectId });
        unrelatedStackId = randomUUID();
        await StackEntity.create({
            id: unrelatedStackId,
            title: `Unrelated stack ${randomUUID()}`,
            project: unrelatedProjectId,
            tenant,
            createdBy: callerId,
            updatedBy: callerId,
        });
        fixtureRows.push({ entity: StackEntity, id: unrelatedStackId });
        const session = await issueSession(callerId, tenant, 120);
        fixtureRows.push({ entity: SessionEntity, id: session.sid });
        headers = {
            Authorization: `Bearer ${session.token}`,
            "Content-Type": "application/json",
        };
        const ownerSession = await issueSession(otherOwnerId, tenant, 120);
        fixtureRows.push({ entity: SessionEntity, id: ownerSession.sid });
        ownerHeaders = {
            Authorization: `Bearer ${ownerSession.token}`,
            "Content-Type": "application/json",
        };
        const adminUser = await UserEntity.create({
            email: `admin-document-${randomUUID()}@example.test`,
            password: "test-password",
            firstName: "Admin",
            lastName: "Document Owner Test",
            role,
            tenant,
            admin: true,
            real: false,
        });
        fixtureRows.push({ entity: UserEntity, id: String(adminUser.get("id")) });
        const adminSession = await issueSession(String(adminUser.get("id")), tenant, 120);
        fixtureRows.push({ entity: SessionEntity, id: adminSession.sid });
        adminHeaders = {
            Authorization: `Bearer ${adminSession.token}`,
            "Content-Type": "application/json",
        };
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
            throw new AggregateError(
                cleanupErrors,
                "Failed to clean up document owner authorization fixtures"
            );
        }
    });

    const createFolder = async (owner?: string, visibleUsers: string[] = []) => {
        const title = `Document owner fixture ${randomUUID()}`;
        const response = await app.request("/api/documents", {
            method: "POST",
            headers,
            body: JSON.stringify({
                title,
                parent: null,
                type: RECORDTYPE.FOLDER,
                permissions: {
                    isPublic: false,
                    ...(owner ? { owner } : {}),
                    visibleUsers,
                    visibleRoles: [],
                },
            }),
        });
        const body = await response.json();
        if (body.data?.id) {
            const id = String(body.data.id);
            fixtureRows.push({ entity: PermissionEntity, id }, { entity: DocumentEntity, id });
        }
        return { response, body, title };
    };

    it("allows assigning a new document to a different user in the same tenant", async () => {
        const { response, body } = await createFolder(otherOwnerId);

        expect(response.status).toBe(200);
        const permission = await PermissionEntity.findByPk(String(body.data.id));
        expect(permission?.get("owner")).toBe(otherOwnerId);
    });

    it("rejects assigning a new document to a user in another tenant", async () => {
        const { response, title } = await createFolder(foreignOwnerId);

        expect(response.status).toBe(400);
        expect(await DocumentEntity.count({ where: { title, tenant } })).toBe(0);
    });

    it("preserves the normal same-tenant folder creation control", async () => {
        const { response, body } = await createFolder();

        expect(response.status).toBe(200);
        const permission = await PermissionEntity.findByPk(String(body.data.id));
        expect(permission?.get("owner")).toBe(callerId);
    });

    it("filters private and foreign documents from route reads and denies foreign document/project mutations", async () => {
        const privateDocumentId = randomUUID();
        const privateTitle = `Hidden document ${randomUUID()}`;
        await DocumentEntity.create({
            id: privateDocumentId,
            title: privateTitle,
            type: RECORDTYPE.FOLDER,
            order: 0,
            tenant,
            createdBy: otherOwnerId,
            updatedBy: otherOwnerId,
        });
        fixtureRows.push({ entity: DocumentEntity, id: privateDocumentId });
        await PermissionEntity.create({
            id: privateDocumentId,
            owner: otherOwnerId,
            isPublic: false,
            visibleUsers: [],
            visibleRoles: [],
            tenant,
            createdBy: otherOwnerId,
            updatedBy: otherOwnerId,
        });
        fixtureRows.push({ entity: PermissionEntity, id: privateDocumentId });

        const foreignProjectId = randomUUID();
        const foreignTitle = `Foreign project ${randomUUID()}`;
        await DocumentEntity.create({
            id: foreignProjectId,
            title: foreignTitle,
            type: RECORDTYPE.PROJECT,
            order: 0,
            tenant: foreignTenantId,
            createdBy: foreignOwnerId,
            updatedBy: foreignOwnerId,
        });
        fixtureRows.push({ entity: DocumentEntity, id: foreignProjectId });
        await ProjectEntity.create({
            id: foreignProjectId,
            tenant: foreignTenantId,
            createdBy: foreignOwnerId,
            updatedBy: foreignOwnerId,
        });
        fixtureRows.push({ entity: ProjectEntity, id: foreignProjectId });
        await PermissionEntity.create({
            id: foreignProjectId,
            owner: foreignOwnerId,
            isPublic: true,
            visibleUsers: [],
            visibleRoles: [],
            tenant: foreignTenantId,
            createdBy: foreignOwnerId,
            updatedBy: foreignOwnerId,
        });
        fixtureRows.push({ entity: PermissionEntity, id: foreignProjectId });

        const listing = await app.request("/api/documents", { headers });
        expect(listing.status).toBe(200);
        const listed = await listing.json();
        expect(JSON.stringify(listed.data.documents)).not.toContain(privateTitle);
        expect(JSON.stringify(listed.data.documents)).not.toContain(foreignTitle);

        const documentUpdate = await app.request(`/api/documents/${foreignProjectId}`, {
            method: "PATCH",
            headers: adminHeaders,
            body: JSON.stringify({ title: "forged foreign document update" }),
        });
        const documentDelete = await app.request(`/api/documents/${foreignProjectId}`, {
            method: "DELETE",
            headers: adminHeaders,
        });
        const projectUpdate = await app.request(`/api/projects/${foreignProjectId}`, {
            method: "PATCH",
            headers: adminHeaders,
            body: JSON.stringify({ description: "forged foreign project update" }),
        });
        expect(documentUpdate.status).toBe(404);
        expect(documentDelete.status).toBe(404);
        expect(projectUpdate.status).toBe(404);
        expect((await DocumentEntity.findByPk(foreignProjectId))?.get("title")).toBe(foreignTitle);
        expect((await DocumentEntity.findByPk(foreignProjectId))?.get("deleted")).toBeNull();
        expect((await ProjectEntity.findByPk(foreignProjectId))?.get("description")).toBeNull();
    });

    it("rejects creating a project with an owner from another tenant", async () => {
        const title = `Cross-tenant project owner ${randomUUID()}`;
        const response = await app.request("/api/documents", {
            method: "POST",
            headers,
            body: JSON.stringify({
                title,
                parent: null,
                type: RECORDTYPE.PROJECT,
                data: { projectOwner: foreignOwnerId },
                permissions: {
                    isPublic: false,
                    visibleUsers: [],
                    visibleRoles: [],
                },
            }),
        });

        expect(response.status).toBe(404);
        expect(await DocumentEntity.count({ where: { title, tenant } })).toBe(0);
        expect(await ProjectEntity.count({ where: { projectOwner: foreignOwnerId } })).toBe(0);
    });

    it("allows creating a project with an owner in the same tenant", async () => {
        const title = `Same-tenant project owner ${randomUUID()}`;
        const response = await app.request("/api/documents", {
            method: "POST",
            headers,
            body: JSON.stringify({
                title,
                parent: null,
                type: RECORDTYPE.PROJECT,
                data: { projectOwner: otherOwnerId },
                permissions: {
                    isPublic: false,
                    visibleUsers: [],
                    visibleRoles: [],
                },
            }),
        });
        const body = await response.json();

        expect(response.status).toBe(200);
        const id = String(body.data.id);
        fixtureRows.push(
            { entity: PermissionEntity, id },
            { entity: ProjectEntity, id },
            { entity: DocumentEntity, id }
        );
        expect((await ProjectEntity.findByPk(id))?.get("projectOwner")).toBe(otherOwnerId);
    });

    it("does not allow project data to override identity, tenant, or audit fields", async () => {
        const title = `Protected project fields ${randomUUID()}`;
        const suppliedId = randomUUID();
        const suppliedTenant = randomUUID();
        const response = await app.request("/api/documents", {
            method: "POST",
            headers,
            body: JSON.stringify({
                title,
                parent: null,
                type: RECORDTYPE.PROJECT,
                data: {
                    id: suppliedId,
                    tenant: suppliedTenant,
                    createdBy: foreignOwnerId,
                    updatedBy: foreignOwnerId,
                },
                permissions: {
                    isPublic: false,
                    visibleUsers: [],
                    visibleRoles: [],
                },
            }),
        });
        const body = await response.json();
        const id = String(body.data.id);
        fixtureRows.push(
            { entity: PermissionEntity, id },
            { entity: ProjectEntity, id },
            { entity: DocumentEntity, id },
            { entity: ProjectEntity, id: suppliedId }
        );

        expect(response.status).toBe(200);
        const project = await ProjectEntity.findByPk(id);
        const suppliedProject = await ProjectEntity.findByPk(suppliedId);
        expect(project?.get("id")).toBe(id);
        expect(project?.get("deleted")).toBeNull();
        expect(project?.get("tenant")).toBe(tenant);
        expect(project?.get("createdBy")).toBe(callerId);
        expect(project?.get("updatedBy")).toBe(callerId);
        expect(suppliedProject).toBeNull();
    });

    it("does not allow project data to soft-delete a new project", async () => {
        const title = `Protected project deletion state ${randomUUID()}`;
        const response = await app.request("/api/documents", {
            method: "POST",
            headers,
            body: JSON.stringify({
                title,
                parent: null,
                type: RECORDTYPE.PROJECT,
                data: { deleted: new Date().toISOString() },
                permissions: {
                    isPublic: false,
                    visibleUsers: [],
                    visibleRoles: [],
                },
            }),
        });
        const body = await response.json();
        const id = String(body.data.id);
        fixtureRows.push(
            { entity: PermissionEntity, id },
            { entity: ProjectEntity, id },
            { entity: DocumentEntity, id }
        );

        expect(response.status).toBe(200);
        const project = await ProjectEntity.findByPk(id);
        expect(project?.get("deleted")).toBeNull();
    });

    it("rejects a project stack order that references another project", async () => {
        const title = `Cross-project stack order ${randomUUID()}`;
        const response = await app.request("/api/documents", {
            method: "POST",
            headers,
            body: JSON.stringify({
                title,
                parent: null,
                type: RECORDTYPE.PROJECT,
                data: { stacksOrder: [unrelatedStackId] },
                permissions: {
                    isPublic: false,
                    visibleUsers: [],
                    visibleRoles: [],
                },
            }),
        });

        expect(response.status).toBe(404);
        expect(await DocumentEntity.count({ where: { title, tenant } })).toBe(0);
    });

    it.each([
        ["company", () => ({ company: foreignCompanyId })],
        ["approver", () => ({ approvers: [foreignOwnerId] })],
    ])("rejects creating a project with a foreign-tenant %s", async (_label, getData) => {
        const title = `Cross-tenant project relationship ${randomUUID()}`;
        const response = await app.request("/api/documents", {
            method: "POST",
            headers,
            body: JSON.stringify({
                title,
                parent: null,
                type: RECORDTYPE.PROJECT,
                data: getData(),
                permissions: {
                    isPublic: false,
                    visibleUsers: [],
                    visibleRoles: [],
                },
            }),
        });

        expect(response.status).toBe(404);
        expect(await DocumentEntity.count({ where: { title, tenant } })).toBe(0);
    });

    it("rolls back recursive deletion when a visible child belongs to another owner", async () => {
        const parent = await createFolder(otherOwnerId, [callerId]);
        expect(parent.response.status).toBe(200);
        const parentId = String(parent.body.data.id);
        const childTitle = `Document child fixture ${randomUUID()}`;
        const childResponse = await app.request("/api/documents", {
            method: "POST",
            headers,
            body: JSON.stringify({
                title: childTitle,
                parent: parentId,
                type: RECORDTYPE.FOLDER,
                permissions: {
                    isPublic: false,
                    owner: otherOwnerId,
                    visibleUsers: [callerId],
                    visibleRoles: [],
                },
            }),
        });
        const childBody = await childResponse.json();
        expect(childResponse.status).toBe(200);
        const childId = String(childBody.data.id);
        fixtureRows.push({ entity: PermissionEntity, id: childId }, { entity: DocumentEntity, id: childId });

        const denied = await app.request(`/api/documents/${parentId}`, {
            method: "DELETE",
            headers,
        });

        expect(denied.status).toBe(403);
        expect(
            await DocumentEntity.count({ where: { id: [parentId, childId], tenant, deleted: null } })
        ).toBe(2);

        const allowed = await app.request(`/api/documents/${parentId}`, {
            method: "DELETE",
            headers: ownerHeaders,
        });

        expect(allowed.status).toBe(200);
        expect(
            await DocumentEntity.count({ where: { id: [parentId, childId], tenant, deleted: null } })
        ).toBe(0);
    });

    it("rolls back project deletion when the project owner does not own every task", async () => {
        const projectId = randomUUID();
        const stackId = randomUUID();
        const taskId = randomUUID();

        await DocumentEntity.create({
            id: projectId,
            title: `Cascade project fixture ${projectId}`,
            type: RECORDTYPE.PROJECT,
            order: 0,
            tenant,
            createdBy: otherOwnerId,
            updatedBy: otherOwnerId,
        });
        fixtureRows.push({ entity: DocumentEntity, id: projectId });
        await ProjectEntity.create({
            id: projectId,
            projectOwner: otherOwnerId,
            tenant,
            createdBy: otherOwnerId,
            updatedBy: otherOwnerId,
        });
        fixtureRows.push({ entity: ProjectEntity, id: projectId });
        await PermissionEntity.create({
            id: projectId,
            owner: otherOwnerId,
            isPublic: false,
            visibleUsers: [callerId],
            visibleRoles: [],
            tenant,
            createdBy: otherOwnerId,
            updatedBy: otherOwnerId,
        });
        fixtureRows.push({ entity: PermissionEntity, id: projectId });
        await StackEntity.create({
            id: stackId,
            title: `Cascade stack fixture ${stackId}`,
            project: projectId,
            tenant,
            createdBy: otherOwnerId,
            updatedBy: otherOwnerId,
        });
        fixtureRows.push({ entity: StackEntity, id: stackId });
        await PermissionEntity.create({
            id: stackId,
            owner: otherOwnerId,
            isPublic: true,
            visibleUsers: [],
            visibleRoles: [],
            tenant,
            createdBy: otherOwnerId,
            updatedBy: otherOwnerId,
        });
        fixtureRows.push({ entity: PermissionEntity, id: stackId });
        await TaskEntity.create({
            id: taskId,
            title: `Cascade task fixture ${taskId}`,
            project: projectId,
            stack: stackId,
            tenant,
            createdBy: callerId,
            updatedBy: callerId,
        });
        fixtureRows.push({ entity: TaskEntity, id: taskId });
        await PermissionEntity.create({
            id: taskId,
            owner: callerId,
            isPublic: true,
            visibleUsers: [],
            visibleRoles: [],
            tenant,
            createdBy: callerId,
            updatedBy: callerId,
        });
        fixtureRows.push({ entity: PermissionEntity, id: taskId });

        const viewerDelete = await app.request(`/api/documents/${projectId}`, {
            method: "DELETE",
            headers,
        });
        expect(viewerDelete.status).toBe(403);

        const projectOwnerDelete = await app.request(`/api/documents/${projectId}`, {
            method: "DELETE",
            headers: ownerHeaders,
        });
        expect(projectOwnerDelete.status).toBe(403);
        expect((await DocumentEntity.findByPk(projectId))?.get("deleted")).toBeNull();
        expect((await ProjectEntity.findByPk(projectId))?.get("deleted")).toBeNull();
        expect((await StackEntity.findByPk(stackId))?.get("deleted")).toBeNull();
        expect((await TaskEntity.findByPk(taskId))?.get("deleted")).toBeNull();

        const adminDelete = await app.request(`/api/documents/${projectId}`, {
            method: "DELETE",
            headers: adminHeaders,
        });
        expect(adminDelete.status).toBe(200);
        expect((await DocumentEntity.findByPk(projectId))?.get("deleted")).not.toBeNull();
        expect((await ProjectEntity.findByPk(projectId))?.get("deleted")).not.toBeNull();
        expect((await StackEntity.findByPk(stackId))?.get("deleted")).not.toBeNull();
        expect((await TaskEntity.findByPk(taskId))?.get("deleted")).not.toBeNull();
    });

    it("allows a same-tenant admin to recursively delete another user's document subtree", async () => {
        const parent = await createFolder(otherOwnerId, [callerId]);
        expect(parent.response.status).toBe(200);
        const parentId = String(parent.body.data.id);
        const childTitle = `Admin document child fixture ${randomUUID()}`;
        const childResponse = await app.request("/api/documents", {
            method: "POST",
            headers,
            body: JSON.stringify({
                title: childTitle,
                parent: parentId,
                type: RECORDTYPE.FOLDER,
                permissions: {
                    isPublic: false,
                    owner: otherOwnerId,
                    visibleUsers: [callerId],
                    visibleRoles: [],
                },
            }),
        });
        const childBody = await childResponse.json();
        expect(childResponse.status).toBe(200);
        const childId = String(childBody.data.id);
        fixtureRows.push({ entity: PermissionEntity, id: childId }, { entity: DocumentEntity, id: childId });

        const deleted = await app.request(`/api/documents/${parentId}`, {
            method: "DELETE",
            headers: adminHeaders,
        });

        expect(deleted.status).toBe(200);
        expect(
            await DocumentEntity.count({ where: { id: [parentId, childId], tenant, deleted: null } })
        ).toBe(0);
    });

    it("allows visible users to reorder a document but keeps content edits owner-only", async () => {
        const { response, body, title } = await createFolder(otherOwnerId, [callerId]);
        expect(response.status).toBe(200);
        const id = String(body.data.id);

        const reorder = await app.request(`/api/documents/${id}`, {
            method: "PATCH",
            headers,
            body: JSON.stringify({ order: 0 }),
        });
        expect(reorder.status).toBe(200);

        const deniedArchive = await app.request(`/api/documents/${id}/archive`, {
            method: "POST",
            headers,
        });
        expect(deniedArchive.status).toBe(403);
        expect((await DocumentEntity.findByPk(id))?.get("archived")).toBeNull();

        const ownerArchive = await app.request(`/api/documents/${id}/archive`, {
            method: "POST",
            headers: ownerHeaders,
        });
        expect(ownerArchive.status).toBe(200);
        const archivedAt = (await DocumentEntity.findByPk(id))?.get("archived");
        expect(archivedAt).toBeTruthy();

        const deniedUnarchive = await app.request(`/api/documents/${id}/unarchive`, {
            method: "POST",
            headers,
        });
        expect(deniedUnarchive.status).toBe(403);
        expect((await DocumentEntity.findByPk(id))?.get("archived")).toEqual(archivedAt);

        const ownerUnarchive = await app.request(`/api/documents/${id}/unarchive`, {
            method: "POST",
            headers: ownerHeaders,
        });
        expect(ownerUnarchive.status).toBe(200);
        expect((await DocumentEntity.findByPk(id))?.get("archived")).toBeNull();

        const denied = await app.request(`/api/documents/${id}`, {
            method: "PATCH",
            headers,
            body: JSON.stringify({ title: "forged viewer edit" }),
        });
        expect(denied.status).toBe(403);
        expect((await DocumentEntity.findByPk(id))?.get("title")).toBe(title);

        const adminEdit = await app.request(`/api/documents/${id}`, {
            method: "PATCH",
            headers: adminHeaders,
            body: JSON.stringify({ title: "admin edit" }),
        });
        expect(adminEdit.status).toBe(200);
        expect((await DocumentEntity.findByPk(id))?.get("title")).toBe("admin edit");

        const allowed = await app.request(`/api/documents/${id}`, {
            method: "PATCH",
            headers: ownerHeaders,
            body: JSON.stringify({ title: "owner edit" }),
        });
        expect(allowed.status).toBe(200);
        expect((await DocumentEntity.findByPk(id))?.get("title")).toBe("owner edit");
    });
});
