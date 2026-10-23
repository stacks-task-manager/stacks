// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { sanitizeRichHtml } from "app/utils/safeHtml";

/** Parse sanitized markup back into DOM nodes so assertions inspect structure, not strings. */
function render(html: string) {
    const container = document.createElement("div");
    container.innerHTML = html;
    return container;
}

function attributeNames(container: HTMLElement) {
    const names: string[] = [];
    container.querySelectorAll("*").forEach(element => {
        names.push(...element.getAttributeNames());
    });
    return names;
}

describe("sanitizeRichHtml", () => {
    it("keeps the formatting announcements and changelogs rely on", () => {
        const container = render(
            sanitizeRichHtml(
                "<p>Shipped <strong>this</strong> <em>week</em></p>" +
                    "<ul><li>one</li></ul><h2>Notes</h2><br/>" +
                    '<a href="https://getstacksapp.com/changelog">changelog</a>'
            )
        );

        for (const selector of ["p", "strong", "em", "ul", "li", "h2", "br"]) {
            expect(container.querySelectorAll(selector)).toHaveLength(1);
        }
        expect(container.querySelector("a")?.getAttribute("href")).toEqual(
            "https://getstacksapp.com/changelog"
        );
    });

    it("drops executable, embedded and layout elements", () => {
        const container = render(
            sanitizeRichHtml(
                "<script>alert(1)</script>" +
                    "<style>body{color:red}</style>" +
                    '<iframe src="https://getstacksapp.com"></iframe>' +
                    "<svg><circle/></svg>" +
                    "<form><input type='text'/></form>" +
                    "<video><source src=x/></video>"
            )
        );

        for (const selector of ["script", "style", "iframe", "svg", "form", "input", "video"]) {
            expect(container.querySelectorAll(selector)).toHaveLength(0);
        }
    });

    it("removes event handlers, style attributes and identifier attributes", () => {
        const container = render(
            sanitizeRichHtml(
                '<div class="padded" style="color:red" onclick="alert(1)" id="x" data-x="1">' +
                    '<span style="font-weight:900">kept text</span></div>'
            )
        );

        expect(container.textContent).toEqual("kept text");
        expect(attributeNames(container)).toEqual([]);
    });

    it("rejects executable URL schemes including mixed case and encoded variants", () => {
        const container = render(
            sanitizeRichHtml(
                '<a href="javascript:window.__securityProbe=1()">run</a>' +
                    '<a href="JaVaScRiPt:alert(1)">run</a>' +
                    '<a href="&#106;avascript:alert(1)">run</a>' +
                    '<a href="data:text/html,<b>hi</b>">run</a>' +
                    '<a href="vbscript:MsgBox(1)">run</a>' +
                    '<img src="javascript:alert(1)"/>'
            )
        );

        expect(Array.from(container.querySelectorAll("a")).map(link => link.getAttribute("href"))).toEqual(
            new Array(5).fill(null)
        );
        expect(container.querySelectorAll("img")).toHaveLength(0);
    });

    it("permits relative, fragment and protocol links", () => {
        const container = render(
            sanitizeRichHtml(
                '<a href="/app/settings">rel</a><a href="#top">frag</a><a href="./notes">rel</a>' +
                    '<a href="mailto:team@example.com">mail</a><a href="tel:+123">tel</a>' +
                    '<a href="http://getstacksapp.com">plain</a>'
            )
        );

        expect(Array.from(container.querySelectorAll("a")).map(link => link.getAttribute("href"))).toEqual([
            "/app/settings",
            "#top",
            "./notes",
            "mailto:team@example.com",
            "tel:+123",
            "http://getstacksapp.com",
        ]);
    });

    it("marks external links as unopener-safe", () => {
        const container = render(
            sanitizeRichHtml('<a href="https://getstacksapp.com/dev-program/">open</a>')
        );

        expect(container.querySelector("a")?.getAttribute("rel")).toEqual("noopener noreferrer");
    });

    it("keeps image text inert and drops the event handler", () => {
        const container = render(sanitizeRichHtml('<img src=x onerror="window.__securityProbe=1">'));

        expect(container.querySelectorAll("img")).toHaveLength(1);
        expect(container.querySelector("img")?.getAttributeNames()).toEqual(["src"]);
    });

    it("survives malformed and attribute-breaking input", () => {
        const container = render(sanitizeRichHtml(`<p>unclosed <em>bold <a href='a"onmouseover="x'>t</a>`));

        expect(container.textContent).toContain("unclosed");
        expect(attributeNames(container).filter(name => name.startsWith("on"))).toEqual([]);
    });
});
