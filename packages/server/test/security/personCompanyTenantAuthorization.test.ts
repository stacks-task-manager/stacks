// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { afterEach, describe, expect, it } from "vitest";
import { CompanyEntity, RoleEntity, SessionEntity, TenantEntity, UserEntity } from "@stacks/db";
import * as bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import app from "../../src/index";
import { issueSession } from "../../src/services/sessions";

const fixtureRows: Array<{ entity: any; id: string }> = [];
const fixtureUserEmails: string[] = [];

afterEach(async () => {
    for (const email of fixtureUserEmails) {
        await UserEntity.destroy({ where: { email }, force: true });
    }
    fixtureUserEmails.length = 0;
    for (const { entity, id } of fixtureRows.reverse()) {
        await entity.destroy({ where: { id }, force: true });
    }
    fixtureRows.length = 0;
});

describe("person company tenant authorization", () => {
    it("allows same-tenant company and role links and rejects foreign-tenant links", async () => {
        const credentials = JSON.parse(readFileSync("testUser.json", "utf8")) as { email: string };
        const seededUser = await UserEntity.findOne({ where: { email: credentials.email } });
        expect(seededUser).not.toBeNull();

        const tenant = String(seededUser!.get("tenant"));
        const role = await RoleEntity.findOne({ where: { title: "User", tenant } });
        expect(role).not.toBeNull();

        const user = await UserEntity.create({
            email: `company-link-${randomUUID()}@example.test`,
            password: await bcrypt.hash(randomUUID(), 10),
            firstName: "Company Link",
            lastName: "Security Fixture",
            role: String(role!.get("id")),
            tenant,
            admin: true,
            real: true,
        });
        const userId = String(user.get("id"));
        fixtureRows.push({ entity: UserEntity, id: userId });
        const session = await issueSession(userId, tenant, 120);
        fixtureRows.push({ entity: SessionEntity, id: session.sid });
        const headers = { Authorization: `Bearer ${session.token}`, "Content-Type": "application/json" };

        const sameTenantCompany = await CompanyEntity.create({
            title: `Same tenant company ${randomUUID()}`,
            tenant,
            createdBy: userId,
            updatedBy: userId,
        });
        const sameTenantCompanyId = String(sameTenantCompany.get("id"));
        fixtureRows.push({ entity: CompanyEntity, id: sameTenantCompanyId });
        const sameTenantRole = await RoleEntity.create({
            title: `Same tenant role ${randomUUID()}`,
            description: "temporary security fixture",
            access: {},
            disabled: false,
            tenant,
            createdBy: userId,
            updatedBy: userId,
        });
        const sameTenantRoleId = String(sameTenantRole.get("id"));
        fixtureRows.push({ entity: RoleEntity, id: sameTenantRoleId });

        const foreignTenant = await TenantEntity.create({
            title: `Foreign company tenant ${randomUUID()}`,
            description: "temporary security fixture",
            expiry: new Date(Date.now() + 60 * 60 * 1000),
        });
        const foreignTenantId = String(foreignTenant.get("id"));
        fixtureRows.push({ entity: TenantEntity, id: foreignTenantId });
        const foreignCompany = await CompanyEntity.create({
            title: `Foreign tenant company ${randomUUID()}`,
            tenant: foreignTenantId,
            createdBy: userId,
            updatedBy: userId,
        });
        const foreignCompanyId = String(foreignCompany.get("id"));
        fixtureRows.push({ entity: CompanyEntity, id: foreignCompanyId });
        const foreignRole = await RoleEntity.create({
            title: `Foreign tenant role ${randomUUID()}`,
            description: "temporary security fixture",
            access: {},
            disabled: false,
            tenant: foreignTenantId,
            createdBy: userId,
            updatedBy: userId,
        });
        const foreignRoleId = String(foreignRole.get("id"));
        fixtureRows.push({ entity: RoleEntity, id: foreignRoleId });

        const foreignRoleResponse = await app.request(`/api/people/${userId}`, {
            method: "PATCH",
            headers,
            body: JSON.stringify({ role: foreignRoleId }),
        });
        expect(foreignRoleResponse.status).toBe(404);
        const afterForeignRoleAttempt = await UserEntity.findByPk(userId);
        expect(afterForeignRoleAttempt?.get("role")).toBe(String(role!.get("id")));

        const sameTenantRoleResponse = await app.request(`/api/people/${userId}`, {
            method: "PATCH",
            headers,
            body: JSON.stringify({ role: sameTenantRoleId }),
        });
        expect(sameTenantRoleResponse.status).toBe(200);
        const afterSameTenantRoleUpdate = await UserEntity.findByPk(userId);
        expect(afterSameTenantRoleUpdate?.get("role")).toBe(sameTenantRoleId);

        const foreignResponse = await app.request(`/api/people/${userId}`, {
            method: "PATCH",
            headers,
            body: JSON.stringify({ company: foreignCompanyId }),
        });
        expect(foreignResponse.status).toBe(404);
        const afterForeignAttempt = await UserEntity.findByPk(userId);
        expect(afterForeignAttempt?.get("company")).not.toBe(foreignCompanyId);

        const sameTenantResponse = await app.request(`/api/people/${userId}`, {
            method: "PATCH",
            headers,
            body: JSON.stringify({ company: sameTenantCompanyId }),
        });
        expect(sameTenantResponse.status).toBe(200);
        const afterSameTenantUpdate = await UserEntity.findByPk(userId);
        expect(afterSameTenantUpdate?.get("company")).toBe(sameTenantCompanyId);

        const foreignRolePersonEmail = `foreign-role-${randomUUID()}@example.test`;
        const foreignRoleCreateResponse = await app.request("/api/people", {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({
                firstName: "Foreign Role",
                lastName: "Security Fixture",
                email: foreignRolePersonEmail,
                role: foreignRoleId,
                real: false,
            }),
        });
        const foreignRolePerson = await UserEntity.findOne({ where: { email: foreignRolePersonEmail } });
        if (foreignRolePerson)
            fixtureRows.push({ entity: UserEntity, id: String(foreignRolePerson.get("id")) });
        expect(foreignRoleCreateResponse.status).toBe(404);
        expect(foreignRolePerson).toBeNull();

        const sameTenantPersonEmail = `same-role-${randomUUID()}@example.test`;
        const sameTenantCreateResponse = await app.request("/api/people", {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({
                firstName: "Same Role",
                lastName: "Security Fixture",
                email: sameTenantPersonEmail,
                role: sameTenantRoleId,
                real: false,
            }),
        });
        const sameTenantPerson = await UserEntity.findOne({ where: { email: sameTenantPersonEmail } });
        if (sameTenantPerson)
            fixtureRows.push({ entity: UserEntity, id: String(sameTenantPerson.get("id")) });
        expect(sameTenantCreateResponse.status).toBe(200);
        expect(sameTenantPerson?.get("role")).toBe(sameTenantRoleId);
        expect(sameTenantPerson?.get("tenant")).toBe(tenant);

        const foreignDeletedEmail = `deleted-foreign-${randomUUID()}@example.test`;
        fixtureUserEmails.push(foreignDeletedEmail);
        const foreignDeletedPerson = await UserEntity.create({
            email: foreignDeletedEmail,
            password: await bcrypt.hash(randomUUID(), 10),
            firstName: "Foreign Deleted",
            lastName: "Security Fixture",
            role: foreignRoleId,
            tenant: foreignTenantId,
            real: false,
            deleted: new Date(),
        });
        const foreignDeletedPersonId = String(foreignDeletedPerson.get("id"));
        fixtureRows.push({ entity: UserEntity, id: foreignDeletedPersonId });

        const foreignDeletedCreateResponse = await app.request("/api/people", {
            method: "POST",
            headers,
            body: JSON.stringify({
                firstName: "Replacement Contact",
                lastName: "Security Fixture",
                email: foreignDeletedEmail,
                role: sameTenantRoleId,
                real: false,
            }),
        });
        expect(foreignDeletedCreateResponse.status).toBe(400);
        const foreignDeletedAfterAttempt = await UserEntity.findOne({
            where: { id: foreignDeletedPersonId, email: foreignDeletedEmail, tenant: foreignTenantId },
        });
        expect(foreignDeletedAfterAttempt).not.toBeNull();
        expect(foreignDeletedAfterAttempt?.get("deleted")).not.toBeNull();
        expect(await UserEntity.findOne({ where: { email: foreignDeletedEmail, tenant } })).toBeNull();

        const localDeletedEmail = `deleted-local-${randomUUID()}@example.test`;
        fixtureUserEmails.push(localDeletedEmail);
        const localDeletedPerson = await UserEntity.create({
            email: localDeletedEmail,
            password: await bcrypt.hash(randomUUID(), 10),
            firstName: "Local Deleted",
            lastName: "Security Fixture",
            role: String(role!.get("id")),
            tenant,
            real: false,
            deleted: new Date(),
        });
        const localDeletedPersonId = String(localDeletedPerson.get("id"));
        fixtureRows.push({ entity: UserEntity, id: localDeletedPersonId });

        const localDeletedCreateResponse = await app.request("/api/people", {
            method: "POST",
            headers,
            body: JSON.stringify({
                firstName: "Revived Local Contact",
                lastName: "Security Fixture",
                email: localDeletedEmail,
                role: sameTenantRoleId,
                real: false,
            }),
        });
        expect(localDeletedCreateResponse.status).toBe(200);
        const localDeletedAfterCreate = await UserEntity.findByPk(localDeletedPersonId);
        expect(localDeletedAfterCreate).not.toBeNull();
        expect(localDeletedAfterCreate?.get("tenant")).toBe(tenant);
        expect(localDeletedAfterCreate?.get("deleted")).toBeNull();
        expect(localDeletedAfterCreate?.get("role")).toBe(sameTenantRoleId);
    });
});
