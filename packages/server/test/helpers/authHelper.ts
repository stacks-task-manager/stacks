// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import app from "../../src/index"; // Path to your main Hono app instance
import { writeFileSync, readFileSync, existsSync, unlinkSync } from "fs";
import { v4 as uuidv4 } from "uuid";
import { RoleEntity, TenantEntity, UserEntity } from "@stacks/db";
import * as bcrypt from "bcryptjs";

// Function to generate unique user credentials for each test run
export const generateTestUserCredentials = () => {
    return {
        email: `test-${uuidv4()}@example.com`,
        password: "testpassword123",
        firstName: "Test",
        lastName: "User",
    };
};

export async function setupInitialUser(): Promise<void> {
    if (existsSync("testUser.json")) {
        console.log("Auth Helper: Test user already set up.");
        return;
    }

    const credentials = generateTestUserCredentials();
    console.log(`Auth Helper: Attempting to register user: ${credentials.email}`);

    try {
        // Discover the seeded tenant and default 'User' role
        const tenant = await TenantEntity.findOne({ where: {} });
        if (!tenant) {
            throw new Error("No tenants found. Did seeding run?");
        }
        const tenantId = tenant.get("id") as string;

        const userRole = await RoleEntity.findOne({ where: { title: "User", tenant: tenantId } });
        if (!userRole) {
            throw new Error("Default 'User' role not found for test tenant.");
        }
        const roleId = userRole.get("id") as string;

        // Create the user directly in the database to avoid API validation constraints in tests
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(credentials.password, salt);

        await UserEntity.create({
            email: credentials.email,
            password: hashedPassword,
            role: roleId,
            tenant: tenantId,
            firstName: "John",
            lastName: "Doe",
            real: true,
        });

        // testUser = credentials;
        writeFileSync(
            "testUser.json",
            JSON.stringify(
                {
                    email: credentials.email,
                    password: credentials.password,
                },
                null,
                2
            )
        );
        console.log(`Auth Helper: User ${credentials.email} created successfully.`);
    } catch (error) {
        console.error("Auth Helper: Error during user registration:", error);
        throw new Error(
            `Failed to register initial user: ${error instanceof Error ? error.message : String(error)}`
        );
    }
}

export async function getAuthToken(): Promise<string> {
    if (existsSync("auth.token")) {
        return readFileSync("auth.token", "utf8");
    }
    let loginData = {
        // Fallback credentials, replace if needed
        email: "cris@stacks.rocks", // Replace with a valid test user email
        password: "12345678", // Replace with the test user's password
    };
    if (!existsSync("testUser.json")) {
        // Fallback or throw error if setupInitialUser wasn't called or failed
        // For now, let's try to use the default test user if dynamic one isn't set up
        console.warn(
            "Auth Helper: testUser not set up by setupInitialUser. Falling back to default credentials for login."
        );
    }

    loginData = JSON.parse(readFileSync("testUser.json", "utf8"));

    console.log(`Auth Helper: Attempting to login user`, loginData);
    try {
        const res = await app.request("/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(loginData),
        });

        if (res.status !== 200) {
            const errorBody = await res.text();
            throw new Error(`Login failed with status ${res.status}: ${errorBody}`);
        }

        const body = await res.json();
        if (!body.data || !body.data.token) {
            console.error("Login response body:", body);
            throw new Error("Login failed: Token not found or invalid response structure.");
        }

        console.log("Auth Helper: Login successful, token obtained.");
        writeFileSync("auth.token", body.data.token);
        return body.data.token ?? "";
    } catch (error) {
        console.error("Auth Helper: Error during login:", error);
        throw new Error(
            `Failed to obtain auth token: ${error instanceof Error ? error.message : String(error)}`
        );
    }
}

export async function getAuthenticatedHeaders(): Promise<Record<string, string>> {
    const token = await getAuthToken();
    return {
        Authorization: `Bearer ${token}`,
    };
}

export async function teardownTestData(): Promise<void> {
    console.log("Auth Helper: Tearing down test data...");

    if (existsSync("auth.token")) {
        console.log("Auth Helper: Deleting auth token file.");
        unlinkSync("auth.token");
    }

    if (existsSync("testUser.json")) {
        console.log("Auth Helper: Deleting test user file.");
        unlinkSync("testUser.json");
    }

    console.log("Auth Helper: Teardown complete. Token and test user cleared.");
}
