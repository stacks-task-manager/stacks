// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
const esbuild = require("esbuild");
const fs = require("fs");

// Read package.json to get all dependencies
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const allDependencies = [
    ...Object.keys(packageJson.dependencies || {}),
    ...Object.keys(packageJson.devDependencies || {}),
    ...Object.keys(packageJson.peerDependencies || {}),
];

// Dependencies to bundle (include in the final bundle)
const bundleDependencies = ["@stacks/types", "@stacks/db"];

// Dependencies to keep external (not bundled)
const externalDependencies = allDependencies.filter(dep => !bundleDependencies.includes(dep));

// Dynamically get Node.js built-in modules
const nodeBuiltins = require("module").builtinModules || Object.keys(process.binding("natives"));

// Add node: prefixed versions for newer Node.js versions
const allNodeBuiltins = [...nodeBuiltins, ...nodeBuiltins.map(mod => `node:${mod}`)];

// Function to load environment variables from .env file
// All environment variables should be read at runtime, not embedded at build time
function loadEnvVars() {
    // Return empty object to ensure all env vars are read at runtime
    // Only set NODE_ENV for build optimization purposes
    return {
        "process.env.NODE_ENV": JSON.stringify("production"),
    };
}

const buildConfig = {
    entryPoints: ["src/index.ts"],
    bundle: true,
    platform: "node",
    target: "node18",
    format: "cjs",
    outfile: "dist/email-service.js",
    external: [...externalDependencies, ...allNodeBuiltins],
    // define: loadEnvVars(),
    sourcemap: false,
    minify: true,
    keepNames: true,
    logLevel: "info",
    plugins: [],
};

// Build function
async function build() {
    try {
        console.log("🚀 Starting esbuild...");
        console.log(`📦 Bundling: ${bundleDependencies.join(", ")}`);
        console.log(`🔗 External: ${externalDependencies.length} dependencies`);

        await esbuild.build(buildConfig);

        console.log("✅ Build completed successfully!");
        console.log(`📁 Output: ${buildConfig.outfile}`);
    } catch (error) {
        console.error("❌ Build failed:", error);
        process.exit(1);
    }
}

// Run build if this file is executed directly
if (require.main === module) {
    build();
}

module.exports = { build, buildConfig };
