// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import type { ExportEntityType } from "@stacks/types";
import { translate } from "@stacks/translations";
import { sanitizeNotepadHtml } from "./sanitizeHtml";

type JsonRecord = Record<string, unknown>;

/** A localized label and display-ready value in an exported report. */
export interface ReportFact {
    label: string;
    value: string;
}

/** A titled report section containing one supported presentation shape. */
export interface ReportSection {
    title: string;
    facts?: ReportFact[];
    text?: string;
    items?: string[];
    rows?: ReportFact[][];
}

/** A normalized entity record consumed by the shared report partial. */
export interface ReportRecord {
    title: string;
    subtitle?: string;
    badges: string[];
    facts: ReportFact[];
    sections: ReportSection[];
}

/** Complete, locale-aware view model passed to a PDF Handlebars template. */
export interface PdfReportViewModel {
    type: ExportEntityType;
    locale: string;
    direction: "ltr" | "rtl";
    documentTitle: string;
    reportLabel: string;
    entityLabel: string;
    generatedLabel: string;
    generatedAt: string;
    emptyValue: string;
    records: ReportRecord[];
    richHtml?: string;
}

const RTL_LANGUAGES = new Set(["ar", "fa", "he", "ur"]);
const record = (value: unknown): JsonRecord =>
    value != null && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
const records = (value: unknown): JsonRecord[] =>
    Array.isArray(value) ? value.map(record) : value == null ? [] : [record(value)];
const raw = (o: JsonRecord, ...keys: string[]): unknown => {
    for (const key of keys) if (o[key] !== undefined && o[key] !== null && o[key] !== "") return o[key];
    return undefined;
};
const text = (value: unknown, empty = "—"): string => {
    if (value === 0 || value === false) return String(value);
    if (value == null || value === "") return empty;
    if (Array.isArray(value)) return value.length ? value.map(item => text(item, empty)).join(", ") : empty;
    if (typeof value === "object") return text(raw(record(value), "title", "name", "label", "id"), empty);
    return String(value);
};
const fact = (label: string, value: unknown, empty: string): ReportFact => ({
    label: translate(label),
    value: text(value, empty),
});
const list = (value: unknown): string[] =>
    Array.isArray(value)
        ? value.map(item => text(item)).filter(item => item !== "—")
        : value
        ? [text(value)]
        : [];
const date = (value: unknown, locale: string, empty: string): string => {
    if (value == null || value === "") return empty;
    const source = String(value);
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(source);
    const parsed = value instanceof Date ? value : new Date(dateOnly ? `${source}T00:00:00` : source);
    return Number.isNaN(parsed.getTime())
        ? String(value)
        : new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(parsed);
};
const money = (value: unknown, currency: unknown, locale: string, empty: string): string => {
    const parsed = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(parsed)) return empty;
    const currencyCode = text(currency, "").toUpperCase();
    if (!/^[A-Z]{3}$/.test(currencyCode)) return new Intl.NumberFormat(locale).format(parsed);
    try {
        return new Intl.NumberFormat(locale, { style: "currency", currency: currencyCode }).format(parsed);
    } catch {
        return `${new Intl.NumberFormat(locale).format(parsed)} ${currencyCode}`;
    }
};
const number = (value: unknown, locale: string, empty: string, suffix = ""): string => {
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? `${new Intl.NumberFormat(locale).format(parsed)}${suffix}` : empty;
};
const displayName = (value: unknown, empty: string): string => {
    const o = record(value);
    const full = [raw(o, "firstName"), raw(o, "lastName")].filter(Boolean).join(" ").trim();
    return full || text(raw(o, "title", "name", "nickname", "email", "id"), empty);
};
const lookup = (values: unknown): Map<string, JsonRecord> =>
    new Map(
        records(values)
            .filter(item => raw(item, "id") != null)
            .map(item => [String(raw(item, "id")), item])
    );
const resolvedList = (value: unknown, candidates: Map<string, JsonRecord>, empty: string): string[] =>
    list(value).map(item => (candidates.has(item) ? displayName(candidates.get(item), empty) : item));
const links = (value: unknown): string[] =>
    Array.isArray(value)
        ? value
              .map(item => {
                  const link = record(item);
                  const title = text(raw(link, "title", "name"), "");
                  const url = text(raw(link, "url"), "");
                  return [title, url].filter(Boolean).join(" — ");
              })
              .filter(Boolean)
        : list(value);
const address = (o: JsonRecord, prefix: string, empty: string): string => {
    const key = (part: string) =>
        prefix ? `${prefix}${part}` : part.charAt(0).toLowerCase() + part.slice(1);
    const parts = [
        raw(o, key("Address")),
        raw(o, key("Address2")),
        raw(o, key("City")),
        raw(o, key("County")),
        raw(o, key("Zip")),
        raw(o, key("Country")),
    ];
    const joined = parts
        .filter(v => v != null && v !== "")
        .map(String)
        .join(", ");
    return joined || empty;
};

function taskRecords(data: unknown, locale: string, empty: string): ReportRecord[] {
    const wrapper = record(data);
    const source = wrapper.task
        ? [record(wrapper.task), ...records(raw(wrapper, "subtasks"))]
        : records(data);
    const people = lookup(raw(wrapper, "people"));
    const tags = lookup(raw(wrapper, "tags"));
    return source.map(task => ({
        title: text(raw(task, "title", "name"), translate("Task")),
        subtitle: text(raw(record(raw(wrapper, "project")), "title", "name"), ""),
        badges: [
            text(raw(task, "status"), ""),
            text(raw(task, "priority"), ""),
            raw(task, "done") === true ? translate("Completed") : "",
        ].filter(Boolean),
        facts: [
            fact("Progress", number(raw(task, "progress"), locale, empty, "%"), empty),
            fact("Start date", date(raw(task, "startdate", "startDate"), locale, empty), empty),
            fact("Due date", date(raw(task, "duedate", "dueDate"), locale, empty), empty),
            fact("Estimate", number(raw(task, "estimate"), locale, empty), empty),
            fact("Time spent", number(raw(task, "timeSpent"), locale, empty), empty),
            fact("Assignees", resolvedList(raw(task, "assignees"), people, empty), empty),
        ],
        sections: [
            { title: translate("Description"), text: text(raw(task, "description"), empty) },
            { title: translate("Tags"), items: resolvedList(raw(task, "tags"), tags, empty) },
            { title: translate("Links"), items: links(raw(task, "links")) },
            {
                title: translate("Record details"),
                facts: [
                    fact("ID", raw(task, "id"), empty),
                    fact("Created", date(raw(task, "created"), locale, empty), empty),
                    fact("Updated", date(raw(task, "updated"), locale, empty), empty),
                    fact("Comments", raw(task, "comments"), empty),
                    fact("Attachments", raw(task, "attachments"), empty),
                ],
            },
        ],
    }));
}

function projectRecords(data: unknown, locale: string, empty: string): ReportRecord[] {
    const wrapper = record(data);
    const source = wrapper.project ? [record(wrapper.project)] : records(data);
    const people = lookup(raw(wrapper, "people"));
    const companies = lookup(raw(wrapper, "companies"));
    return source.map(project => ({
        title: text(raw(project, "title", "name"), translate("Project")),
        badges: [text(raw(project, "health"), "")].filter(Boolean),
        facts: [
            fact("Health", raw(project, "health"), empty),
            fact("Start date", date(raw(project, "startDate", "startdate"), locale, empty), empty),
            fact("Due date", date(raw(project, "endDate", "duedate"), locale, empty), empty),
            fact("Owner", resolvedList(raw(project, "projectOwner", "owner"), people, empty), empty),
            fact("Company", resolvedList(raw(project, "company"), companies, empty), empty),
            fact("Budget", money(raw(project, "estimate"), raw(project, "currency"), locale, empty), empty),
            fact(
                "Hourly rate",
                money(raw(project, "hourlyRate"), raw(project, "currency"), locale, empty),
                empty
            ),
        ],
        sections: [
            { title: translate("Description"), text: text(raw(project, "description"), empty) },
            { title: translate("Notes"), text: text(raw(project, "notes"), empty) },
            { title: translate("Approvers"), items: resolvedList(raw(project, "approvers"), people, empty) },
            {
                title: translate("Custom fields"),
                facts: (() => {
                    const fields = raw(project, "fields");
                    return Array.isArray(fields)
                        ? fields.map((value, index) => {
                              const field = record(value);
                              return {
                                  label: text(raw(field, "title", "name", "label", "id"), String(index + 1)),
                                  value: text(raw(field, "value", "text", "content"), empty),
                              };
                          })
                        : [];
                })(),
            },
        ],
    }));
}

function personRecords(data: unknown, locale: string, empty: string): ReportRecord[] {
    const wrapper = record(data);
    const source = wrapper.person ? [record(wrapper.person)] : records(data);
    const companies = lookup(raw(wrapper, "companies"));
    const roles = lookup(raw(wrapper, "roles"));
    const tags = lookup(raw(wrapper, "tags"));
    return source.map(person => ({
        title: displayName(person, translate("Person")),
        subtitle: text(raw(person, "jobTitle"), ""),
        badges: [text(raw(person, "onlineStatus", "status"), "")].filter(Boolean),
        facts: [
            fact("Email", raw(person, "email"), empty),
            fact("Mobile", raw(person, "cellPhone"), empty),
            fact("Phone", raw(person, "officePhone", "homePhone"), empty),
            fact("Website", raw(person, "website"), empty),
            fact("Company", resolvedList(raw(person, "company"), companies, empty), empty),
            fact("Role", resolvedList(raw(person, "role"), roles, empty), empty),
        ],
        sections: [
            {
                title: translate("Address"),
                text:
                    [
                        raw(person, "address"),
                        raw(person, "address2"),
                        raw(person, "city"),
                        raw(person, "county"),
                        raw(person, "zip"),
                        raw(person, "country"),
                    ]
                        .filter(Boolean)
                        .join(", ") || empty,
            },
            {
                title: translate("Social links"),
                items: ["socialLinkedin", "socialTwitter", "socialFacebook", "socialInstagram", "socialOther"]
                    .map(key => text(raw(person, key), ""))
                    .filter(Boolean),
            },
            { title: translate("Tags"), items: resolvedList(raw(person, "tags"), tags, empty) },
            { title: translate("Notes"), text: text(raw(person, "notes"), empty) },
            {
                title: translate("Record details"),
                facts: [
                    fact("ID", raw(person, "id"), empty),
                    fact("Updated", date(raw(person, "updated", "lastOnline"), locale, empty), empty),
                ],
            },
        ],
    }));
}

function companyRecords(data: unknown, locale: string, empty: string): ReportRecord[] {
    return records(data).map(company => ({
        title: text(raw(company, "title", "name"), translate("Company")),
        subtitle: text(raw(company, "industry"), ""),
        badges: [],
        facts: [
            fact("Email", raw(company, "email"), empty),
            fact("Phone", raw(company, "phone", "cell"), empty),
            fact("Website", raw(company, "website"), empty),
            fact("VAT", raw(company, "vat"), empty),
        ],
        sections: [
            { title: translate("Address"), text: address(company, "", empty) },
            { title: translate("Registered address"), text: address(company, "registeredOffice", empty) },
            { title: translate("Billing address"), text: address(company, "billing", empty) },
            { title: translate("Shipping address"), text: address(company, "shipping", empty) },
            {
                title: translate("Payment details"),
                facts: [
                    fact("Payment", raw(company, "payment"), empty),
                    fact("VAT", raw(company, "vat"), empty),
                ],
            },
            { title: translate("Notes"), text: text(raw(company, "notes"), empty) },
            {
                title: translate("Record details"),
                facts: [
                    fact("ID", raw(company, "id"), empty),
                    fact("Created", date(raw(company, "created"), locale, empty), empty),
                    fact("Updated", date(raw(company, "updated"), locale, empty), empty),
                ],
            },
        ],
    }));
}

function bookmarkRecords(data: unknown, _locale: string, empty: string): ReportRecord[] {
    const grouped = new Map<string, JsonRecord[]>();
    for (const bookmark of records(data)) {
        const type = text(raw(bookmark, "type"), translate("Bookmarks"));
        const group = grouped.get(type);
        if (group) group.push(bookmark);
        else grouped.set(type, [bookmark]);
    }
    return [...grouped.entries()].map(([type, bookmarks]) => ({
        title: type,
        badges: [],
        facts: [],
        sections: [
            {
                title: translate("Bookmarks"),
                rows: bookmarks.map(bookmark => [
                    fact("Title", raw(bookmark, "title"), empty),
                    fact("URL", raw(bookmark, "url"), empty),
                    fact(
                        "Pinned",
                        raw(bookmark, "pinned") === true ? translate("Yes") : translate("No"),
                        empty
                    ),
                ]),
            },
        ],
    }));
}

const ENTITY_LABELS: Record<ExportEntityType, string> = {
    task: "Task",
    project: "Project",
    person: "Person",
    company: "Company",
    bookmark: "Bookmarks",
    notepad: "Notepad",
};

const PDF_PRESENTERS: Record<
    Exclude<ExportEntityType, "notepad">,
    (data: unknown, locale: string, empty: string) => ReportRecord[]
> = {
    task: taskRecords,
    project: projectRecords,
    person: personRecords,
    company: companyRecords,
    bookmark: bookmarkRecords,
};

/** Normalizes client-owned entity data into the stable, localized PDF report model. */
export function presentPdfExport(
    type: ExportEntityType,
    data: unknown,
    options: { locale: string; title?: string; generatedAt?: Date }
): PdfReportViewModel {
    const locale = options.locale || "en";
    const empty = "—";
    const generatedAt = options.generatedAt ?? new Date();
    const notepadSource = record(data);
    const richHtml =
        type === "notepad"
            ? sanitizeNotepadHtml(typeof data === "string" ? data : raw(notepadSource, "html", "content"))
            : undefined;
    return {
        type,
        locale,
        direction: RTL_LANGUAGES.has(locale.toLowerCase().split(/[-_]/)[0]!) ? "rtl" : "ltr",
        documentTitle:
            options.title?.trim() ||
            (type === "notepad"
                ? text(raw(notepadSource, "title"), translate("Notepad"))
                : translate(ENTITY_LABELS[type])),
        reportLabel: translate("Export report"),
        entityLabel: translate(ENTITY_LABELS[type]),
        generatedLabel: translate("Generated"),
        generatedAt: new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
            generatedAt
        ),
        emptyValue: empty,
        records: type === "notepad" ? [] : PDF_PRESENTERS[type](data, locale, empty),
        richHtml,
    };
}
