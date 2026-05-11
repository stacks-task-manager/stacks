// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
const fs = require("fs");
const path = require("path");

/**
 * Post-build script that creates a production-ready package.json
 * and copies runtime-required files (locales, static assets) into dist/.
 */
async function postBuild() {
    console.log("Starting post-build process...");
    const distDir = path.join(__dirname, "dist");

    if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, { recursive: true });
    }

    // Copy locales recursively. Locales live in packages/server/locales/{server,app}/*.json
    // and are read at runtime by the server's i18n preload.
    const localesSource = path.join(__dirname, "locales");
    const localesDest = path.join(distDir, "locales");
    if (!fs.existsSync(localesSource)) {
        throw new Error(`Locales source directory not found: ${localesSource}`);
    }
    fs.cpSync(localesSource, localesDest, { recursive: true });
    console.log(`Copied locales from ${localesSource} to ${localesDest}`);

    // Build a production package.json with devDependencies stripped and a single start script.
    const packageJsonPath = path.join(__dirname, "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    const devDepCount = Object.keys(packageJson.devDependencies || {}).length;

    const productionPackageJson = { ...packageJson };
    delete productionPackageJson.devDependencies;
    productionPackageJson.scripts = { start: "node server.js" };

    // Bundled by esbuild (see esbuild.config.js); omit so Docker `yarn install` does not resolve workspace:*.
    ["@stacks/translations"].forEach(dep => {
        if (productionPackageJson.dependencies?.[dep]) {
            delete productionPackageJson.dependencies[dep];
        }
    });

    const distPackageJsonPath = path.join(distDir, "package.json");
    fs.writeFileSync(distPackageJsonPath, JSON.stringify(productionPackageJson, null, 2), "utf8");
    console.log(`Wrote ${distPackageJsonPath} (stripped ${devDepCount} devDependencies)`);

    // Copy the static folder (HTML templates + preview assets served at /static).
    const staticSource = path.join(__dirname, "static");
    const staticDest = path.join(distDir, "static");
    if (!fs.existsSync(staticSource)) {
        throw new Error(`Static source directory not found: ${staticSource}`);
    }
    fs.cpSync(staticSource, staticDest, { recursive: true });
    console.log(`Copied static from ${staticSource} to ${staticDest}`);

    console.log("Post-build complete.");
}

if (require.main === module) {
    postBuild().catch(error => {
        console.error("Post-build failed:", error);
        process.exit(1);
    });
}

module.exports = { postBuild };
