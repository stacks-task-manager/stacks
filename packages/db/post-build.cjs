// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
const fs = require("fs");
const path = require("path");

/**
 * Post-build script that creates a production-ready package.json
 * by removing devDependencies and saving it to the dist folder
 */
async function postBuild() {
    try {
        console.log("📦 Starting post-build process...");
        const distDir = path.join(__dirname, "build");

        // Ensure dist directory exists
        if (!fs.existsSync(distDir)) {
            fs.mkdirSync(distDir, { recursive: true });
            console.log("📁 Created dist directory");
        }

        // Read the original package.json
        const packageJsonPath = path.join(__dirname, "package.json");
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

        console.log("📖 Read package.json successfully");

        // Create a production version by removing devDependencies
        const productionPackageJson = {
            ...packageJson,
            devDependencies: undefined, // Remove devDependencies
        };

        ["build", "dist", "post-bundle", "compile:migration", "reset-password:dev"].forEach(script => {
            delete productionPackageJson.scripts[script];
        });

        // Release / Docker: yarn cannot resolve workspace:*. Vendor @stacks/types into build/ and
        // pin it with file: (Dockerfile copies full db/ artifact, then yarn install --production).
        const deps = productionPackageJson.dependencies || {};
        const typesPkgRoot = path.join(__dirname, "..", "types");
        const typesDistSrc = path.join(typesPkgRoot, "dist");
        if (deps["@stacks/types"] && String(deps["@stacks/types"]).startsWith("workspace:")) {
            if (!fs.existsSync(typesDistSrc)) {
                throw new Error(
                    `Cannot vendor @stacks/types: ${typesDistSrc} not found. Run yarn build:types before db build.`,
                );
            }
            const vendorRoot = path.join(distDir, "vendor", "stacks-types");
            fs.rmSync(vendorRoot, { recursive: true, force: true });
            fs.mkdirSync(vendorRoot, { recursive: true });
            fs.cpSync(typesDistSrc, path.join(vendorRoot, "dist"), { recursive: true });
            const typesPkg = JSON.parse(fs.readFileSync(path.join(typesPkgRoot, "package.json"), "utf8"));
            const vendorPkg = {
                name: typesPkg.name,
                version: typesPkg.version,
                description: typesPkg.description,
                type: typesPkg.type,
                main: typesPkg.main,
                module: typesPkg.module,
                license: typesPkg.license,
            };
            fs.writeFileSync(
                path.join(vendorRoot, "package.json"),
                JSON.stringify(vendorPkg, null, 2) + "\n",
                "utf8",
            );
            productionPackageJson.dependencies["@stacks/types"] = "file:./vendor/stacks-types";
            console.log(`📁 Vendored @stacks/types → ${vendorRoot} (file: dependency for release)`);
        }

        // Clean up undefined properties
        Object.keys(productionPackageJson).forEach(key => {
            if (productionPackageJson[key] === undefined) {
                delete productionPackageJson[key];
            }
        });

        // Write the production package.json to dist folder
        const distPackageJsonPath = path.join(distDir, "package.json");
        fs.writeFileSync(distPackageJsonPath, JSON.stringify(productionPackageJson, null, 2), "utf8");

        console.log("✅ Production package.json created successfully!");
        console.log(`📁 Saved to: ${distPackageJsonPath}`);
        console.log(
            `🗑️  Removed devDependencies (${Object.keys(packageJson.devDependencies || {}).length} packages)`
        );

        // Copy static folder recursively
        ["migrations", "seeders", "config"].forEach(folder => {
            const staticSourceDir = path.join(__dirname, folder);
            const staticDistDir = path.join(distDir, folder);

            // Copy the entire static folder recursively
            if (fs.existsSync(staticSourceDir)) {
                fs.cpSync(staticSourceDir, staticDistDir, { recursive: true });
                console.log(
                    `📁 Copied static folder recursively from ${staticSourceDir} to ${staticDistDir}`
                );
            } else {
                console.log(`⚠️  Static source directory not found: ${staticSourceDir}`);
            }
        });

        // Copy config folder
        const sequelizeSourceFile = path.join(__dirname, ".sequelizerc");
        const sequelizeDistFile = path.join(distDir, ".sequelizerc");

        if (fs.existsSync(sequelizeSourceFile)) {
            fs.cpSync(sequelizeSourceFile, sequelizeDistFile);
            console.log(`📁 Copied sequelize from ${sequelizeSourceFile} to ${sequelizeDistFile}`);
        } else {
            console.log(`⚠️  Sequelize source not found: ${sequelizeSourceFile}`);
        }

        console.log("✅ Copied required files successfully!");
    } catch (error) {
        console.error("❌ Post-build failed:", error);
        process.exit(1);
    }
}

// Run post-build if this file is executed directly
if (require.main === module) {
    postBuild();
}

module.exports = { postBuild };
