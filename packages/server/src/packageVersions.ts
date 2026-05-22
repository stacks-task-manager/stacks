// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import fs from "node:fs";
import path from "node:path";

function readPackageVersion(pkgJsonPath: string): string {
    try {
        const raw = fs.readFileSync(pkgJsonPath, "utf8");
        const parsed = JSON.parse(raw) as { version?: unknown };
        return typeof parsed.version === "string" ? parsed.version : "unknown";
    } catch {
        return "unknown";
    }
}

/** Directory containing this package's `package.json` (server package root). */
const serverPackageRoot = path.join(__dirname, "..");
/** Monorepo `packages` directory. */
const packagesRoot = path.join(serverPackageRoot, "..");

export const serverPackageVersion = readPackageVersion(path.join(serverPackageRoot, "package.json"));
export const appPackageVersion = readPackageVersion(path.join(packagesRoot, "app", "package.json"));
