// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Public person wire shapes (S01).
 *
 * The directory routes and the JSON registration route share user rows, so the response body is
 * checked here rather than only at the loader: list, birthdays, single person, create, and
 * registration must all serialize the same allowed profile keys. Synthetic sentinels only.
 */
import { expect, it, vi } from "vitest";
import { Hono } from "hono";
import { PEOPLE_GENDER } from "@stacks/types";
import { errorHandler } from "../../utils/errorHandler";
import { registerResponseHelpers } from "../../services/response";
import { requestContext } from "../../services/requestContext";
import peopleRoutes from "../people";
import authRoutes from "../auth";

const mocks = vi.hoisted(() => ({
    findAll: vi.fn(),
    findOne: vi.fn(),
    findAndCountAll: vi.fn(),
    create: vi.fn(),
    findByPk: vi.fn(),
    queueEmail: vi.fn(),
    roles: vi.fn(),
    tenants: vi.fn(),
}));

vi.mock("@stacks/db", async importOriginal => {
    const actual = (await importOriginal()) as Record<string, any>;
    Object.assign(actual.UserEntity, {
        findAll: mocks.findAll,
        findOne: mocks.findOne,
        findAndCountAll: mocks.findAndCountAll,
        create: mocks.create,
        findByPk: mocks.findByPk,
    });
    Object.assign(actual.RoleEntity, { findAll: mocks.roles, findOne: mocks.findOne });
    Object.assign(actual.EmailQueueEntity, { create: mocks.queueEmail });
    Object.assign(actual.TenantEntity, { findOne: mocks.tenants });
    return actual;
});
vi.mock("@stacks/license", () => ({
    getLicense: () => ({ tenants: [{ id: "tenant-a", seats: 5 }] }),
}));
vi.mock("../../utils/authRateLimit", () => ({
    enforceAuthAttemptLimit: async () => undefined,
}));

const personId = "22222222-2222-4222-8222-222222222222";
const roleId = "33333333-3333-4333-8333-333333333333";
const tenantId = "44444444-4444-4444-8444-444444444444";

const publicRow = {
    id: personId,
    tenant: "tenant-a",
    created: "2026-01-01T00:00:00.000Z",
    updated: "2026-01-02T00:00:00.000Z",
    avatar: null,
    firstName: "Ada",
    lastName: "Lid",
    email: "ada@example.com",
    gender: PEOPLE_GENDER.OTHER,
    nickname: null,
    birthday: null,
    age: null,
    title: null,
    jobTitle: "Keeper",
    company: null,
    officePhone: null,
    cellPhone: null,
    homePhone: null,
    fax: null,
    address: null,
    county: null,
    zip: null,
    city: null,
    country: null,
    address2: null,
    website: null,
    notes: null,
    socialTwitter: null,
    socialFacebook: null,
    socialLinkedin: null,
    socialInstagram: null,
    socialOther: null,
    personalId: null,
    userId: "user-account-1",
    tags: [],
    role: roleId,
    real: true,
    admin: false,
    disabled: false,
    onlineStatus: "offline",
    hourlyRates: {},
    lastOnline: null,
};

const privateRow = {
    unknownFutureField: "future-private-sentinel",
    password: "bcrypt-hash-sentinel",
    token: "activation-token-sentinel",
    activationTokenExpiresAt: "2026-01-03T00:00:00.000Z",
    passwordResetTokenHash: "reset-hash-sentinel",
    passwordResetTokenExpiresAt: "2026-01-04T00:00:00.000Z",
    oauthTokens: { google: { access_token: "google-access-sentinel" } },
    system: false,
    createdBy: "user-account-1",
    updatedBy: "user-account-1",
    deletedBy: null,
    deleted: null,
};

const fixtureRow = { ...publicRow, ...privateRow };
const allowedPublicKeys = Object.keys(publicRow).sort();
const privateKeys = Object.keys(privateRow);
const sentinels = [
    "bcrypt-hash-sentinel",
    "activation-token-sentinel",
    "reset-hash-sentinel",
    "google-access-sentinel",
];

function expectPublicPerson(label: string, value: unknown): void {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    expect(keys).toEqual(allowedPublicKeys);
    expect(keys.filter(key => privateKeys.includes(key))).toEqual([]);
    const serialized = JSON.stringify(value);
    for (const sentinel of sentinels) {
        expect(serialized).not.toContain(sentinel);
    }
    void label;
}

const rowsAsInstances = (rows: unknown[]) =>
    rows.map(row => ({
        toJSON: () => ({ ...(row as Record<string, unknown>) }),
        get: (key: string) => (row as Record<string, unknown>)[key],
    }));

function mountApi(): Hono {
    const app = new Hono();
    registerResponseHelpers(app);
    app.onError(errorHandler);
    app.use(async (c, next) => {
        c.set("user", { id: personId, tenant: "tenant-a", company: null, admin: true } as any);
        await next();
    });
    app.route("/api/people", peopleRoutes);
    app.route("/auth", authRoutes);
    return app;
}

const runAs = <T>(fn: () => T) =>
    requestContext.run(
        {
            user: { id: personId, tenant: "tenant-a", admin: true },
            role: { id: roleId, title: "Admin", access: {} },
            instanceId: "instance-1",
            requestId: "request-1",
            timestamp: Date.now(),
        } as any,
        fn
    );

it("lists people over the API without credential fields", async () => {
    vi.clearAllMocks();
    mocks.findAll.mockImplementation(async () => rowsAsInstances([fixtureRow]));

    const res = await runAs(() => mountApi().request("/api/people", { headers: { Locale: "en" } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expectPublicPerson("directory list", (body.data as unknown[])[0]);
    for (const sentinel of sentinels) {
        expect(JSON.stringify(body)).not.toContain(sentinel);
    }
});

it("answers the birthdays route without credential fields", async () => {
    vi.clearAllMocks();
    mocks.findAll.mockImplementation(async () => rowsAsInstances([fixtureRow]));

    const res = await runAs(() =>
        mountApi().request("/api/people/birthdays?from=2026-10-01T00:00:00Z&to=2026-10-31T00:00:00Z", {
            headers: { Locale: "en" },
        })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expectPublicPerson("birthday rows", (body.data as unknown[])[0]);
});

it("answers a single-person read without credential fields", async () => {
    vi.clearAllMocks();
    mocks.findOne.mockImplementation(async () => rowsAsInstances([fixtureRow])[0]);

    const res = await runAs(() =>
        mountApi().request(`/api/people/${personId}`, { headers: { Locale: "en" } })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expectPublicPerson("single person", body.data);
});

it("creates a person and keeps the activation credential off the wire", async () => {
    vi.clearAllMocks();
    mocks.findAndCountAll.mockImplementation(async () => ({ count: 0, rows: [] }));
    mocks.findOne.mockImplementation(async (options: Record<string, unknown>) => {
        const where = (options.where ?? {}) as Record<string, unknown>;
        if (where.id === roleId) {
            return rowsAsInstances([{ id: roleId, tenant: "tenant-a", title: "Admin" }])[0];
        }
        return null;
    });
    mocks.create.mockImplementation(async (data: Record<string, unknown>) => ({
        toJSON: () => ({ ...fixtureRow, ...data }),
        get: (key: string) => (data as Record<string, unknown>)[key],
    }));

    const res = await runAs(() =>
        mountApi().request("/api/people", {
            method: "POST",
            headers: { Locale: "en", "Content-Type": "application/json" },
            body: JSON.stringify({
                firstName: "New",
                lastName: "Person",
                role: roleId,
                email: "new-person@example.com",
                real: false,
            }),
        })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expectPublicPerson("created person", body.data);
    for (const sentinel of sentinels) {
        expect(JSON.stringify(body)).not.toContain(sentinel);
    }
});

it("registers an account without returning its activation credential", async () => {
    vi.clearAllMocks();
    process.env.REGISTRATION_ENABLED = "true";
    mocks.roles.mockImplementation(async () => []);
    mocks.findOne.mockImplementation(async (options: Record<string, unknown>) => {
        const where = (options.where ?? {}) as Record<string, unknown>;
        if (Object.hasOwn(where, "title")) {
            return rowsAsInstances([{ id: roleId, tenant: "tenant-a", title: "User" }])[0];
        }
        return null;
    });
    mocks.create.mockImplementation(async (data: Record<string, unknown>) => ({
        toJSON: () => ({ ...fixtureRow, ...data }),
        get: (key: string) => (data as Record<string, unknown>)[key],
    }));
    mocks.findByPk.mockImplementation(async () => rowsAsInstances([{ ...fixtureRow, tenant: tenantId }])[0]);
    mocks.tenants.mockImplementation(async () => rowsAsInstances([{ id: tenantId, tenant: "tenant-a" }])[0]);

    const res = await runAs(() =>
        mountApi().request("/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: "new-person@example.com",
                password: "long-enough-password",
                tenant: tenantId,
                firstName: "New",
                lastName: "Person",
            }),
        })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expectPublicPerson("registration payload", body.data);
    for (const sentinel of sentinels) {
        expect(JSON.stringify(body)).not.toContain(sentinel);
    }
});
