// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { afterEach, describe, expect, it } from "vitest";
import {
    CompanyEntity,
    RateLimitCounterEntity,
    RoleEntity,
    SessionEntity,
    TenantEntity,
    UserEntity,
} from "@stacks/db";
import { ROLE_ACTIONS, ROLE_SECTIONS } from "@stacks/types";
import { randomUUID } from "node:crypto";
import { Op } from "sequelize";
import { readFileSync } from "node:fs";
import app from "../../src/index";
import { issueSession } from "../../src/services/sessions";
import { rateLimitKeyHash } from "../../src/utils/rateLimit";

const fixtureRows: Array<{ entity: any; id: string }> = [];
const rateLimitedUserIds: string[] = [];
const rateLimitedIps: string[] = [];

afterEach(async () => {
    const keyHashes = [
        ...rateLimitedUserIds.map(userId => rateLimitKeyHash("authenticated-api-user", userId)),
        ...rateLimitedIps.map(ip => rateLimitKeyHash("unauthenticated-api-ip", ip)),
    ];
    if (keyHashes.length) {
        await RateLimitCounterEntity.destroy({ where: { keyHash: { [Op.in]: keyHashes } } });
        expect(await RateLimitCounterEntity.count({ where: { keyHash: { [Op.in]: keyHashes } } })).toBe(0);
    }
    rateLimitedUserIds.length = 0;
    rateLimitedIps.length = 0;

    for (const { entity, id } of fixtureRows.reverse()) {
        await entity.destroy({ where: { id }, force: true });
        expect(await entity.count({ where: { id }, paranoid: false })).toBe(0);
    }
    fixtureRows.length = 0;
});

describe("company route role authorization", () => {
    it("allows read-only company access but denies writes unless the caller is an admin", async () => {
        const credentials = JSON.parse(readFileSync("testUser.json", "utf8")) as { email: string };
        const baseUser = await UserEntity.findOne({ where: { email: credentials.email } });
        expect(baseUser).not.toBeNull();
        const tenant = String(baseUser!.get("tenant"));
        const actorId = String(baseUser!.get("id"));

        const readOnlyRole = await RoleEntity.create({
            title: `Company read only ${randomUUID()}`,
            description: "temporary security fixture",
            access: { [ROLE_SECTIONS.COMPANIES]: { [ROLE_ACTIONS.READ]: true } },
            disabled: false,
            tenant,
            createdBy: actorId,
            updatedBy: actorId,
        });
        const readOnlyRoleId = String(readOnlyRole.get("id"));
        fixtureRows.push({ entity: RoleEntity, id: readOnlyRoleId });

        const noAccessRole = await RoleEntity.create({
            title: `Company no access ${randomUUID()}`,
            description: "temporary security fixture",
            access: {},
            disabled: false,
            tenant,
            createdBy: actorId,
            updatedBy: actorId,
        });
        const noAccessRoleId = String(noAccessRole.get("id"));
        fixtureRows.push({ entity: RoleEntity, id: noAccessRoleId });

        const createPrincipal = async (label: string, admin: boolean, role: string) => {
            const user = await UserEntity.create({
                email: `${label}-company-role-${randomUUID()}@example.test`,
                password: randomUUID(),
                firstName: label,
                lastName: "Company Role Test",
                role,
                tenant,
                admin,
                real: false,
            });
            const userId = String(user.get("id"));
            fixtureRows.push({ entity: UserEntity, id: userId });
            rateLimitedUserIds.push(userId);
            const session = await issueSession(userId, tenant, 120);
            fixtureRows.push({ entity: SessionEntity, id: session.sid });
            return { id: userId, token: session.token };
        };

        const reader = await createPrincipal("reader", false, readOnlyRoleId);
        const viewer = await createPrincipal("viewer", false, noAccessRoleId);
        const admin = await createPrincipal("admin", true, noAccessRoleId);
        const ip = `198.51.100.${Math.floor(Math.random() * 254) + 1}`;
        rateLimitedIps.push(ip);
        const request = async (token: string, path: string, method: string = "GET", body?: unknown) => {
            const response = await app.request(
                path,
                {
                    method,
                    headers: {
                        Authorization: `Bearer ${token}`,
                        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
                    },
                    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
                },
                { incoming: { socket: { remoteAddress: ip } } }
            );
            return response;
        };

        const originalCount = await CompanyEntity.count({ where: { tenant } });
        const title = `Company role fixture ${randomUUID()}`;
        const created = await request(admin.token, "/api/companies", "POST", { title });
        expect(created.status).toBe(200);
        const createdBody = (await created.json()) as { data: { id: string } };
        const companyId = createdBody.data.id;
        fixtureRows.push({ entity: CompanyEntity, id: companyId });

        const foreignTenant = await TenantEntity.create({
            title: `Foreign company tenant ${randomUUID()}`,
            description: "temporary security fixture",
            expiry: new Date(Date.now() + 60 * 60 * 1000),
        });
        const foreignTenantId = String(foreignTenant.get("id"));
        fixtureRows.push({ entity: TenantEntity, id: foreignTenantId });
        const foreignCompany = await CompanyEntity.create({
            title: `Foreign company ${randomUUID()}`,
            tenant: foreignTenantId,
            createdBy: actorId,
            updatedBy: actorId,
        });
        const foreignCompanyId = String(foreignCompany.get("id"));
        const foreignCompanyTitle = String(foreignCompany.get("title"));
        fixtureRows.push({ entity: CompanyEntity, id: foreignCompanyId });

        const readerList = await request(reader.token, "/api/companies");
        expect(readerList.status).toBe(200);
        const readerBody = (await readerList.json()) as { data: Array<{ id: string }> };
        expect(readerBody.data.map(company => company.id)).toContain(companyId);
        expect(readerBody.data.map(company => company.id)).not.toContain(foreignCompanyId);

        const readerOwnDetail = await request(reader.token, `/api/companies/${companyId}`);
        expect(readerOwnDetail.status).toBe(200);

        const readerForeignDetail = await request(reader.token, `/api/companies/${foreignCompanyId}`);
        expect(readerForeignDetail.status).toBe(404);
        expect(await readerForeignDetail.text()).not.toContain(foreignCompanyTitle);

        const readerForgedDetail = await request(
            reader.token,
            "/api/companies/11111111-1111-4111-8111-111111111111"
        );
        expect(readerForgedDetail.status).toBe(404);

        const adminList = await request(admin.token, "/api/companies");
        expect(adminList.status).toBe(200);
        const adminListBody = (await adminList.json()) as { data: Array<{ id: string }> };
        expect(adminListBody.data.map(company => company.id)).not.toContain(foreignCompanyId);
        const adminForeignDetail = await request(admin.token, `/api/companies/${foreignCompanyId}`);
        expect(adminForeignDetail.status).toBe(404);
        const adminForeignUpdate = await request(admin.token, `/api/companies/${foreignCompanyId}`, "PATCH", {
            title: "Foreign company must remain unchanged",
        });
        expect(adminForeignUpdate.status).toBe(404);
        expect((await CompanyEntity.findByPk(foreignCompanyId))?.get("title")).toBe(foreignCompanyTitle);

        const viewerList = await request(viewer.token, "/api/companies");
        expect(viewerList.status).toBe(403);

        const readerCreate = await request(reader.token, "/api/companies", "POST", {
            title: `Denied company ${randomUUID()}`,
        });
        expect(readerCreate.status).toBe(403);
        const viewerCreate = await request(viewer.token, "/api/companies", "POST", {
            title: `Denied company ${randomUUID()}`,
        });
        expect(viewerCreate.status).toBe(403);
        expect(await CompanyEntity.count({ where: { tenant } })).toBe(originalCount + 1);

        const readerUpdate = await request(reader.token, `/api/companies/${companyId}`, "PATCH", {
            title: "Reader must not update company",
        });
        expect(readerUpdate.status).toBe(403);
        const viewerUpdate = await request(viewer.token, `/api/companies/${companyId}`, "PATCH", {
            title: "Viewer must not update company",
        });
        expect(viewerUpdate.status).toBe(403);
        expect((await CompanyEntity.findByPk(companyId))?.get("title")).toBe(title);

        const adminUpdate = await request(admin.token, `/api/companies/${companyId}`, "PATCH", {
            title: `${title} updated`,
        });
        expect(adminUpdate.status).toBe(200);
        expect((await CompanyEntity.findByPk(companyId))?.get("title")).toBe(`${title} updated`);
    });
});
