// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, expect, it } from "vitest";
import { validateTestDatabaseTarget } from "../helpers/testDatabaseSafety";

const SAFE_TARGET = {
    NODE_ENV: "test",
    ALLOW_TEST_DB_RESET: "1",
    POSTGRES_HOST: "localhost",
    POSTGRES_PORT: "15432",
    POSTGRES_USER: "postgres",
    POSTGRES_PASSWORD: "postgres",
    POSTGRES_DB: "stacks_test",
};

const withOverrides = (overrides: Record<string, string | undefined>) => {
    const env = { ...SAFE_TARGET };
    for (const [key, value] of Object.entries(overrides)) {
        if (value === undefined) {
            delete env[key];
        } else {
            env[key] = value;
        }
    }
    return env as NodeJS.ProcessEnv;
};

describe("validateTestDatabaseTarget", () => {
    it("accepts an explicit disposable test target", () => {
        expect(validateTestDatabaseTarget(SAFE_TARGET as NodeJS.ProcessEnv)).toEqual([]);
    });

    it("rejects a missing reset opt-in", () => {
        expect(validateTestDatabaseTarget(withOverrides({ ALLOW_TEST_DB_RESET: undefined }))).toEqual([
            "RESET_OPT_IN_MISSING",
        ]);
    });

    it("rejects a missing DB name (accidental default target)", () => {
        expect(validateTestDatabaseTarget(withOverrides({ POSTGRES_DB: undefined }))).toEqual([
            "DB_NAME_MISSING",
        ]);
    });

    it("rejects a non-test DB name", () => {
        expect(validateTestDatabaseTarget(withOverrides({ POSTGRES_DB: "stacks" }))).toEqual([
            "DB_NAME_NOT_TEST_SUFFIX",
        ]);
    });

    it("rejects production mode even with the opt-in", () => {
        expect(validateTestDatabaseTarget(withOverrides({ NODE_ENV: "production" }))).toEqual([
            "NODE_ENV_NOT_TEST",
        ]);
    });

    it("rejects an implicit connection target", () => {
        expect(
            validateTestDatabaseTarget(withOverrides({ POSTGRES_HOST: undefined, POSTGRES_PORT: undefined }))
        ).toEqual(["CONNECTION_TARGET_INCOMPLETE"]);
    });

    it("collects every problem in one pass", () => {
        expect(
            validateTestDatabaseTarget(
                withOverrides({
                    NODE_ENV: "development",
                    ALLOW_TEST_DB_RESET: undefined,
                    POSTGRES_DB: "stacks",
                })
            )
        ).toEqual(["NODE_ENV_NOT_TEST", "RESET_OPT_IN_MISSING", "DB_NAME_NOT_TEST_SUFFIX"]);
    });
});
