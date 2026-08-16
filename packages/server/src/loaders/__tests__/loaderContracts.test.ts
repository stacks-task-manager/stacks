// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const loadersDir = fileURLToPath(new URL("..", import.meta.url));
const indexPath = fileURLToPath(new URL("../index.ts", import.meta.url));

const expectedMethodsByFile = {
    "activities.ts": ["create", "getAllByResources"],
    "bookmarks.ts": ["create", "remove", "getAll"],
    "calendar.ts": ["getAll", "getOne", "getVisibleLocalCalendarIds", "create", "update", "remove", "getPrimary"],
    "companies.ts": ["getAll", "getOne", "create", "update"],
    "documents.ts": ["create", "getOne", "getAll", "remove", "update"],
    "emails.ts": ["queueEmail"],
    "events.ts": ["getOne", "getAll", "countAll", "create", "update", "move", "remove"],
    "files.ts": [
        "uploadFile",
        "uploadFileStream",
        "getStreamUploadProgress",
        "checkExistingFileAndCreateAttachment",
        "getAttachments",
        "getAttachment",
        "download",
        "getPreviewByAttachmentId",
        "deleteByAttachment",
        "deleteByRecord",
    ],
    "notepads.ts": ["create", "getOne", "getAll", "update", "remove"],
    "notifications.ts": ["add", "getAll", "read", "remove"],
    "people.ts": ["getAll", "getAllWithCount", "getOne", "update", "create"],
    "permissions.ts": ["create", "update", "remove"],
    "preferences.ts": ["get", "update"],
    "projects.ts": [
        "create",
        "getOne",
        "getAll",
        "update",
        "remove",
        "archiveCompletedTasks",
        "addStackOrder",
        "removeStackOrder",
    ],
    "reminders.ts": ["create", "getAll", "remove"],
    "reports.ts": [],
    "roles.ts": ["create", "update", "getAll", "bulkCreate", "getOne", "getById"],
    "search.ts": ["query"],
    "stacks.ts": [
        "create",
        "getAll",
        "getOne",
        "update",
        "remove",
        "removeAll",
        "move",
        "addTaskOrder",
        "removeTaskOrder",
    ],
    "tags.ts": ["getAll", "create", "update"],
    "tasks.ts": [
        "create",
        "getAll",
        "countAll",
        "getOne",
        "removeById",
        "removeByProject",
        "removeByStack",
        "update",
        "archive",
        "unarchive",
        "move",
    ],
    "tenants.ts": ["getOne"],
    "timelogs.ts": [
        "getAll",
        "getOne",
        "create",
        "update",
        "remove",
        "removeByTask",
        "removeByTasks",
        "removeByProject",
        "review",
        "updateStatus",
        "updateTotals",
    ],
} as const;

const expectedBarrelExports = [
    "context",
    "activities",
    "bookmarks",
    "calendar",
    "companies",
    "documents",
    "emails",
    "events",
    "files",
    "notepads",
    "notifications",
    "people",
    "permissions",
    "preferences",
    "projects",
    "reminders",
    "reports",
    "roles",
    "search",
    "stacks",
    "tags",
    "tasks",
    "tenants",
    "timelogs",
].sort();

function parseLoaderMethods(source: string) {
    // Find the export block and track brace depth to correctly handle
    // inline function definitions inside the export object.
    const idx = source.indexOf("export const ");
    if (idx === -1) throw new Error("No export const found");
    const rest = source.slice(idx);
    const nameMatch = rest.match(/(\w+Loader)\s*=\s*\{/);
    if (!nameMatch) throw new Error("No loader export found");

    const exportName = nameMatch[1];
    const startIdx = idx + nameMatch[0].length;

    // Track brace depth to find the matching closing brace
    let depth = 1,
        i = startIdx;
    let inStr = false,
        strCh = "",
        inLC = false,
        inBC = false;
    while (i < source.length && depth > 0) {
        const c = source[i],
            n = source[i + 1] || "";
        if (inLC) {
            if (c === "\n") inLC = false;
        } else if (inBC) {
            if (c === "*" && n === "/") inBC = false;
        } else if (inStr) {
            if (c === strCh) inStr = false;
        } else {
            if (c === "/" && n === "*") {
                inBC = true;
                i += 2;
                continue;
            }
            if (c === "/" && n === "/") {
                inLC = true;
                i += 2;
                continue;
            }
            if (c === '"' || c === "'" || c === "`") {
                inStr = true;
                strCh = c;
            }
            if (c === "{") depth++;
            if (c === "}") depth--;
        }
        i++;
    }
    const body = source.slice(startIdx, i - 1);

    // Extract top-level members: shorthand (`word,`) or function decl (`async word(`).
    const methods = Array.from(
        body
            .split("\n")
            .map(line => line.match(/^    (?:async\s+)?([A-Za-z_]\w*)(?:\s*,|\s*\()/))
            .filter(m => m)
            .map(m => m![1])
    );

    return { exportName, methods };
}

describe("loader source contracts", () => {
    it("keeps the domain loader file list in sync", () => {
        const loaderFiles = readdirSync(loadersDir)
            .filter(
                file =>
                    file.endsWith(".ts") &&
                    !["context.ts", "index.ts", "sqlLiteral.ts", "utils.ts"].includes(file)
            )
            .sort();

        expect(loaderFiles).toEqual(Object.keys(expectedMethodsByFile).sort());
    });

    it("re-exports every supported loader module from the barrel", () => {
        const indexSource = readFileSync(indexPath, "utf8");
        const exports = Array.from(indexSource.matchAll(/export \* from "\.\/([^"]+)";/g))
            .map(match => match[1])
            .sort();

        expect(exports).toEqual(expectedBarrelExports);
    });

    it("reports.ts re-exports ReportsLoader from the reports module", () => {
        const source = readFileSync(`${loadersDir}/reports.ts`, "utf8");
        expect(source).toContain('export { ReportsLoader } from "../reports";');
    });

    for (const [file, expectedMethods] of Object.entries(expectedMethodsByFile).filter(
        ([file]) => file !== "reports.ts"
    )) {
        it(`${file} exports the expected public loader methods`, () => {
            const source = readFileSync(`${loadersDir}/${file}`, "utf8");
            const { exportName, methods } = parseLoaderMethods(source);

            expect(exportName.endsWith("Loader")).toBe(true);
            expect(methods).toEqual(expectedMethods);
        });
    }
});
