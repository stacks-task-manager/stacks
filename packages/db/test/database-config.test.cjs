// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");

function loadConfig(envContents, overrides = {}) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "stacks-db-config-"));
    try {
        fs.mkdirSync(path.join(directory, "config"));
        const configPath = path.join(directory, "config", "database.cjs");
        fs.copyFileSync(path.join(__dirname, "../config/database.cjs"), configPath);
        if (envContents !== undefined) fs.writeFileSync(path.join(directory, ".env"), envContents);
        const env = Object.fromEntries(
            Object.entries(process.env).filter(([key]) => !key.startsWith("POSTGRES_") && key !== "DEBUG_DB")
        );
        const result = spawnSync(
            process.execPath,
            ["-e", "process.stdout.write(JSON.stringify(require(process.argv[1])))", configPath],
            { env: { ...env, ...overrides }, encoding: "utf8", cwd: os.tmpdir() }
        );
        assert.equal(result.status, 0, result.stderr);
        return JSON.parse(result.stdout);
    } finally {
        fs.rmSync(directory, { recursive: true, force: true });
    }
}

test("migration tooling reads the database package .env independently of the working directory", () => {
    const config = loadConfig(
        "POSTGRES_HOST=127.0.0.1\nPOSTGRES_PORT=15432\nPOSTGRES_USER=scenario\n" +
            "POSTGRES_PASSWORD=fixture-only\nPOSTGRES_DB=scenario_db\n"
    );
    assert.equal(config.development.host, "127.0.0.1");
    assert.equal(config.development.port, "15432");
    assert.equal(config.development.username, "scenario");
    assert.equal(config.development.password, "fixture-only");
    assert.equal(config.development.database, "scenario_db");
});

test("explicit environment overrides take precedence over the database package .env", () => {
    const config = loadConfig("POSTGRES_PORT=15432\nPOSTGRES_DB=file_db\n", {
        POSTGRES_PORT: "25432",
        POSTGRES_DB: "explicit_db",
    });
    assert.equal(config.development.port, "25432");
    assert.equal(config.development.database, "explicit_db");
});

test("migration tooling retains development defaults when no .env exists", () => {
    const config = loadConfig(undefined);
    assert.equal(config.development.host, "localhost");
    assert.equal(config.development.port, 5432);
    assert.equal(config.development.database, "stacks_hono");
});
