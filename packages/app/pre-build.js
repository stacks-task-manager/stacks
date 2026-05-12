// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
const fs = require("fs");
const path = require("path");

/**
 * When `yarn pre-bundle` runs this script with no CLI args, the package version is bumped
 * only if STACKS_BUMP_PACKAGE_VERSION is set to 1, true, or yes — so local/CI builds do not
 * dirty package.json by default.
 *
 * Explicit release: `node pre-build.js patch` | `minor` | `major` (always bumps).
 */
function isVersionBumpEnabled() {
    const v = process.env.STACKS_BUMP_PACKAGE_VERSION;
    if (v == null || v === "") return false;
    const s = String(v).toLowerCase();
    return s === "1" || s === "true" || s === "yes";
}

/**
 * Default pre-bundle hook: optionally bumps patch (see env above).
 */
async function preBuild() {
    if (!isVersionBumpEnabled()) {
        console.log(
            "pre-build: skipped package.json version bump (set STACKS_BUMP_PACKAGE_VERSION=1 to enable, or run `node pre-build.js patch`)",
        );
        return;
    }
    return incrementVersion("patch");
}

/**
 * Increment specific version type
 * @param {string} type - 'major', 'minor', or 'patch'
 */
async function incrementVersion(type = "patch") {
    try {
        console.log(`🔄 Incrementing ${type} version...`);

        const packageJsonPath = path.join(__dirname, "package.json");
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

        console.log(`📖 Current version: ${packageJson.version}`);

        const versionParts = packageJson.version.split(".").map(Number);
        if (versionParts.length !== 3) {
            throw new Error(`Invalid version format: ${packageJson.version}`);
        }

        let [major, minor, patch] = versionParts;

        switch (type.toLowerCase()) {
            case "major":
                major += 1;
                minor = 0;
                patch = 0;
                break;
            case "minor":
                minor += 1;
                patch = 0;
                break;
            case "patch":
            default:
                patch += 1;
                break;
        }

        const newVersion = `${major}.${minor}.${patch}`;
        packageJson.version = newVersion;

        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + "\n", "utf8");

        console.log(`✅ ${type.charAt(0).toUpperCase() + type.slice(1)} version incremented!`);
        console.log(`📈 New version: ${newVersion}`);
    } catch (error) {
        console.error(`❌ Version increment failed:`, error);
        process.exit(1);
    }
}

if (require.main === module) {
    const args = process.argv.slice(2);
    const versionType = args[0];
    if (versionType && ["major", "minor", "patch"].includes(versionType.toLowerCase())) {
        incrementVersion(versionType.toLowerCase());
    } else {
        preBuild();
    }
}

module.exports = { preBuild, incrementVersion };
