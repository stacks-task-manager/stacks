#!/usr/bin/env node
// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.

/**
 * Bump the patch version of @stacks/types.
 *
 * Dependent packages use `workspace:*` for @stacks/types. Run `yarn install` at the repo root
 * after publishing or when you need the lockfile to reflect a version change.
 */

const fs = require("fs");
const path = require("path");

const TYPES_PACKAGE_JSON = path.join(__dirname, "../packages/types/package.json");

function readPackageJson(filePath) {
    const content = fs.readFileSync(filePath, "utf8");
    return JSON.parse(content);
}

function writePackageJson(filePath, packageData) {
    fs.writeFileSync(filePath, JSON.stringify(packageData, null, 2) + "\n");
}

function incrementVersion(version) {
    const parts = version.split(".");
    const patch = parseInt(parts[2], 10) + 1;
    return `${parts[0]}.${parts[1]}.${patch}`;
}

function main() {
    try {
        console.log("Starting @stacks/types version bump...\n");

        const typesPackage = readPackageJson(TYPES_PACKAGE_JSON);
        const currentVersion = typesPackage.version;
        const newVersion = incrementVersion(currentVersion);

        console.log(`Updating @stacks/types from ${currentVersion} to ${newVersion}`);

        typesPackage.version = newVersion;
        writePackageJson(TYPES_PACKAGE_JSON, typesPackage);

        console.log("\nDone. Run `yarn install` at the repo root if needed.");
    } catch (error) {
        console.error("Error updating types version:", error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}
