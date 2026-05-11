#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GITHUB_TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;

const RELEASES_DIR = path.resolve(__dirname, "../releases");

// Configuration for the 3 repositories
// TODO: Please update the repoOwner and repoName for each target as needed
const targets = [
    {
        folder: "server",
        repoOwner: "stacks-task-manager",
        repoName: "stacks-teams-server",
    },
    {
        folder: "db",
        repoOwner: "stacks-task-manager",
        repoName: "stacks-teams-db",
    },
    {
        folder: "email-service",
        repoOwner: "stacks-task-manager",
        repoName: "stacks-teams-email",
    },
];

if (!GITHUB_TOKEN) {
    console.error("❌ Error: GITHUB_TOKEN environment variable is required.");
    console.error("   Please set it before running this script: export GITHUB_TOKEN=your_token");
    process.exit(1);
}

async function main() {
    console.log("🚀 Starting multi-repo release process...");

    for (const target of targets) {
        await processTarget(target);
    }

    console.log("\n✨ All release processes completed!");
}

async function processTarget(target) {
    console.log(`\n---------------------------------------------------`);
    console.log(`📌 Processing ${target.folder} (${target.repoName})...`);

    const targetDir = path.join(RELEASES_DIR, target.folder);

    if (!fs.existsSync(targetDir)) {
        console.error(`❌ Error: Directory not found: ${targetDir}`);
        return;
    }

    // Read package.json to get version
    const packageJsonPath = path.join(targetDir, "package.json");
    if (!fs.existsSync(packageJsonPath)) {
        console.error(`❌ Error: package.json not found in ${targetDir}`);
        return;
    }

    let packageJson;
    try {
        packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    } catch (e) {
        console.error(`❌ Error reading package.json in ${targetDir}: ${e.message}`);
        return;
    }

    const version = packageJson.version;
    const tagName = `v${version}`;
    const releaseName = `v${version}`;
    const zipName = `${target.folder}-v${version}.zip`;
    // Create zip in the scripts directory temporarily
    const zipPath = path.resolve(__dirname, zipName);

    console.log(`ℹ️  Version: ${version}`);
    console.log(`ℹ️  Tag: ${tagName}`);

    try {
        // Zip the folder
        console.log(`📦 Zipping ${targetDir} to ${zipPath}...`);
        if (fs.existsSync(zipPath)) {
            fs.unlinkSync(zipPath);
        }

        // We zip the directory itself so the extraction creates a folder
        const parentDir = path.dirname(targetDir);
        const dirName = path.basename(targetDir);

        // Using system zip command
        // cd to parent dir and zip the target dir
        execSync(`cd "${parentDir}" && zip -r "${zipPath}" "${dirName}"`, { stdio: "inherit" });

        // Create Release
        console.log(`🚀 Creating GitHub Release ${tagName} in ${target.repoOwner}/${target.repoName}...`);
        const release = await createRelease(tagName, releaseName, target.repoOwner, target.repoName);
        console.log(`✅ Release created: ${release.html_url}`);

        // Upload Asset
        console.log(`📤 Uploading asset ${zipName}...`);
        await uploadAsset(release.upload_url, zipPath, zipName);
        console.log(`✅ Asset uploaded successfully!`);
    } catch (error) {
        console.error(`❌ Error processing ${target.folder}:`, error.message);
    } finally {
        // Cleanup zip
        if (fs.existsSync(zipPath)) {
            fs.unlinkSync(zipPath);
            console.log(`🧹 Cleaned up temporary zip file.`);
        }
    }
}

async function createRelease(tag, name, owner, repo) {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            "Content-Type": "application/json",
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "node-js-release-script",
        },
        body: JSON.stringify({
            tag_name: tag,
            target_commitish: "main",
            name: name,
            body: `Release ${name}`,
            draft: false,
            prerelease: false,
            generate_release_notes: true,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        // Check if release already exists
        if (response.status === 422 && errorText.includes("already_exists")) {
            console.log("   Release already exists, fetching it...");
            return await getReleaseByTag(tag, owner, repo);
        }
        throw new Error(`Failed to create release: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
}

async function getReleaseByTag(tag, owner, repo) {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/tags/${tag}`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "node-js-release-script",
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to get release: ${response.status} ${response.statusText}`);
    }

    return await response.json();
}

async function uploadAsset(uploadUrl, filePath, fileName) {
    const cleanUploadUrl = uploadUrl.split("{")[0] + `?name=${fileName}`;
    const fileStats = fs.statSync(filePath);
    const fileStream = fs.readFileSync(filePath);

    const response = await fetch(cleanUploadUrl, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            "Content-Type": "application/zip",
            "Content-Length": fileStats.size,
            "User-Agent": "node-js-release-script",
        },
        body: fileStream,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to upload asset: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
}

main();
