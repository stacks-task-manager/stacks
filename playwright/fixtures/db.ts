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

    /** Raw activation token extracted from the queued email link; only its hash is stored on the user. */
    async getActivationToken(email: string): Promise<string | null> {
        const user = await this.pool.query(`SELECT "id" FROM "users" WHERE "email" = $1 LIMIT 1`, [email]);
        const userId = user.rows[0]?.id;
        if (!userId) {
            return null;
        }
        const result = await this.pool.query(
            `SELECT "data" FROM "email_queue"
             WHERE "userId" = $1 AND "template" = 'registration'
             ORDER BY "created" DESC LIMIT 1`,
            [userId]
        );
        const verificationLink = result.rows[0]?.data?.verificationLink;
        if (typeof verificationLink !== "string") {
            return null;
        }
        return new URL(verificationLink, "http://localhost").pathname.split("/").pop() ?? null;
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
            await this.pool.query(`DELETE FROM "preferences" WHERE "userId" = $1`, [userId]);
            await this.pool.query(`DELETE FROM "email_queue" WHERE "userId" = $1`, [userId]);
            await this.pool.query(`DELETE FROM "auth_sessions" WHERE "userId" = $1`, [userId]);
            await this.pool.query(`DELETE FROM "users" WHERE "id" = $1`, [userId]);
        }
    }

    /** Removes only a contact ID captured from this scenario's create response. */
    async cleanupPerson(id: string): Promise<void> {
        await this.pool.query(`DELETE FROM "preferences" WHERE "userId" = $1`, [id]);
        await this.pool.query(`DELETE FROM "email_queue" WHERE "userId" = $1`, [id]);
        await this.pool.query(`DELETE FROM "users" WHERE "id" = $1 AND "real" = false`, [id]);
        const remaining = await this.pool.query(`SELECT "id" FROM "users" WHERE "id" = $1`, [id]);
        if (remaining.rowCount) throw new Error(`Scenario contact ${id} remains after cleanup`);
    }

    /** Removes only a company ID captured from this scenario's create response. */
    async cleanupCompany(id: string): Promise<void> {
        await this.pool.query(`DELETE FROM "companies" WHERE "id" = $1`, [id]);
        const remaining = await this.pool.query(`SELECT "id" FROM "companies" WHERE "id" = $1`, [id]);
        if (remaining.rowCount) throw new Error(`Scenario company ${id} remains after cleanup`);
    }

    /** Removes a definition ID captured from a scenario-owned tag/status creation. */
    async cleanupTag(id: string): Promise<void> {
        await this.pool.query(`DELETE FROM "tags" WHERE "id" = $1`, [id]);
        const remaining = await this.pool.query(`SELECT "id" FROM "tags" WHERE "id" = $1`, [id]);
        if (remaining.rowCount) throw new Error(`Scenario tag ${id} remains after cleanup`);
    }

    /**
     * Removes a scenario-owned document plus everything the server cascade removes
     * (removeRecursive at packages/server/src/loaders/documents.ts:216): folder children
     * recursively, and the entity payload for project/notepad/file records (stacks included).
     * Tasks are NOT cascaded — call cleanupProjectTaskRecords first for those.
     */
    async cleanupDocument(id: string): Promise<void> {
        const errors: unknown[] = [];
        const attempt = async (action: () => Promise<unknown>) => {
            try {
                await action();
            } catch (error) {
                errors.push(error);
            }
        };
        const records: { id: string; type: string }[] = [];
        const queue = [id];
        while (queue.length) {
            const batch = queue.splice(0, 25);
            const clause = batch.map((_, index) => `$${index + 1}`).join(", ");
            const found = await this.pool.query(
                `SELECT "id", "type" FROM "documents" WHERE "id" IN (${clause})`,
                batch
            );
            for (const row of found.rows) {
                records.push({ id: row.id, type: row.type });
                const children = await this.pool.query(`SELECT "id" FROM "documents" WHERE "parent" = $1`, [
                    row.id,
                ]);
                queue.push(...children.rows.map(child => child.id));
            }
        }
        for (const record of records) {
            if (record.type === "project") {
                await attempt(() =>
                    this.pool.query(`DELETE FROM "stacks" WHERE "project" = $1`, [record.id])
                );
                await attempt(() => this.pool.query(`DELETE FROM "projects" WHERE "id" = $1`, [record.id]));
            } else if (record.type === "notepad") {
                await attempt(() => this.pool.query(`DELETE FROM "notepads" WHERE "id" = $1`, [record.id]));
            } else if (record.type === "file") {
                await attempt(() => this.pool.query(`DELETE FROM "files" WHERE "id" = $1`, [record.id]));
            }
        }
        const allIds = records.map(record => record.id);
        if (allIds.length) {
            const clause = allIds.map((_, index) => `$${index + 1}`).join(", ");
            await attempt(() => this.pool.query(`DELETE FROM "documents" WHERE "id" IN (${clause})`, allIds));
        }
        const remaining = await this.pool.query(`SELECT "id" FROM "documents" WHERE "id" = $1`, [id]);
        if (remaining.rowCount) throw new Error(`Scenario document ${id} remains after cleanup`);
        if (errors.length) throw new AggregateError(errors, `Scenario document ${id} cleanup failed`);
    }

    /**
     * A scenario-owned project is the ownership boundary, including archived/deleted
     * tasks and detached subtasks. Document deletion does not remove these entities.
     * Call before removing the project; also call for owned move destinations.
     */
    async cleanupProjectTaskRecords(projectId: string): Promise<void> {
        const tasks = await this.pool.query(`SELECT "id" FROM "tasks" WHERE "project" = $1`, [projectId]);
        const errors: unknown[] = [];
        const attempt = async (action: () => Promise<unknown>) => {
            try {
                await action();
            } catch (error) {
                errors.push(error);
            }
        };
        for (const { id } of tasks.rows) {
            await attempt(() => this.pool.query(`DELETE FROM "activities" WHERE "resourceId" = $1`, [id]));
            await attempt(() => this.pool.query(`DELETE FROM "timelogs" WHERE "task" = $1`, [id]));
            await attempt(() => this.pool.query(`DELETE FROM "notifications" WHERE "recordId" = $1`, [id]));
            await attempt(() => this.pool.query(`DELETE FROM "permissions" WHERE "id" = $1`, [id]));
            await attempt(() =>
                this.pool.query(`DELETE FROM "tasks" WHERE "id" = $1 AND "project" = $2`, [id, projectId])
            );
            await attempt(async () => {
                const remaining = await this.getTaskRecordCounts(id);
                if (Object.values(remaining).some(count => count !== 0)) {
                    throw new Error(`Scenario task ${id} retains records: ${JSON.stringify(remaining)}`);
                }
            });
        }
        await attempt(async () => {
            const remaining = await this.pool.query(`SELECT "id" FROM "tasks" WHERE "project" = $1`, [
                projectId,
            ]);
            if (remaining.rowCount) throw new Error(`Scenario project ${projectId} still owns tasks`);
        });
        if (errors.length)
            throw new AggregateError(errors, `Scenario project ${projectId} task cleanup failed`);
    }

    async getTaskRecordCounts(id: string): Promise<{
        tasks: number;
        activities: number;
        timelogs: number;
        permissions: number;
        notifications: number;
    }> {
        const result = await this.pool.query(
            `SELECT
                (SELECT count(*)::int FROM "tasks" WHERE "id" = $1) AS tasks,
                (SELECT count(*)::int FROM "activities" WHERE "resourceId" = $1) AS activities,
                (SELECT count(*)::int FROM "timelogs" WHERE "task" = $1) AS timelogs,
                (SELECT count(*)::int FROM "permissions" WHERE "id" = $1) AS permissions,
                (SELECT count(*)::int FROM "notifications" WHERE "recordId" = $1) AS notifications`,
            [id]
        );
        return result.rows[0];
    }

    /**
     * Creates an active (non-`disabled`, no activation token) user that can log
     * in, borrowing the tenant and role of the configured admin user so the row
     * satisfies its foreign keys. Returns the plaintext password for logging in.
     */
    async createActiveUser(email: string, password: string, roleTitle?: string): Promise<string> {
        const adminEmail = process.env.E2E_ADMIN_EMAIL ?? "admin@example.com";
        const admin = await this.pool.query(
            `SELECT "tenant", "role" FROM "users" WHERE "email" = $1 LIMIT 1`,
            [adminEmail]
        );
        const { tenant, role: adminRole } = admin.rows[0];
        let role = adminRole;
        if (roleTitle) {
            const matchingRole = await this.pool.query(
                `SELECT "id" FROM "roles" WHERE "tenant" = $1 AND "title" = $2 AND "disabled" = false LIMIT 1`,
                [tenant, roleTitle]
            );
            role = matchingRole.rows[0]?.id;
        }
        if (!tenant || !role) {
            throw new Error(
                roleTitle
                    ? `Role ${roleTitle} not found for the configured admin tenant`
                    : `Admin user ${adminEmail} not found; cannot create active test user`
            );
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

    /**
     * Creates an active user with a scenario-owned, least-privilege role. Pass a
     * `tenant` from createScenarioTenant to place the user outside the configured
     * admin's tenant, which is how cross-tenant access restrictions are exercised.
     * Returns the role title for cleanupRole.
     */
    async createActiveUserWithAccess(
        email: string,
        password: string,
        access: Record<string, { read?: boolean; write?: boolean }>,
        tenant?: string
    ): Promise<string> {
        const adminEmail = process.env.E2E_ADMIN_EMAIL ?? "admin@example.com";
        const admin = await this.pool.query(`SELECT "id", "tenant" FROM "users" WHERE "email" = $1 LIMIT 1`, [
            adminEmail,
        ]);
        const { id: adminId, tenant: adminTenant } = admin.rows[0] ?? {};
        if (!adminId || !adminTenant) throw new Error(`Admin user ${adminEmail} not found`);
        const targetTenant = tenant ?? adminTenant;

        const roleTitle = `E2E ${email}`;
        const client = await this.pool.connect();
        try {
            await client.query("BEGIN");
            const role = await client.query(
                `INSERT INTO "roles" ("id", "title", "description", "access", "disabled", "tenant", "createdBy", "updatedBy", "created", "updated")
                 VALUES (gen_random_uuid(), $1, 'Scenario role', $2::jsonb, false, $3, $4, $4, now(), now())
                 RETURNING "id"`,
                [roleTitle, JSON.stringify(access), targetTenant, adminId]
            );
            await client.query(
                `INSERT INTO "users"
                   ("id", "email", "password", "firstName", "lastName", "role", "tenant",
                    "real", "disabled", "created", "updated")
                 VALUES (gen_random_uuid(), $1, $2, 'E2E', 'Recovery', $3, $4, true, false, now(), now())`,
                [email, await hash(password, 10), role.rows[0].id, targetTenant]
            );
            await client.query("COMMIT");
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
        return roleTitle;
    }

    /** Deletes a scenario-owned role by its unique title after its user has been removed. */
    async cleanupRole(title: string): Promise<void> {
        await this.pool.query(`DELETE FROM "roles" WHERE "title" = $1 AND "description" = 'Scenario role'`, [
            title,
        ]);
    }

    /**
     * Creates a scenario-owned tenant so a scenario can exercise access from a
     * tenant the signed-in user does not belong to. Login validates the tenant
     * against the DB (packages/server/src/routes/auth.ts), not the license, so a
     * future-dated, enabled tenant is a usable foreign tenant. Returns its id.
     */
    async createScenarioTenant(title: string): Promise<string> {
        const created = await this.pool.query(
            `INSERT INTO "tenants" ("id", "title", "description", "disabled", "expiry", "created", "updated")
             VALUES (gen_random_uuid(), $1, 'Scenario tenant', false, $2, now(), now())
             RETURNING "id"`,
            [title, "2099-12-31T00:00:00.000Z"]
        );
        const id = created.rows[0]?.id;
        if (!id) throw new Error(`Scenario tenant ${title} was not created`);
        return String(id);
    }

    /** Deletes a scenario-owned tenant by id; the description guard keeps seeded license tenants intact. */
    async cleanupTenant(id: string): Promise<void> {
        await this.pool.query(`DELETE FROM "tenants" WHERE "id" = $1 AND "description" = 'Scenario tenant'`, [
            id,
        ]);
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
