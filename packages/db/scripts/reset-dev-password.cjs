// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Dev-only password reset CLI.
 *
 * Resets a user's password directly in the database (bcrypt-hashed) and
 * clears any pending activation token so login is not blocked. Intended as
 * a local recovery tool when a developer forgets the password they set on
 * top of the seeded `$Pa$$w0rd`.
 *
 * Not shipped in release bundles: this file lives under `scripts/` (which
 * is not copied to `build/`) and the npm entry is stripped from the
 * production `package.json` by `post-build.cjs`.
 *
 * Usage:
 *   yarn workspace @stacks/db reset-password:dev -- --email=you@example.com
 *   yarn workspace @stacks/db reset-password:dev -- --email=you@example.com --password='MyNewPass1'
 *   yarn workspace @stacks/db reset-password:dev -- --email=you@example.com --tenant-id=<uuid>
 */
"use strict";

const path = require("path");
const { Sequelize } = require("sequelize");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });

const DEFAULT_PASSWORD = "$Pa$$w0rd";

function refuseInProduction() {
    if (process.env.NODE_ENV === "production") {
        console.error("❌ reset-password:dev is a development tool and cannot run with NODE_ENV=production.");
        process.exit(1);
    }
}

function parseArgs(argv) {
    const args = {};
    for (const raw of argv.slice(2)) {
        const match = raw.match(/^--([^=]+)=(.*)$/);
        if (!match) continue;
        args[match[1]] = match[2];
    }
    return args;
}

function printUsageAndExit() {
    console.error(
        [
            "Usage: yarn workspace @stacks/db reset-password:dev -- --email=<address> [--password=<value>] [--tenant-id=<uuid>]",
            "",
            "  --email       (required) Email of the user to reset",
            `  --password    (optional) New plaintext password (default: ${DEFAULT_PASSWORD})`,
            "  --tenant-id   (optional) Tenant UUID, required when the same email exists in multiple tenants",
        ].join("\n"),
    );
    process.exit(1);
}

async function main() {
    refuseInProduction();

    const args = parseArgs(process.argv);
    const email = args.email;
    const password = args.password ?? DEFAULT_PASSWORD;
    const tenantId = args["tenant-id"];

    if (!email) {
        printUsageAndExit();
    }

    const sequelize = new Sequelize({
        dialect: "postgres",
        host: process.env.POSTGRES_HOST ?? "localhost",
        port: parseInt(process.env.POSTGRES_PORT ?? "5432", 10),
        username: process.env.POSTGRES_USER ?? "postgres",
        password: process.env.POSTGRES_PASSWORD ?? "postgres",
        database: process.env.POSTGRES_DB ?? "stacks",
        logging: false,
    });

    try {
        await sequelize.authenticate();
    } catch (error) {
        console.error("❌ Could not connect to Postgres:", error.message ?? error);
        process.exit(1);
    }

    const [rows] = await sequelize.query(
        `SELECT id, email, tenant FROM users WHERE email = :email${tenantId ? " AND tenant = :tenant" : ""} AND deleted IS NULL`,
        { replacements: { email, tenant: tenantId } },
    );

    if (rows.length === 0) {
        console.error(`❌ No active user found with email "${email}"${tenantId ? ` in tenant ${tenantId}` : ""}.`);
        await sequelize.close();
        process.exit(1);
    }

    if (rows.length > 1) {
        console.error(`❌ Multiple users found with email "${email}". Re-run with --tenant-id=<uuid>:`);
        for (const row of rows) {
            console.error(`   - id=${row.id} tenant=${row.tenant}`);
        }
        await sequelize.close();
        process.exit(1);
    }

    const user = rows[0];
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await sequelize.query(
        `UPDATE users SET password = :password, token = NULL, updated = NOW() WHERE id = :id`,
        { replacements: { password: hashedPassword, id: user.id } },
    );

    console.log(`✅ Password reset for ${user.email} (tenant ${user.tenant}).`);
    if (password === DEFAULT_PASSWORD) {
        console.log(`   New password: ${DEFAULT_PASSWORD} (default)`);
    } else {
        console.log("   New password: (custom value provided via --password)");
    }

    await sequelize.close();
}

main().catch(async error => {
    console.error("❌ Password reset failed:", error?.message ?? error);
    process.exit(1);
});
