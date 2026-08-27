import { Pool } from "pg";
import * as path from "path";
import * as dotenv from "dotenv";
import { hash } from "bcryptjs";

// The auth flows store their one-time tokens in Postgres (raw activation token
// on users.token; the password-reset link inside the queued email's JSONB
// `data`). Reading them back from the DB lets the E2E specs complete the real
// cross-layer flow instead of mocking the API.
//
// The helper uses the same POSTGRES_* settings the server does, so we load
// packages/server/.env (the file the server boots from). If it is absent we
// fall back to the same defaults as packages/db/src/db.ts.

const envFile = path.resolve(__dirname, "../../packages/server/.env");
dotenv.config({ path: envFile, quiet: true });

const cfg = {
    host: process.env.POSTGRES_HOST ?? "localhost",
    port: parseInt(process.env.POSTGRES_PORT ?? "5432", 10),
    user: process.env.POSTGRES_USER ?? "postgres",
    password: process.env.POSTGRES_PASSWORD ?? "postgres",
    database: process.env.POSTGRES_DB ?? "stacks_hono",
};

export class DbHelper {
    private pool: Pool;

    constructor() {
        this.pool = new Pool(cfg);
    }

    async close(): Promise<void> {
        await this.pool.end();
    }

    /** Raw activation token stored on the user row (users.token). */
    async getActivationToken(email: string): Promise<string | null> {
        const result = await this.pool.query(
            `SELECT "token" FROM "users" WHERE "email" = $1 ORDER BY "created" DESC LIMIT 1`,
            [email]
        );
        return result.rows[0]?.token ?? null;
    }

    /**
     * The raw password-reset token is not stored on the user (only its SHA-256
     * hash is), so we read the most recent queued password-reset email and
     * return its `resetLink`. Returns null when no such email exists.
     */
    async getPasswordResetLink(email: string): Promise<string | null> {
        const user = await this.pool.query(`SELECT "id" FROM "users" WHERE "email" = $1 LIMIT 1`, [email]);
        const userId = user.rows[0]?.id;
        if (!userId) {
            return null;
        }
        const result = await this.pool.query(
            `SELECT "data" FROM "email_queue"
             WHERE "userId" = $1 AND "template" = 'password-reset'
             ORDER BY "created" DESC LIMIT 1`,
            [userId]
        );
        return result.rows[0]?.data?.resetLink ?? null;
    }

    /** Deletes a user created during a test plus any queued emails it owns. */
    async cleanupUser(email: string): Promise<void> {
        const user = await this.pool.query(`SELECT "id" FROM "users" WHERE "email" = $1 LIMIT 1`, [email]);
        const userId = user.rows[0]?.id;
        if (userId) {
            await this.pool.query(`DELETE FROM "email_queue" WHERE "userId" = $1`, [userId]);
            await this.pool.query(`DELETE FROM "users" WHERE "id" = $1`, [userId]);
        }
    }

    /**
     * Creates an active (non-`disabled`, no activation token) user that can log
     * in, borrowing the tenant and role of the configured admin user so the row
     * satisfies its foreign keys. Returns the plaintext password for logging in.
     */
    async createActiveUser(email: string, password: string): Promise<string> {
        const adminEmail = process.env.E2E_ADMIN_EMAIL ?? "admin@example.com";
        const admin = await this.pool.query(
            `SELECT "tenant", "role" FROM "users" WHERE "email" = $1 LIMIT 1`,
            [adminEmail]
        );
        const { tenant, role } = admin.rows[0];
        if (!tenant || !role) {
            throw new Error(`Admin user ${adminEmail} not found; cannot create active test user`);
        }
        await this.pool.query(
            `INSERT INTO "users"
               ("id", "email", "password", "firstName", "lastName", "role", "tenant",
                "real", "disabled", "created", "updated")
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true, false, now(), now())`,
            [email, await hash(password, 10), "E2E", "Recovery", role, tenant]
        );
        return password;
    }
}

let helper: DbHelper | null = null;

/**
 * Shared, lazily-created DbHelper. Consumers must call `db.close()` in
 * `afterAll` (or via `closeDb` below) to release the connection pool.
 */
export function getDb(): DbHelper {
    if (!helper) {
        helper = new DbHelper();
    }
    return helper;
}

export async function closeDb(): Promise<void> {
    if (helper) {
        await helper.close();
        helper = null;
    }
}
