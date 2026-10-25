// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { beforeEach, expect, test, vi } from "vitest";
import { Hono } from "hono";

const state = vi.hoisted(() => ({
    user: {} as Record<string, unknown>,
    tenantDisabled: false,
    sessions: [] as Record<string, unknown>[],
    afterPasswordComparison: undefined as (() => void) | undefined,
    resetBeforeInsert: false,
    userLocked: false,
    pendingReset: undefined as (() => void) | undefined,
}));

const snapshotUser = () => {
    const values = { ...state.user };
    return { get: (key: string) => values[key], toJSON: () => values };
};

vi.mock("@stacks/db", () => ({
    sequelize: {
        transaction: async <T>(callback: (transaction: unknown) => Promise<T>) => {
            try {
                return await callback({ LOCK: { UPDATE: "UPDATE" } });
            } finally {
                state.userLocked = false;
                state.pendingReset?.();
                state.pendingReset = undefined;
            }
        },
    },
    UserEntity: {
        findOne: async () => snapshotUser(),
        findByPk: async (_id: string, options?: { lock?: string }) => {
            state.userLocked = options?.lock === "UPDATE";
            return snapshotUser();
        },
    },
    TenantEntity: {
        findOne: async () => ({ get: (key: string) => key === "disabled" && state.tenantDisabled }),
        findByPk: async () => ({ get: (key: string) => key === "disabled" && state.tenantDisabled }),
    },
    SessionEntity: {
        create: async (values: Record<string, unknown>) => {
            if (state.resetBeforeInsert) {
                const reset = () => {
                    state.user.password = "replacement-password-hash";
                    state.sessions = [];
                };
                // A password reset must obtain the same user-row lock before
                // replacing the password and revoking its existing sessions.
                if (state.userLocked) state.pendingReset = reset;
                else reset();
            }
            state.sessions.push(values);
        },
    },
}));
vi.mock("bcryptjs", () => ({
    compare: async () => {
        state.afterPasswordComparison?.();
        return true;
    },
}));
vi.mock("../loaders", () => ({ EmailsLoader: {}, TenantsLoader: {} }));
vi.mock("../middleware/auth", () => ({
    browserMutationAllowed: async () => true,
    browserRequestToken: async () => "csrf",
    rotateBrowserNonce: async () => undefined,
    resolveAccountState: async () => ({ ok: true, user: snapshotUser() }),
}));
vi.mock("../utils/authRateLimit", () => ({ enforceAuthAttemptLimit: async () => undefined }));
vi.mock("../utils/logger", () => ({
    Logger: { info: vi.fn(), security: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import auth from "../routes/auth";
import login from "../routes/login";
import { registerResponseHelpers } from "./response";
import { errorHandler } from "../utils/errorHandler";

beforeEach(() => {
    state.user = {
        id: "user-1",
        tenant: "tenant-1",
        email: "login@example.com",
        password: "original-password-hash",
        disabled: false,
        deleted: null,
    };
    state.tenantDisabled = false;
    state.sessions = [];
    state.afterPasswordComparison = undefined;
    state.resetBeforeInsert = false;
    state.userLocked = false;
    state.pendingReset = undefined;
});

const requestLogin = async (transport: "json" | "html") => {
    const app = new Hono();
    registerResponseHelpers(app);
    app.onError(errorHandler);
    app.route("/auth", auth);
    app.route("/login", login);
    return transport === "json"
        ? app.request("/auth/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: "login@example.com", password: "old-password" }),
          })
        : app.request("/login", {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: "email=login%40example.com&password=old-password",
          });
};

test.each(["json", "html"] as const)(
    "%s login cannot issue a session after its checked password was reset",
    async transport => {
        state.afterPasswordComparison = () => {
            state.user.password = "replacement-password-hash";
        };

        const response = await requestLogin(transport);

        expect(state.sessions).toHaveLength(0);
        if (transport === "json") expect(response.status).toBe(401);
        else expect(response.headers.get("location")).toBe("/login");
    }
);

test.each(["json", "html"] as const)(
    "%s login still issues a session for unchanged credentials",
    async transport => {
        const response = await requestLogin(transport);

        expect(state.sessions).toHaveLength(1);
        expect(response.status).toBe(transport === "json" ? 200 : 302);
        if (transport === "html") expect(response.headers.get("location")).toBe("/app");
    }
);

test.each(["disabled", "deleted", "activationTokenHash"])(
    "a login whose account becomes %s after password comparison issues no session",
    async field => {
        state.afterPasswordComparison = () => {
            state.user[field] = field === "disabled" ? true : "changed";
        };

        const response = await requestLogin("json");

        expect(response.status).toBe(401);
        expect(state.sessions).toHaveLength(0);
    }
);

test.each(["json", "html"] as const)(
    "%s login cannot escape a reset that starts between the final credential read and session insert",
    async transport => {
        state.resetBeforeInsert = true;

        await requestLogin(transport);

        expect(state.user.password).toBe("replacement-password-hash");
        expect(state.sessions).toHaveLength(0);
    }
);
