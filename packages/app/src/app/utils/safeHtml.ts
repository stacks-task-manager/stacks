// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import DOMPurify from "dompurify";

/** One parser-backed allowlist shared by every rich-HTML sink in the app. */
const ALLOWED_TAGS = [
    "p",
    "br",
    "hr",
    "span",
    "div",
    "a",
    "strong",
    "b",
    "i",
    "em",
    "u",
    "s",
    "del",
    "ins",
    "mark",
    "code",
    "pre",
    "blockquote",
    "ul",
    "ol",
    "li",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "sup",
    "sub",
    "small",
    "img",
];
const ALLOWED_ATTR = [
    "href",
    "src",
    "alt",
    "title",
    "colspan",
    "rowspan",
    "start",
    "width",
    "height",
    "target",
    "rel",
];

/** https/http/mailto/tel and scheme-less or relative values; every other scheme is rejected. */
const ALLOWED_URI = /^(?:https?:|mailto:|tel:|[#./]|(?![a-z][a-z0-9+.-]*:)[\s\S]*$)/i;

/** data: is only usable as raster pixels - svg+xml can run script inside an <img>. */
const SAFE_DATA_URI = /^data:image\/(?:png|jpe?g|gif|webp)[;,]/i;

DOMPurify.addHook("afterSanitizeAttributes", currentNode => {
    const tagName = currentNode.tagName;

    if (tagName === "A") {
        const href = currentNode.getAttribute("href");
        if (href && /^https?:/i.test(href)) currentNode.setAttribute("rel", "noopener noreferrer");
        return;
    }

    if (tagName !== "IMG") return;

    const src = currentNode.getAttribute("src");
    if (src && /^data:/i.test(src) && !SAFE_DATA_URI.test(src)) currentNode.removeAttribute("src");
    const parent = currentNode.parentNode;
    if (!currentNode.getAttribute("src") && parent) parent.removeChild(currentNode);
});

const SANITIZE_CONFIG = {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: ALLOWED_URI,
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
};

/** Sanitize stored rich HTML (announcements, changelogs, markdown) before it reaches the DOM. */
export function sanitizeRichHtml(html: string) {
    return DOMPurify.sanitize(html, SANITIZE_CONFIG);
}
