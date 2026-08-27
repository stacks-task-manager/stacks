// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { beforeAll, describe, expect, test } from "vitest";
import { EXPORT_ENTITY_TYPES } from "@stacks/types";
import { setTranslations } from "@stacks/translations";
import { ExportBodySchema } from "../../routes/schema/export";
import {
    attachmentContentDisposition,
    attachmentFilename,
    sanitizeExportBasename,
} from "../../routes/export";
import { getMergedTranslationsForLocale, preloadLocales } from "../../i18n/locales";
import { presentPdfExport } from "./presenters";
import { renderExportHtml } from "./renderExportHtml";
import { normalizeExportRows } from "./normalizeExportRows";
import { sanitizeNotepadHtml } from "./sanitizeHtml";
import { PDF_TEMPLATE_REGISTRY } from "./templateRegistry";

beforeAll(() => {
    preloadLocales();
    setTranslations(getMergedTranslationsForLocale("en"), { locale: "en" });
});

describe("export contracts", () => {
    test("registry is exhaustive and uses fixed template names", () => {
        expect(Object.keys(PDF_TEMPLATE_REGISTRY).sort()).toEqual([...EXPORT_ENTITY_TYPES].sort());
        expect(Object.values(PDF_TEMPLATE_REGISTRY)).toEqual(
            expect.arrayContaining(EXPORT_ENTITY_TYPES.map(type => `${type}.html`))
        );
    });

    test.each(EXPORT_ENTITY_TYPES)("accepts %s PDF exports", type => {
        expect(ExportBodySchema.safeParse({ format: "pdf", type, data: {} }).success).toBe(true);
    });

    test("allows HTML only for notepad and requires a type for data exports", () => {
        expect(
            ExportBodySchema.safeParse({ format: "html", type: "notepad", data: "<p>ok</p>" }).success
        ).toBe(true);
        expect(ExportBodySchema.safeParse({ format: "html", type: "task", data: {} }).success).toBe(false);
        expect(ExportBodySchema.safeParse({ format: "json", data: {} }).success).toBe(false);
        expect(
            ExportBodySchema.safeParse({ format: "excel", type: "company", data: { count: 0 } }).success
        ).toBe(true);
    });
});

describe("export filenames", () => {
    test("sanitizes reserved characters and blank titles", () => {
        expect(sanitizeExportBasename('  quarterly/:*?"<>| report  ')).toBe("quarterly- report");
        expect(sanitizeExportBasename("   ")).toBe("export");
    });

    test("creates deterministic bounded attachment names", () => {
        const filename = attachmentFilename("x".repeat(400), "task", "pdf", new Date(2026, 7, 26, 9, 8, 7));
        expect(filename.length).toBeLessThanOrEqual(230);
        expect(filename).toMatch(/_2026-08-26_09-08-07\.pdf$/);
        expect(attachmentFilename(undefined, "company", "json", new Date(2026, 0, 2, 3, 4, 5))).toBe(
            "export-company_2026-01-02_03-04-05.json"
        );
    });

    test("encodes Unicode attachment names with a ByteString-safe fallback", () => {
        const header = attachmentContentDisposition("東京計画_2026-08-26.pdf");
        expect(header).toContain('filename="_2026-08-26.pdf"');
        expect(header).toContain("filename*=UTF-8''%E6%9D%B1%E4%BA%AC%E8%A8%88%E7%94%BB_2026-08-26.pdf");
        expect([...header].every(character => character.charCodeAt(0) <= 0x7f)).toBe(true);
    });
});

describe("export presenters", () => {
    test("preserves zero values and uses the requested locale", () => {
        const report = presentPdfExport(
            "task",
            { title: "Zero", progress: 0, estimate: 0, timeSpent: 0 },
            { locale: "de-DE", generatedAt: new Date("2026-08-25T12:00:00Z") }
        );
        expect(report.records[0]!.facts.map(item => item.value)).toContain("0%");
        expect(report.records[0]!.facts.map(item => item.value)).toContain("0");
        expect(report.locale).toBe("de-DE");
    });

    test("sets RTL direction for Arabic and keeps CJK titles", () => {
        const report = presentPdfExport("project", { title: "東京計画" }, { locale: "ar" });
        expect(report.direction).toBe("rtl");
        expect(report.records[0]!.title).toBe("東京計画");
    });

    test("normalizes one or many records without losing empty values", () => {
        const report = presentPdfExport("person", [{ firstName: "Ada", lastName: "Lovelace" }, {}], {
            locale: "en",
        });
        expect(report.records).toHaveLength(2);
        expect(report.records[0]!.title).toBe("Ada Lovelace");
        expect(report.records[1]!.facts.some(item => item.value === "—")).toBe(true);
    });

    test("does not synthesize a record for empty input", () => {
        expect(presentPdfExport("person", undefined, { locale: "en" }).records).toEqual([]);
        expect(presentPdfExport("company", null, { locale: "en" }).records).toEqual([]);
    });

    test("includes task subtasks as additional report records", () => {
        const report = presentPdfExport(
            "task",
            { task: { title: "Parent" }, subtasks: [{ title: "Child" }] },
            { locale: "en" }
        );
        expect(report.records.map(record => record.title)).toEqual(["Parent", "Child"]);
    });

    test("resolves display names and structured custom-field values from client payloads", () => {
        const task = presentPdfExport(
            "task",
            {
                task: { title: "Resolved", assignees: ["person-1"], tags: ["tag-1"] },
                people: [{ id: "person-1", firstName: "Grace", lastName: "Hopper" }],
                tags: [{ id: "tag-1", title: "Platform" }],
            },
            { locale: "en" }
        );
        expect(task.records[0]!.facts.some(item => item.value === "Grace Hopper")).toBe(true);
        expect(task.records[0]!.sections.find(section => section.title === "Tags")?.items).toEqual([
            "Platform",
        ]);

        const project = presentPdfExport(
            "project",
            { project: { title: "Fields", fields: [{ title: "Portfolio", value: "Transformation" }] } },
            { locale: "en" }
        );
        expect(
            project.records[0]!.sections.find(section => section.title === "Custom fields")?.facts
        ).toEqual([{ label: "Portfolio", value: "Transformation" }]);

        const person = presentPdfExport(
            "person",
            {
                person: { firstName: "Ada", company: "company-1", role: "role-1", tags: ["tag-1"] },
                companies: [{ id: "company-1", title: "Analytical Engines" }],
                roles: [{ id: "role-1", title: "Founder" }],
                tags: [{ id: "tag-1", title: "VIP" }],
            },
            { locale: "en" }
        );
        expect(person.records[0]!.facts.map(item => item.value)).toEqual(
            expect.arrayContaining(["Analytical Engines", "Founder"])
        );
        expect(person.records[0]!.sections.find(section => section.title === "Tags")?.items).toEqual(["VIP"]);
    });

    test("formats project money and date-only values without a UTC day shift", () => {
        const report = presentPdfExport(
            "project",
            { title: "Localized", startDate: "2026-01-02", estimate: 0, currency: "EUR" },
            { locale: "en-US" }
        );
        expect(report.records[0]!.facts.map(item => item.value)).toEqual(
            expect.arrayContaining(["Jan 2, 2026", "€0.00"])
        );
    });
});

describe("notepad sanitization", () => {
    test("removes active content, event handlers, and remote images", () => {
        const html = sanitizeNotepadHtml(
            '<h1 onclick="alert(1)">Safe</h1><script>alert(1)</script><a href="javascript:alert(2)">bad</a><img src="https://tracker.invalid/x.png"><img src="data:image/png;base64,AA==" alt="inline">'
        );
        expect(html).toContain("<h1>Safe</h1>");
        expect(html).not.toMatch(/script|onclick|javascript:|tracker\.invalid/);
        expect(html).toContain("data:image/png;base64,AA");
    });

    test.each([
        '<a href="JaVaScRiPt:alert(1)">unsafe</a>',
        '<a href="//tracker.invalid/path">unsafe</a>',
        '<img src="data:image/svg+xml;base64,PHN2Zz4=">',
    ])("rejects unsafe URL form %#", input => {
        const html = sanitizeNotepadHtml(input);
        expect(html).not.toMatch(/javascript:|tracker\.invalid|svg\+xml/i);
    });

    test("preserves editorial markup and safe table spans", () => {
        const html = sanitizeNotepadHtml(
            '<blockquote><strong>Quote</strong></blockquote><table><tr><td colspan="999">Cell</td></tr></table>'
        );
        expect(html).toContain("<blockquote><strong>Quote</strong></blockquote>");
        expect(html).toContain('colspan="20"');
    });
});

describe("template compilation", () => {
    test.each(EXPORT_ENTITY_TYPES)("compiles the %s template with inlined assets", type => {
        const data = type === "notepad" ? "<h2>Hello</h2>" : [{ title: `Representative ${type}`, id: "1" }];
        const { html } = renderExportHtml(type, data, {
            locale: "en",
            generatedAt: new Date("2026-08-25T12:00:00Z"),
        });
        expect(html).toMatch(/<!doctype html>/i);
        expect(html).toContain(`report-${type}`);
        expect(html).toContain("<style>");
        expect(html).toContain("<svg");
        expect(html).not.toContain("<script");
        expect(html).not.toContain('href="http');
    });
});

describe("Excel row normalization", () => {
    test("handles empty and scalar exports", () => {
        expect(normalizeExportRows([])).toEqual({ columns: [], rows: [] });
        expect(normalizeExportRows(0)).toEqual({ columns: ["value"], rows: [["0"]] });
        expect(normalizeExportRows(null)).toEqual({ columns: ["value"], rows: [[""]] });
    });

    test("normalizes object rows using stable first-row columns", () => {
        expect(normalizeExportRows([{ name: "Alpha", meta: { active: true } }, { name: "Beta" }])).toEqual({
            columns: ["name", "meta"],
            rows: [
                ["Alpha", '{"active":true}'],
                ["Beta", ""],
            ],
        });
    });
});
