// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, test, expect } from "vitest";
import { readFileSync } from "fs";
import app from "../src/index";
import { getAuthenticatedHeaders } from "./helpers/authHelper";
import { UserEntity } from "@stacks/db";

async function makeCurrentTestUserAdmin() {
    const { email } = JSON.parse(readFileSync("testUser.json", "utf8")) as { email: string };
    const user = await UserEntity.findOne({ where: { email } });
    if (!user) {
        throw new Error("Test user not found");
    }
    await user.update({ admin: true });
}

describe("Roles API", () => {
    test("GET /api/roles - should require authentication", async () => {
        const res = await app.request("/api/roles");
        expect(res.status).toBe(401);
    });

    test("GET /api/roles - should return roles list for authenticated users", async () => {
        const headers = await getAuthenticatedHeaders();
        const res = await app.request("/api/roles", { headers });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(Array.isArray(body.data)).toBe(true);
    });

    test("POST /api/roles - should create a role", async () => {
        const headers = await getAuthenticatedHeaders();
        const roleData = {
            title: "Test Role",
            description: "Test role description",
            access: {
                projects: { view: true },
            },
        };

        const res = await app.request("/api/roles", {
            method: "POST",
            headers: {
                ...headers,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(roleData),
        });

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.data).toHaveProperty("id");
        expect(body.data.title).toBe(roleData.title);
    });

    test("PATCH /api/roles/:id - should update a role when user is admin", async () => {
        const headers = await getAuthenticatedHeaders();
        await makeCurrentTestUserAdmin();

        const createRes = await app.request("/api/roles", {
            method: "POST",
            headers: {
                ...headers,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                title: "Role To Update",
                description: "before",
                access: { projects: { view: true } },
            }),
        });
        expect(createRes.status).toBe(200);
        const created = await createRes.json();
        const roleId = created.data.id as string;

        const patchRes = await app.request(`/api/roles/${roleId}`, {
            method: "PATCH",
            headers: {
                ...headers,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                title: "Role Updated",
                description: "after",
                access: { projects: { view: true, create: true } },
            }),
        });

        expect(patchRes.status).toBe(200);
        const patchBody = await patchRes.json();
        expect(patchBody.success).toBe(true);
    });
});
