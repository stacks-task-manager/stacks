// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import path from "node:path";
import { defineConfig } from "vitest/config";

/** Unit tests that do not require DB globalSetup */
export default defineConfig({
    resolve: { alias: { src: path.resolve(__dirname, "src") } },
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
