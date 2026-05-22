// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Jest resolves @stacks/types and @stacks/translations to dist/ (see jest.config.cjs).
 * Those folders are gitignored; CI and fresh clones may not have run workspace prepare yet.
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const appDir = __dirname;
const repoRoot = path.join(appDir, "..", "..");
const typesEntry = path.join(appDir, "..", "types", "dist", "index.js");
const translationsEntry = path.join(appDir, "..", "translations", "dist", "index.js");

function runYarnWorkspace(workspace, script) {
    const shell = process.platform === "win32";
    const result = spawnSync("yarn", ["workspace", workspace, "run", script], {
        cwd: repoRoot,
        stdio: "inherit",
        shell,
    });
    if (result.status !== 0) {
        process.exit(result.status ?? 1);
    }
}

module.exports = function jestGlobalSetup() {
    if (!fs.existsSync(typesEntry)) {
        runYarnWorkspace("@stacks/types", "compile");
    }
    if (!fs.existsSync(translationsEntry)) {
        runYarnWorkspace("@stacks/translations", "build");
    }
};
