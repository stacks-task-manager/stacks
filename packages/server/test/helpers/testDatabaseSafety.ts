// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Safety gate for integration-test database setup. Returns machine-readable
 * reason codes; an empty list means the target is an explicit disposable DB.
 * Callers must run this before any DB import/connection/sync.
 */
export const validateTestDatabaseTarget = (env: NodeJS.ProcessEnv): string[] => {
    const errors: string[] = [];

    if (env.NODE_ENV !== "test") {
        errors.push("NODE_ENV_NOT_TEST");
    }
    if (env.ALLOW_TEST_DB_RESET !== "1") {
        errors.push("RESET_OPT_IN_MISSING");
    }
    if (!env.POSTGRES_DB) {
        errors.push("DB_NAME_MISSING");
    } else if (!env.POSTGRES_DB.endsWith("_test")) {
        errors.push("DB_NAME_NOT_TEST_SUFFIX");
    }
    if (!env.POSTGRES_HOST || !env.POSTGRES_PORT || !env.POSTGRES_USER || !env.POSTGRES_PASSWORD) {
        errors.push("CONNECTION_TARGET_INCOMPLETE");
    }

    return errors;
};

export const formatTestDatabaseErrors = (errors: string[]): string =>
    `Refusing to reset a non-disposable database: ${errors.join(", ")}. ` +
    "Integration tests require NODE_ENV=test, ALLOW_TEST_DB_RESET=1, an explicit POSTGRES_* " +
    "connection target, and POSTGRES_DB ending in _test.";
