// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
const fs = require("fs");
const path = require("path");
const esbuild = require("esbuild");

/**
 * Post-build script that creates a production-ready package.json
 * by removing devDependencies and saving it to the dist folder
 */
async function postBuild() {
    try {
        console.log("📦 Starting post-build process...");
        const distDir = path.join(__dirname, "dist");

        // Create dist directory if it doesn't exist
        if (!fs.existsSync(distDir)) {
            fs.mkdirSync(distDir, { recursive: true });
        }

        // Transpile and copy template files
        const templateSourceDir = path.join(__dirname, "emails");
        const templateDistDir = path.join(distDir, "emails");

        if (fs.existsSync(templateSourceDir)) {
            // Create template directory if it doesn't exist
            if (!fs.existsSync(templateDistDir)) {
                fs.mkdirSync(templateDistDir, { recursive: true });
            }

            // Get all .tsx template files
            const templateFiles = fs.readdirSync(templateSourceDir)
                .filter(file => file.endsWith('.tsx'));

            // Transpile each .tsx file to .js
            for (const file of templateFiles) {
                const sourcePath = path.join(templateSourceDir, file);
                const outputFileName = file.replace('.tsx', '.js');
                const destPath = path.join(templateDistDir, outputFileName);

                try {
                    await esbuild.build({
                        entryPoints: [sourcePath],
                        bundle: true,
                        platform: "node",
                        target: "node18",
                        format: "cjs",
                        outfile: destPath,
                        external: ["react", "@react-email/components", "@react-email/render"],
                        jsx: "transform",
                        jsxFactory: "React.createElement",
                        jsxFragment: "React.Fragment",
                        sourcemap: false,
                        minify: false,
                        keepNames: true,
                        logLevel: "silent"
                    });
                    console.log(`📄 Transpiled template file: ${file} -> ${outputFileName}`);
                } catch (error) {
                    console.error(`❌ Failed to transpile ${file}:`, error);
                    throw error;
                }
            }
        }

        // Copy templates.json from src root to templates directory
        const templatesJsonSource = path.join(__dirname, "emails.json");
        const templatesJsonDest = path.join(distDir, "emails.json");

        if (fs.existsSync(templatesJsonSource)) {
            // Ensure template directory exists
            if (!fs.existsSync(templateDistDir)) {
                fs.mkdirSync(templateDistDir, { recursive: true });
            }
            fs.copyFileSync(templatesJsonSource, templatesJsonDest);
            console.log(`📄 Copied templates.json from src root`);
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

        productionPackageJson.scripts = {
            start: "node email-service.js",
        };

        // Clean up undefined properties
        Object.keys(productionPackageJson).forEach(key => {
            if (productionPackageJson[key] === undefined) {
                delete productionPackageJson[key];
            }
        });

        // Write the production package.json to dist folder
        const distPackageJsonPath = path.join(distDir, "package.json");
        fs.writeFileSync(distPackageJsonPath, JSON.stringify(productionPackageJson, null, 2) + "\n", "utf8");

        console.log("✅ Post-build completed successfully!");
        console.log(`📄 Production package.json created: ${distPackageJsonPath}`);
        console.log(`🗂️  Template files copied to: ${templateDistDir}`);
        console.log("📦 Email service is ready for production!");
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
