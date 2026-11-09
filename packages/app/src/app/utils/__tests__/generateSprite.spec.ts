import fs from "fs";
import os from "os";
import path from "path";
import { buildSpriteFromDirectory } from "../../../../scripts/generate-sprite";

describe("buildSpriteFromDirectory", () => {
    let directory: string;

    beforeEach(() => {
        directory = fs.mkdtempSync(path.join(os.tmpdir(), "stacks-sprite-test-"));
    });

    afterEach(() => {
        fs.rmSync(directory, { recursive: true, force: true });
    });

    it("builds deterministic symbols from valid SVG inputs", () => {
        fs.writeFileSync(
            path.join(directory, "check.svg"),
            '<svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg"><path d="M1 1" /></svg>'
        );
        fs.writeFileSync(
            path.join(directory, "alert.svg"),
            '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="2" /></svg>'
        );

        const first = buildSpriteFromDirectory(directory);
        const second = buildSpriteFromDirectory(directory);

        expect(first).toBe(second);
        expect(first).toContain('<symbol id="alert" viewBox="0 0 24 24">');
        expect(first).toContain('<symbol id="check" viewBox="0 0 12 12">');
        expect(first).toContain('<path d="M1 1"/>');
    });

    it("rejects malformed SVG and document type declarations", () => {
        fs.writeFileSync(path.join(directory, "malformed.svg"), "<svg><path></svg>");
        expect(() => buildSpriteFromDirectory(directory)).toThrow(/invalid SVG/i);

        fs.rmSync(path.join(directory, "malformed.svg"));
        fs.writeFileSync(
            path.join(directory, "external.svg"),
            '<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]><svg viewBox="0 0 1 1">&x;</svg>'
        );
        expect(() => buildSpriteFromDirectory(directory)).toThrow(/doctype/i);
    });

    it("rejects a viewBox value that could escape the generated attribute", () => {
        fs.writeFileSync(
            path.join(directory, "injected.svg"),
            '<svg viewBox="0 0 1&quot; onload=&quot;alert(1)"><path /></svg>'
        );

        expect(() => buildSpriteFromDirectory(directory)).toThrow(/invalid SVG viewBox/i);
    });

    it("ignores non-SVG directory entries and rejects unsafe SVG filenames", () => {
        fs.writeFileSync(path.join(directory, "notes.txt"), "not an icon");
        fs.writeFileSync(path.join(directory, "safe.svg"), '<svg viewBox="0 0 1 1"><path d="M0 0" /></svg>');
        expect(buildSpriteFromDirectory(directory)).toContain('<symbol id="safe"');

        fs.writeFileSync(path.join(directory, "unsafe icon.svg"), "<svg />");
        expect(() => buildSpriteFromDirectory(directory)).toThrow(/unsafe SVG filename/i);
    });
});
