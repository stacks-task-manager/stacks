// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { join } from "path";

export type TranslationSection = {
    /** Stable id for internal state */
    id: string;
    /** Shown in the section picker */
    label: string;
    /** Directory containing `en.json` and other `*.json`, relative to repo root */
    localesDir: string;
    /** Source roots scanned for `translate("…")` when reporting unused English keys */
    scanRoots: string[];
};

/**
 * Add new top-level areas here (and matching folders under `packages/server/locales/` if needed).
 */
export const TRANSLATION_SECTIONS: readonly TranslationSection[] = [
    {
        id: "server",
        label: "Server (API & middleware)",
        localesDir: "packages/server/locales/server",
        scanRoots: ["packages/server/src"],
    },
    {
        id: "app",
        label: "App (client UI)",
        localesDir: "packages/server/locales/app",
        scanRoots: ["packages/app/src"],
    },
];

export function sectionLocalesAbsPath(repoRoot: string, section: TranslationSection): string {
    return join(repoRoot, section.localesDir);
}

export function sectionScanAbsPaths(repoRoot: string, section: TranslationSection): string[] {
    return section.scanRoots.map(r => join(repoRoot, r));
}
