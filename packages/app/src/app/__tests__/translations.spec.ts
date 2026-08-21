// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import * as fs from "fs";
import * as path from "path";

/**
 * Guards against UI strings that call translate() with a key that is not
 * present in the app locale files. A missing key makes translate() return the
 * uppercased key (e.g. "Add a description" -> "ADD A DESCRIPTION"), so this test
 * fails fast whenever a new translate() call references an undefined key.
 *
 * en.json is the source of truth: a key present there falls back to English in
 * every other locale, so checking against en.json is sufficient.
 */
describe("app translations", () => {
    // This file lives at packages/app/src/app/__tests__/translations.spec.ts
    const appSrcDir = path.resolve(__dirname, "../.."); // packages/app/src
    const enPath = path.resolve(__dirname, "../../../../server/locales/app/en.json");

    const translateKeyRe = /translate\s*\(\s*["']([^"']+)["']/g;

    function collectSourceFiles(dir: string, out: string[] = []): string[] {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const p = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                // Skip node_modules/dist/.git and test directories (test fixtures are not UI strings).
                if (
                    entry.name === "node_modules" ||
                    entry.name === "dist" ||
                    entry.name === ".git" ||
                    entry.name === "__tests__"
                )
                    continue;
                collectSourceFiles(p, out);
            } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
                out.push(p);
            }
        }
        return out;
    }

    function collectTranslateKeys(src: string): string[] {
        const keys: string[] = [];
        let match: RegExpExecArray | null;
        while ((match = translateKeyRe.exec(src)) !== null) {
            keys.push(match[1]);
        }
        return keys;
    }

    it("every translate() key exists in en.json", () => {
        const en = JSON.parse(fs.readFileSync(enPath, "utf8")) as Record<string, unknown>;
        const sourceFiles = collectSourceFiles(appSrcDir);

        const missing = new Map<string, string[]>();
        for (const file of sourceFiles) {
            const src = fs.readFileSync(file, "utf8");
            for (const key of collectTranslateKeys(src)) {
                if (!(key in en)) {
                    if (!missing.has(key)) missing.set(key, []);
                    const rel = path.relative(appSrcDir, file);
                    if (!missing.get(key)!.includes(rel)) missing.get(key)!.push(rel);
                }
            }
        }

        const report = [...missing.entries()]
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([key, files]) => `  ${JSON.stringify(key)} used in ${files.join(", ")}`)
            .join("\n");

        expect(report).toBe("");
    });
});
