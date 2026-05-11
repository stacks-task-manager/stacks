// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { setupInitialUser, teardownTestData, getAuthToken } from "./helpers/authHelper";
import { connectDb, sequelize } from "@stacks/db";
import { seedDatabase } from "../src/seed/index";
import { __setLicenseForTests } from "@stacks/license";
import { TEST_LICENSE } from "./helpers/testLicense";

// This function will be called by Vitest before tests run
export async function setup() {
    process.env.NODE_ENV = "test";
    console.log("Global Setup: Starting...");
    // Initialize database connection and seed data before tests
    // Force schema sync in test environment to ensure tables exist
    await connectDb(true);
    await sequelize.sync({ force: true });
    // Inject a test license so seeding can proceed without reading files (worker also uses test/vitestSetup.ts)
    __setLicenseForTests(TEST_LICENSE);
    await seedDatabase();
    await setupInitialUser();
    console.log("Global Setup: Complete.");

    // This function will be called by Vitest after all tests have run
    return async () => {
        console.log("Global Teardown: Starting...");
        await teardownTestData();

        console.log("Global Teardown: Closing database connections...");
        const withTimeout = <T>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
            return Promise.race([
                promise,
                new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timeout`)), ms)),
            ]);
        };

        const forceDestroyPool = async (pool: any): Promise<void> => {
            if (!pool || typeof pool !== "object") {
                return;
            }

            if (!Array.isArray(pool._availableObjects) && !Array.isArray(pool._inUseObjects)) {
                return;
            }

            pool._draining = true;
            pool._removeIdleScheduled = false;
            if (pool._removeIdleTimer) {
                clearTimeout(pool._removeIdleTimer);
            }

            const resources = [...(pool._availableObjects ?? []), ...(pool._inUseObjects ?? [])].map(
                (o: any) => o?.resource ?? o
            );

            pool._availableObjects = [];
            pool._inUseObjects = [];
            pool._pendingAcquires = [];
            pool._count = 0;

            for (const resource of resources) {
                try {
                    await pool._factory?.destroy?.(resource);
                } catch {}
            }
        };

        try {
            const poolLike = (sequelize as any)?.connectionManager?.pool;
            const pools = [poolLike, poolLike?.read, poolLike?.write, poolLike?.pool].filter(Boolean);

            for (const pool of pools) {
                await withTimeout(forceDestroyPool(pool), 5000, "pool.forceDestroy");
                if (pool?.destroyAllNow) {
                    await withTimeout(pool.destroyAllNow(), 5000, "pool.destroyAllNow");
                }
            }

            console.log("Global Teardown: Database pool destroyed.");
        } catch (err) {
            console.warn("Global Teardown: Failed to fully destroy DB pool:", err);
        }

        console.log("Global Teardown: Complete.");
    };
}
