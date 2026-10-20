import { mergeAttributes } from "@tiptap/core";
import { DOMSerializer, Schema } from "@tiptap/pm/model";

describe("Tiptap merged attributes", () => {
    it("does not turn an own __proto__ key into inherited DOM attributes", () => {
        const untrustedAttributes = JSON.parse(
            '{"__proto__":{"data-inherited-canary":"present","src":"x-invalid://canary","onerror":"globalThis.__tiptapXss += 1"}}'
        );
        const attributes = mergeAttributes(untrustedAttributes);

        expect(Object.getPrototypeOf(attributes)).toBe(Object.prototype);
        expect(Object.keys(attributes)).toEqual(["__proto__"]);

        const schema = new Schema({
            nodes: {
                doc: { content: "image" },
                image: { group: "block", atom: true, toDOM: () => ["img", attributes] },
                text: { group: "inline" },
            },
        });
        const document = schema.node("doc", null, [schema.node("image")]);
        const fragment = DOMSerializer.fromSchema(schema).serializeFragment(document.content);
        const image = fragment.querySelector("img");

        expect(image).not.toBeNull();
        expect(image?.getAttribute("data-inherited-canary")).toBeNull();
        expect(image?.getAttribute("src")).toBeNull();
        expect(image?.getAttribute("onerror")).toBeNull();
    });
});
