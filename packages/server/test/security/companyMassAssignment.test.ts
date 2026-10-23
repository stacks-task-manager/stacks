// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { afterAll, describe, expect, it } from "vitest";
import { CompanyEntity, RoleEntity, SessionEntity, TenantEntity, UserEntity } from "@stacks/db";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import app from "../../src/index";
import { issueSession } from "../../src/services/sessions";

const fixtureRows: Array<{ entity: any; id: string }> = [];

describe("company route mass-assignment boundaries", () => {
    afterAll(async () => {
        const cleanupErrors: unknown[] = [];
        for (const { entity, id } of fixtureRows.reverse()) {
            try {
                await entity.destroy({ where: { id }, force: true });
                if (await entity.findByPk(id)) {
                    cleanupErrors.push(new Error(`Fixture row ${id} remains after cleanup`));
                }
            } catch (error) {
                cleanupErrors.push(error);
            }
        }
        if (cleanupErrors.length) {
            throw new AggregateError(cleanupErrors, "Failed to clean up company mass-assignment fixtures");
        }
    });

    it("keeps tenant and audit fields server-controlled on create and update", async () => {
        const credentials = JSON.parse(readFileSync("testUser.json", "utf8")) as { email: string };
        const baseUser = await UserEntity.findOne({ where: { email: credentials.email } });
        expect(baseUser).not.toBeNull();
        const tenant = String(baseUser!.get("tenant"));
        const roleId = String(baseUser!.get("role"));

        const admin = await UserEntity.create({
            email: `${randomUUID()}@example.test`,
            password: "test-password",
            firstName: "Company",
            lastName: "Admin",
            role: roleId,
            tenant,
            admin: true,
            real: false,
        });
        const adminId = String(admin.get("id"));
        fixtureRows.push({ entity: UserEntity, id: adminId });
        const session = await issueSession(adminId, tenant, 120);
        fixtureRows.push({ entity: SessionEntity, id: session.sid });
        const headers = {
            Authorization: `Bearer ${session.token}`,
            "Content-Type": "application/json",
        };

        const foreignTenant = await TenantEntity.create({
            title: `Company mass assignment tenant ${randomUUID()}`,
            description: "temporary security fixture",
            expiry: new Date(Date.now() + 60 * 60 * 1000),
        });
        const foreignTenantId = String(foreignTenant.get("id"));
        fixtureRows.push({ entity: TenantEntity, id: foreignTenantId });
        const foreignRole = await RoleEntity.create({
            title: `Company mass assignment role ${randomUUID()}`,
            description: "temporary security fixture",
            access: {},
            disabled: false,
            tenant: foreignTenantId,
            createdBy: adminId,
            updatedBy: adminId,
        });
        const foreignRoleId = String(foreignRole.get("id"));
        fixtureRows.push({ entity: RoleEntity, id: foreignRoleId });
        const foreignActor = await UserEntity.create({
            email: `${randomUUID()}@example.test`,
            password: "test-password",
            firstName: "Foreign",
            lastName: "Company Actor",
            role: foreignRoleId,
            tenant: foreignTenantId,
            admin: true,
            real: false,
        });
        const foreignActorId = String(foreignActor.get("id"));
        fixtureRows.push({ entity: UserEntity, id: foreignActorId });

        const title = `Mass-assignment company ${randomUUID()}`;
        const create = await app.request("/api/companies", {
            method: "POST",
            headers,
            body: JSON.stringify({
                title,
                tenant: foreignTenantId,
                createdBy: foreignActorId,
                updatedBy: foreignActorId,
            }),
        });
        expect(create.status).toBe(200);
        const createBody = await create.json();
        const companyId = String(createBody.data.id);
        fixtureRows.push({ entity: CompanyEntity, id: companyId });

        const createdCompany = await CompanyEntity.findByPk(companyId);
        expect(createdCompany?.get("tenant")).toBe(tenant);
        expect(createdCompany?.get("createdBy")).toBe(adminId);
        expect(createdCompany?.get("updatedBy")).toBe(adminId);

        const update = await app.request(`/api/companies/${companyId}`, {
            method: "PATCH",
            headers,
            body: JSON.stringify({
                title: `${title} updated`,
                tenant: foreignTenantId,
                createdBy: foreignActorId,
                updatedBy: foreignActorId,
            }),
        });
        expect(update.status).toBe(200);

        const updatedCompany = await CompanyEntity.findByPk(companyId);
        expect(updatedCompany?.get("title")).toBe(`${title} updated`);
        expect(updatedCompany?.get("tenant")).toBe(tenant);
        expect(updatedCompany?.get("createdBy")).toBe(adminId);
        expect(updatedCompany?.get("updatedBy")).toBe(adminId);
    });
});
