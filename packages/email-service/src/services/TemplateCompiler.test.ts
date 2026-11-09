// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, it, expect, vi } from "vitest";
import { EMAIL_TEMPLATES } from "@stacks/types";
import { escapeRegExp } from "./TemplateCompiler";

const mocks = vi.hoisted(() => ({ findOne: vi.fn() }));

vi.mock("@stacks/db", () => ({
    sequelize: {},
    connectDb: vi.fn(),
    EmailTemplateEntity: { findOne: mocks.findOne },
    EmailQueueEntity: {},
    TenantEntity: {},
}));

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

describe("TemplateCompiler.getCompiledTemplate tenant scope", () => {
    it("checks only the requested tenant and then the shared default", async () => {
        const template = { tenant: "tenant-a", templateType: "welcome", locale: "en" };
        mocks.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(template);

        const compiler = new (await import("./TemplateCompiler")).default();
        const result = await compiler.getCompiledTemplate(EMAIL_TEMPLATES.WELCOME, "en", "tenant-a");

        expect(result).toBe(template);
        expect(mocks.findOne).toHaveBeenNthCalledWith(1, {
            where: { templateType: "welcome", locale: "en", tenant: "tenant-a", isActive: true },
        });
        expect(mocks.findOne).toHaveBeenNthCalledWith(2, {
            where: { templateType: "welcome", locale: "en", tenant: "default", isActive: true },
        });
        expect(mocks.findOne).toHaveBeenCalledTimes(2);
    });
});
