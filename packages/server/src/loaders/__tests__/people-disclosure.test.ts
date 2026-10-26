// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Public person disclosure boundary (S01).
 *
 * A user row carries credential columns (`password`, `token`, reset/OAuth state) and internal
 * bookkeeping (`system`, `createdBy`, `deletedBy`, `deleted`). None of those may reach a public
 * person response, so these tests pin the exact allowed key set at every consumer that shares a
 * person row: the directory list/count/single shapes, the federated search payload, and the AI
 * people tools. All values are synthetic sentinels; no real credentials are used.
 */
import { expect, it, vi } from "vitest";
import { PEOPLE_GENDER, RECORDTYPE } from "@stacks/types";
import { DataTypes, Sequelize } from "sequelize";

const mocks = vi.hoisted(() => ({
    findAll: vi.fn(),
    findOne: vi.fn(),
    findAndCountAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    roles: vi.fn(),
}));

vi.mock("@stacks/db", async importOriginal => {
    const actual = (await importOriginal()) as Record<string, any>;
    Object.assign(actual.UserEntity, {
        findAll: mocks.findAll,
        findOne: mocks.findOne,
        findAndCountAll: mocks.findAndCountAll,
        create: mocks.create,
        update: mocks.update,
    });
    Object.assign(actual.RoleEntity, { findAll: mocks.roles, findOne: mocks.findOne });
    return actual;
});
vi.mock("@stacks/license", () => ({
    getLicense: () => ({ tenants: [{ id: "tenant-a", seats: 5 }] }),
}));
vi.mock("../utils/cache", () => ({ invalidateApiCacheForCurrentRequest: vi.fn() }));
vi.mock("../tasks", () => ({ TasksLoader: { getAll: async (_filters: unknown) => [] } }));
vi.mock("../notepads", () => ({ NotepadsLoader: { getAll: async (_filters: unknown) => [] } }));

import { PeopleLoader } from "../people";
import { SearchLoader } from "../search";
import { peopleAiTools } from "../../ai/toolRegistry/peopleTools";
import { requestContext } from "../../services/requestContext";
import { hashAccountToken } from "../../services/accountTokens";

const personId = "22222222-2222-4222-8222-222222222222";
const roleId = "33333333-3333-4333-8333-333333333333";

/** The profile fields a public person response is allowed to carry. */
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

/** Server-only state that must never be serialized into a public person row. */
const privateRow = {
    unknownFutureField: "future-private-sentinel",
    password: "bcrypt-hash-sentinel",
    token: "activation-token-sentinel",
    activationTokenExpiresAt: "2026-01-03T00:00:00.000Z",
    passwordResetTokenHash: "reset-hash-sentinel",
    passwordResetTokenExpiresAt: "2026-01-04T00:00:00.000Z",
    oauthTokens: {
        google: {
            access_token: "google-access-sentinel",
            refresh_token: "google-refresh-sentinel",
            scope: "openid",
            token_type: "Bearer",
            expiry_date: 1,
        },
    },
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
    "google-refresh-sentinel",
];

/** Asserts an exact allowed key set and that no sentinel leaks anywhere in the payload. */
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

const rowsAsInstances = vi.hoisted(
    () => (rows: unknown[]) => rows.map(row => ({ toJSON: () => ({ ...(row as Record<string, unknown>) }) }))
);

/** Calls an AI people tool by name; each tool types its own input schema. */
function callAiTool(name: string, input: Record<string, unknown>): unknown {
    const tool = peopleAiTools.find(tool => tool.name === name) as {
        execute: (input: Record<string, unknown>) => unknown;
    };
    return tool.execute(input);
}

const runAs = <T>(fn: () => T, currentUser = { id: personId, tenant: "tenant-a", admin: true }) =>
    requestContext.run(
        {
            user: currentUser,
            role: { id: roleId, title: "Admin", access: {} },
            instanceId: "instance-1",
            requestId: "request-1",
            timestamp: Date.now(),
        } as any,
        fn
    );

it("lists directory people without credential or internal state fields", async () => {
    vi.clearAllMocks();
    mocks.findAll.mockImplementation(async () => rowsAsInstances([fixtureRow]));

    const people = await runAs(() => PeopleLoader.getAll({}));
    expect(people).toHaveLength(1);
    expectPublicPerson("directory list", people[0]);
});

it("keeps an untrusted birthday-month value from becoming SQL syntax", async () => {
    vi.clearAllMocks();
    let capturedWhere: unknown;
    mocks.findAll.mockImplementation(async (options: { where: unknown }) => {
        capturedWhere = options.where;
        return [];
    });

    await runAs(() => PeopleLoader.getAll({ birthdayMonth: "1 OR 1=1 --" as unknown as number }));

    const sql = new Sequelize({ dialect: "postgres", logging: false });
    try {
        const model = sql.define("User", {
            system: DataTypes.BOOLEAN,
            tenant: DataTypes.STRING,
            deleted: DataTypes.DATE,
            birthday: DataTypes.DATE,
        });
        const where = (sql.getQueryInterface().queryGenerator as any).getWhereConditions(
            capturedWhere,
            "User",
            model
        );

        expect(where).toContain("'1 OR 1=1 --'");
        expect(where).not.toMatch(/=\s*1\s+OR\s+1=1/);
    } finally {
        await sql.close();
    }
});

it("pages and counts the same rows with the same allowed keys", async () => {
    vi.clearAllMocks();
    mocks.findAndCountAll.mockImplementation(async (options: Record<string, unknown>) => {
        const where = (options.where ?? {}) as Record<string, unknown>;
        // Directory queries pin `deleted: null` (live rows); the seat check in `create`
        // asks for soft-deleted rows, which this fixture has none of.
        if (where.deleted !== null) {
            return { count: 0, rows: [] };
        }
        return { count: 1, rows: rowsAsInstances([fixtureRow]) };
    });

    const result = await runAs(() => PeopleLoader.getAllWithCount({ limit: 1 }));
    expect(result.total).toBe(1);
    expect(result.rows).toHaveLength(1);
    expectPublicPerson("counted rows", result.rows[0]);
});

it("reads a single person without credential or internal state fields", async () => {
    vi.clearAllMocks();
    mocks.findOne.mockImplementation(async () => rowsAsInstances([fixtureRow])[0]);

    const person = await runAs(() => PeopleLoader.getOne(personId));
    expectPublicPerson("single person", person);
});

it("does not reveal another login account through unauthorized profile updates", async () => {
    vi.clearAllMocks();
    mocks.findOne.mockImplementation(async (options: Record<string, unknown>) => {
        const where = (options.where ?? {}) as Record<string, unknown>;
        return where.id === personId ? rowsAsInstances([fixtureRow])[0] : null;
    });
    const viewer = { id: "viewer-id", tenant: "tenant-a", admin: false };

    await expect(
        runAs(() => PeopleLoader.update(personId, { firstName: "Changed" }), viewer)
    ).rejects.toMatchObject({
        statusCode: 404,
    });
    await expect(
        runAs(
            () => PeopleLoader.update("55555555-5555-4555-8555-555555555555", { firstName: "Changed" }),
            viewer
        )
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(mocks.update).not.toHaveBeenCalled();
});

it("does not issue an activation credential for a non-login contact", async () => {
    vi.clearAllMocks();
    mocks.findAndCountAll.mockImplementation(async () => ({ count: 0, rows: [] }));
    mocks.findOne.mockImplementation(async (options: Record<string, unknown>) => {
        const where = (options.where ?? {}) as Record<string, unknown>;
        if (where.id === roleId) {
            return rowsAsInstances([{ id: roleId, tenant: "tenant-a", title: "User" }])[0];
        }
        return null;
    });
    mocks.create.mockImplementation(async (data: Record<string, unknown>) => ({
        toJSON: () => ({ ...fixtureRow, ...data }),
    }));

    const created = await runAs(() =>
        PeopleLoader.create({
            email: "new-person@example.com",
            firstName: "New",
            lastName: "Person",
            gender: PEOPLE_GENDER.OTHER,
            real: false,
            role: roleId,
        })
    );

    expect(Object.keys(created).sort()).toEqual(["activationToken", "person"]);
    expectPublicPerson("created person", created.person);
    expect(created.activationToken).toBeNull();
});

it("issues a hashed activation credential for a newly created login user", async () => {
    vi.clearAllMocks();
    mocks.findAndCountAll.mockImplementation(async () => ({ count: 0, rows: [] }));
    mocks.findOne.mockImplementation(async (options: Record<string, unknown>) => {
        const where = (options.where ?? {}) as Record<string, unknown>;
        if (where.id === roleId) return rowsAsInstances([{ id: roleId, tenant: "tenant-a" }])[0];
        return null;
    });
    let createdData: Record<string, unknown> | undefined;
    mocks.create.mockImplementation(async (data: Record<string, unknown>) => {
        createdData = data;
        return { toJSON: () => ({ ...fixtureRow, ...data }) };
    });

    const created = await runAs(() =>
        PeopleLoader.create({
            email: "login-person@example.com",
            firstName: "Login",
            lastName: "Person",
            gender: PEOPLE_GENDER.OTHER,
            real: true,
            role: roleId,
        })
    );

    expect(created.activationToken).toMatch(/^[0-9a-f]{64}$/);
    expect(createdData?.activationTokenHash).toBe(hashAccountToken(created.activationToken!));
    expect(createdData?.activationTokenExpiresAt).toBeInstanceOf(Date);
    expect(createdData).not.toHaveProperty("token");
    expectPublicPerson("created login user", created.person);
});

it("embeds the public person shape in federated search results", async () => {
    vi.clearAllMocks();
    mocks.findAll.mockImplementation(async () => rowsAsInstances([fixtureRow]));

    const results = await runAs(() => SearchLoader.query("ada"));
    const person = results.find(item => item.type === RECORDTYPE.PERSON);
    expect(person).toBeTruthy();
    expectPublicPerson("search payload", (person as { data: unknown }).data);
});

it("keeps AI people tool projections on their documented fields", async () => {
    vi.clearAllMocks();
    mocks.findAll.mockImplementation(async () => rowsAsInstances([fixtureRow]));
    mocks.findAndCountAll.mockImplementation(async () => ({ count: 1, rows: rowsAsInstances([fixtureRow]) }));
    mocks.findOne.mockImplementation(async () => rowsAsInstances([fixtureRow])[0]);
    mocks.roles.mockImplementation(async () => []);

    const getPerson = await runAs(() => callAiTool("getPerson", { personId }));
    expect(Object.keys(getPerson as Record<string, unknown>).sort()).toEqual(
        [
            "birthday",
            "cellPhone",
            "city",
            "company",
            "country",
            "disabled",
            "email",
            "firstName",
            "gender",
            "jobTitle",
            "lastName",
            "nickname",
            "notes",
            "officePhone",
            "roleTitle",
        ].sort()
    );
    for (const sentinel of sentinels) {
        expect(JSON.stringify(getPerson)).not.toContain(sentinel);
    }

    const search = await runAs(() => callAiTool("searchPeople", { query: "ada" }));
    expect(search).toMatchObject({ total: 1, returned: 1, truncated: false });
    const rows = (search as { people: unknown[] }).people;
    expect(rows).toHaveLength(1);
    expect(Object.keys(rows[0] as Record<string, unknown>).sort()).toEqual(
        [
            "birthday",
            "cellPhone",
            "city",
            "company",
            "country",
            "disabled",
            "email",
            "firstName",
            "id",
            "jobTitle",
            "lastName",
            "nickname",
            "notes",
            "officePhone",
            "roleTitle",
        ].sort()
    );
    for (const sentinel of sentinels) {
        expect(JSON.stringify(search)).not.toContain(sentinel);
    }
});
