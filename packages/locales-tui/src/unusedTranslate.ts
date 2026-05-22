// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { extname, join, relative } from "path";
import ts from "typescript";

export type DynamicTranslateSite = { file: string; line: number };

function shouldSkipDir(name: string): boolean {
    return name === "node_modules" || name === "dist" || name === "build" || name.startsWith(".");
}

function collectTsFiles(dir: string, out: string[]): void {
    if (!existsSync(dir)) return;
    if (!statSync(dir).isDirectory()) return;
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, ent.name);
        if (ent.isDirectory()) {
            if (shouldSkipDir(ent.name)) continue;
            collectTsFiles(p, out);
        } else if (ent.isFile()) {
            const ext = extname(ent.name).toLowerCase();
            if (ext === ".ts" || ext === ".tsx") out.push(p);
        }
    }
}

function extractStringLiteralsFromArg(expr: ts.Expression | undefined): string[] {
    if (!expr) return [];

    if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) {
        return [expr.text];
    }
    if (ts.isParenthesizedExpression(expr) || ts.isAsExpression(expr) || ts.isSatisfiesExpression(expr)) {
        return extractStringLiteralsFromArg(expr.expression);
    }
    if (ts.isConditionalExpression(expr)) {
        return [
            ...extractStringLiteralsFromArg(expr.whenTrue),
            ...extractStringLiteralsFromArg(expr.whenFalse),
        ];
    }
    return [];
}

function lineOf(sf: ts.SourceFile, pos: number): number {
    return sf.getLineAndCharacterOfPosition(pos).line + 1;
}

/**
 * Walks `.ts` / `.tsx` under `roots` and collects first-arg string literals to `translate(...)`.
 * Only calls where the callee is an identifier named `translate` are counted.
 */
export function collectTranslateStaticKeys(
    roots: string[],
): { staticKeys: Set<string>; dynamicSites: DynamicTranslateSite[] } {
    const staticKeys = new Set<string>();
    const dynamicSites: DynamicTranslateSite[] = [];

    const files: string[] = [];
    for (const root of roots) {
        collectTsFiles(root, files);
    }

    for (const filePath of files) {
        const text = readFileSync(filePath, "utf8");
        const kind = filePath.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
        const sf = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true, kind);

        const visit = (node: ts.Node): void => {
            if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "translate") {
                const arg0 = node.arguments[0];
                const keys = extractStringLiteralsFromArg(arg0);
                if (keys.length > 0) {
                    for (const k of keys) staticKeys.add(k);
                } else if (arg0 !== undefined) {
                    dynamicSites.push({ file: filePath, line: lineOf(sf, arg0.getStart(sf)) });
                }
            }
            ts.forEachChild(node, visit);
        };
        visit(sf);
    }

    return { staticKeys, dynamicSites };
}

export function findUnusedEnglishKeys(
    englishKeys: Iterable<string>,
    roots: string[],
    repoRoot: string,
): { unused: string[]; dynamicSites: DynamicTranslateSite[] } {
    const { staticKeys, dynamicSites } = collectTranslateStaticKeys(roots);
    const unused: string[] = [];
    for (const k of englishKeys) {
        if (!staticKeys.has(k)) unused.push(k);
    }
    unused.sort((a, b) => a.localeCompare(b));

    const relSites: DynamicTranslateSite[] = dynamicSites.map(d => ({
        file: relative(repoRoot, d.file),
        line: d.line,
    }));
    return { unused, dynamicSites: relSites };
}
