// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Database configuration and connection management
 *
 * This module sets up Sequelize ORM for PostgreSQL database connection
 * with environment-based configuration and connection testing.
 */
import { Sequelize } from "sequelize";

// Database connection configuration
const IS_DEVELOPMENT = process.env.NODE_ENV === "development";
const dbServerAuth = {
    host: process.env.POSTGRES_HOST ?? "localhost",
    port: parseInt(process.env.POSTGRES_PORT ?? "5432"),
    username: process.env.POSTGRES_USER ?? "postgres",
    password: process.env.POSTGRES_PASSWORD ?? "postgres",
    database: process.env.POSTGRES_DB ?? "stacks_hono",
};

export const sequelize = new Sequelize({
    dialect: "postgres",
    ...dbServerAuth,
    logging: process.env.DEBUG_DB === "true" ? console.log : false, // Enable logging in development
    pool: {
        max: 10, // Maximum number of connections
        min: 0, // Minimum number of connections
        acquire: 30000, // Maximum time to get connection (ms)
        idle: 10000, // Maximum time connection can be idle (ms)
    },
    retry: {
        max: 3, // Maximum number of retry attempts
    },
});

/**
 * Establishes database connection and handles schema management
 *
 * @returns {Promise<void>}
 * @throws {Error} If database connection or schema management fails
 */
export const connectDb = async (init?: boolean): Promise<void> => {
    try {
        // Test database connection
        await sequelize.authenticate();
        console.log("✅ Database connection established successfully");

        // Handle schema management based on environment
        if (IS_DEVELOPMENT || init === true) {
            // In development, use sync for rapid development
            await sequelize.sync({ alter: true });
            console.log("✅ Database models synchronized (development mode)");
        }
    } catch (error) {
        console.error("❌ Database initialization failed:", error);
        throw new Error(
            `Database initialization failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
};
