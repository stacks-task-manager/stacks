// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Initial schema migration
 * This migration creates the basic table structure for the application
 */
export default {
    async up() {
        const { connectDb } = await import("./index.js");
        await connectDb(true);
    },

    async down() {},
};
