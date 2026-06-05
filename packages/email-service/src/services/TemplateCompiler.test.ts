// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, it, expect } from "vitest";
import { escapeRegExp } from "./TemplateCompiler";

describe("escapeRegExp", () => {
    it("returns the string unchanged when there are no special characters", () => {
        expect(escapeRegExp("hello world")).toBe("hello world");
    });

    it("escapes regex meta characters", () => {
        expect(escapeRegExp("a.b*c+d?e^$f(g)h[i]{j}k\\l|m")).toBe(
            "a\\.b\\*c\\+d\\?e\\^\\$f\\(g\\)h\\[i\\]\\{j\\}k\\\\l\\|m"
        );
    });

    it("handles empty string", () => {
        expect(escapeRegExp("")).toBe("");
    });

    it("handles strings with only special characters", () => {
        expect(escapeRegExp("...")).toBe("\\.\\.\\.");
    });

    it("handles unicode and whitespace", () => {
        expect(escapeRegExp("hello\t\n世界")).toBe("hello\t\n世界");
    });
});
