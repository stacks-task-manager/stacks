// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
    "a",
    "blockquote",
    "br",
    "code",
    "del",
    "div",
    "em",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "hr",
    "img",
    "li",
    "ol",
    "p",
    "pre",
    "s",
    "span",
    "strong",
    "sub",
    "sup",
    "table",
    "tbody",
    "td",
    "tfoot",
    "th",
    "thead",
    "tr",
    "u",
    "ul",
];

function safeLink(value: string): boolean {
    return /^(?:https?:|mailto:|tel:|#|\/(?!\/))/i.test(value.trim());
}

function safeImage(value: string): boolean {
    const src = value.trim();
    return (
        /^data:image\/(?:png|jpe?g|gif|webp);base64,[a-z0-9+/=\s]+$/i.test(src) ||
        /^(?:\/static\/|assets\/|export\/)/i.test(src)
    );
}

function boundedSpan(value: string | undefined): string {
    return String(Math.min(20, Math.max(1, Number.parseInt(value ?? "", 10) || 1)));
}

/** Sanitizes notepad rich text with a parser-backed, print-focused allowlist. */
export function sanitizeNotepadHtml(input: unknown): string {
    if (typeof input !== "string") return "";
    return sanitizeHtml(input, {
        allowedTags: ALLOWED_TAGS,
        allowedAttributes: {
            a: ["href", "title", "rel"],
            img: ["src", "alt", "title"],
            td: ["colspan", "rowspan"],
            th: ["colspan", "rowspan"],
        },
        disallowedTagsMode: "discard",
        allowedSchemes: ["http", "https", "mailto", "tel", "data"],
        allowedSchemesByTag: { img: ["data"] },
        transformTags: {
            a: (_tagName, attributes) => {
                if (!safeLink(attributes.href ?? "")) delete attributes.href;
                attributes.rel = "noopener noreferrer";
                return { tagName: "a", attribs: attributes };
            },
            img: (_tagName, attributes) => {
                if (!safeImage(attributes.src ?? "")) delete attributes.src;
                return { tagName: "img", attribs: attributes };
            },
            td: (_tagName, attributes) => ({
                tagName: "td",
                attribs: {
                    ...(attributes.colspan ? { colspan: boundedSpan(attributes.colspan) } : {}),
                    ...(attributes.rowspan ? { rowspan: boundedSpan(attributes.rowspan) } : {}),
                },
            }),
            th: (_tagName, attributes) => ({
                tagName: "th",
                attribs: {
                    ...(attributes.colspan ? { colspan: boundedSpan(attributes.colspan) } : {}),
                    ...(attributes.rowspan ? { rowspan: boundedSpan(attributes.rowspan) } : {}),
                },
            }),
        },
    });
}
