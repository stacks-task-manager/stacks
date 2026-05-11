// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Orchestrates dev/demo DB seeding: users, tenants, then workspace import bundle.
 */
import { seedTenants } from "./tenants.js";
import { seedUsers } from "./users.js";
import { workspaceSeed } from "./workspace.js";
import { DocumentEntity, PermissionEntity, ProjectEntity, UserEntity } from "@stacks/db";
import { RECORDTYPE } from "@stacks/types";
import { randomUUID } from "crypto";
import { getLicense } from "@stacks/license";

/** Runs the full seed pipeline; logs errors without throwing. */
export const seedDatabase = async () => {
    console.log("🗄️ Starting database seeding...");

    try {
        // Seed users first (required for projects)
        await seedUsers();

        await seedTenants();

        await workspaceSeed();

        console.log("✅ Database seeding completed successfully!");
    } catch (error) {
        console.error("❌ Error seeding database:", error);
    }
};
