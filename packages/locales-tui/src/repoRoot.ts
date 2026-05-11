// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

/**
 * Resolve monorepo root: `STACKS_ROOT` if set, else walk up from `fromDir` for a `package.json` with `workspaces`.
 */
function findRepoRoot(fromDir: string): string {
    const env = process.env.STACKS_ROOT?.trim();
    if (env && existsSync(env)) return env;

    let dir = fromDir;
    for (let i = 0; i < 32; i++) {
        const pkg = join(dir, "package.json");
        if (existsSync(pkg)) {
            try {
                const raw = JSON.parse(readFileSync(pkg, "utf8")) as { workspaces?: unknown };
                if (raw.workspaces != null) return dir;
            } catch {
                /* continue */
            }
        }
        const parent = dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }

    throw new Error(
        `Could not find monorepo root (package.json with workspaces). Set STACKS_ROOT or run from the stacks repo.`,
    );
}

export function repoRootFromModuleUrl(importMetaUrl: string): string {
    const here = dirname(fileURLToPath(importMetaUrl));
    return findRepoRoot(here);
}
