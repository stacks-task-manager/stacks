// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals: true,
        setupFiles: ["./test/vitestSetup.ts"],
        globalSetup: ["./test/globalSetup.ts"],
        hookTimeout: 30000,
        teardownTimeout: 15000,
        reporters: ["default", "hanging-process"],
        pool: "forks",
        poolOptions: {
            forks: {
                singleFork: true,
            },
        },
    },
});
