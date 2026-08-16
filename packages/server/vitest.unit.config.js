// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { defineConfig } from "vitest/config";

/** Unit tests that do not require DB globalSetup */
export default defineConfig({
    test: {
        globals: true,
        pool: "forks",
        include: [
            "src/**/*.test.ts",
            "test/config/**/*.test.ts",
            "test/utils/**/*.test.ts",
            "test/embedded-integrity.test.ts",
        ],
    },
});
