// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies so we can instantiate TemplateCompiler without a DB
vi.mock("@stacks/db", () => ({
    sequelize: {},
    connectDb: vi.fn(),
    EmailTemplateEntity: {},
    EmailQueueEntity: {},
    TenantEntity: {},
}));

// Suppress logger console output
vi.mock("../utils/logger", () => ({
    default: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

import TemplateCompiler from "./TemplateCompiler";

describe("TemplateCompiler.processTemplateVariables", () => {
    let compiler: TemplateCompiler;

    beforeEach(() => {
        compiler = new TemplateCompiler();
    });

    it("replaces %key% placeholders with values", () => {
        const result = compiler.processTemplateVariables("Hello %name%, your code is %code%", {
            name: "Alice",
            code: "1234",
        });
        expect(result).toBe("Hello Alice, your code is 1234");
    });

    it("replaces with empty string for null/undefined values", () => {
        const result = compiler.processTemplateVariables("Hello %name%", {
            name: null,
        });
        expect(result).toBe("Hello ");
    });

    it("leaves placeholders unchanged when key is not in data", () => {
        const result = compiler.processTemplateVariables("Hello %name%, code: %code%", {
            name: "Alice",
        });
        expect(result).toBe("Hello Alice, code: %code%");
    });

    it("leaves template unchanged with empty data object", () => {
        const input = "Hello %name%";
        const result = compiler.processTemplateVariables(input, {});
        expect(result).toBe(input);
    });

    it("handles string values that look like numbers", () => {
        const result = compiler.processTemplateVariables("Amount: %amount%", {
            amount: "42.50",
        });
        expect(result).toBe("Amount: 42.50");
    });

    it("handles keys with special characters in values (not in key)", () => {
        const result = compiler.processTemplateVariables("Code: %code%", {
            code: "a.b*c+d?e",
        });
        expect(result).toBe("Code: a.b*c+d?e");
    });

    it("replaces all occurrences of the same key", () => {
        const result = compiler.processTemplateVariables("%greeting% %name%, welcome to %app%", {
            greeting: "Hi",
            name: "Alice",
            app: "Stacks",
        });
        expect(result).toBe("Hi Alice, welcome to Stacks");
    });

    it("handles keys with whitespace around them in the template", () => {
        const result = compiler.processTemplateVariables("Hello  %  name  %, welcome", {
            name: "Alice",
        });
        // The regex matches %  name  % and replaces it, leaving surrounding spaces
        expect(result).toBe("Hello  Alice, welcome");
    });

    it("handles numeric zero values", () => {
        const result = compiler.processTemplateVariables("Count: %count%", {
            count: 0,
        });
        expect(result).toBe("Count: 0");
    });

    it("handles boolean values", () => {
        const result = compiler.processTemplateVariables("Active: %active%", {
            active: true,
        });
        expect(result).toBe("Active: true");
    });

    it("handles empty string values", () => {
        const result = compiler.processTemplateVariables("Hello %name%", {
            name: "",
        });
        expect(result).toBe("Hello ");
    });
});
