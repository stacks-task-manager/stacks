// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { defineConfig } from "vitest/config";

/** Unit tests that do not require DB globalSetup */
export default defineConfig({
    test: {
        globals: true,
        pool: "forks",
        include: [
            "test/config/secrets.test.ts",
            "test/utils/files.test.ts",
            "test/embedded-integrity.test.ts",
            "src/utils/__tests__/cache-tenant-isolation.test.ts",
            "src/utils/__tests__/errorHandler.test.ts",
            "src/middleware/validator.query.test.ts",
            "src/loaders/__tests__/utils.test.ts",
            "src/ai/__tests__/promptTemplate.test.ts",
            "src/ai/__tests__/clientRoute.test.ts",
            "src/ai/__tests__/promptContext.test.ts",
            "src/ai/__tests__/searchPeopleSchema.test.ts",
            "src/ai/__tests__/stackTools.test.ts",
            "src/ai/__tests__/taskTools.test.ts",
            "src/ai/__tests__/widgetsFromToolResult.test.ts",
        ],
    },
});
