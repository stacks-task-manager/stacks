// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Orchestrates dev/demo DB seeding: users, tenants, then workspace import bundle.
 */
import { seedTenants } from "./tenants.js";
import { seedUsers } from "./users.js";
import { seedCalendars } from "./calendars.js";
import { workspaceSeed } from "./workspace.js";

/** Runs the full seed pipeline; logs errors without throwing. */
export const seedDatabase = async () => {
    console.log("🗄️ Starting database seeding...");

    try {
        // Seed users first (required for projects)
        await seedUsers();

        await seedTenants();

        await seedCalendars();

        await workspaceSeed();

        console.log("✅ Database seeding completed successfully!");
    } catch (error) {
        console.error("❌ Error seeding database:", error);
    }
};
