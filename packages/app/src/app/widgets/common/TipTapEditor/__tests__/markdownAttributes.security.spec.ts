import { createAtomBlockMarkdownSpec, createInlineMarkdownSpec } from "@tiptap/core";

describe("Tiptap Markdown attribute parsing", () => {
    it("handles long block attribute keys without quadratic rescanning", () => {
        const tokenizer = createAtomBlockMarkdownSpec({ nodeName: "probe" }).markdownTokenizer;
        const repeatedPlaceholder = "__QUOTED_0".repeat(2048) + "__QUOTED_0__";
        const source = `:::probe {${repeatedPlaceholder}} :::\n`;

        const startedAt = performance.now();
        tokenizer.tokenize(source, [], { inlineTokens: () => [], blockTokens: () => [] });

        expect(performance.now() - startedAt).toBeLessThan(1000);
    });

    it("handles long inline attribute keys without quadratic rescanning", () => {
        const tokenizer = createInlineMarkdownSpec({
            nodeName: "probe",
            selfClosing: true,
        }).markdownTokenizer;
        const source = `[probe ${"0".repeat(32768)}]`;

        const startedAt = performance.now();
        tokenizer.tokenize(source, [], { inlineTokens: () => [], blockTokens: () => [] });

        expect(performance.now() - startedAt).toBeLessThan(1000);
    });
});
