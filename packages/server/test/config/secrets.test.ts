// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, expect, it } from "vitest";
import { validateProductionSecrets } from "../../src/config/secrets";

describe("validateProductionSecrets", () => {
    it("accepts strong distinct secrets", () => {
        expect(
            validateProductionSecrets({
                JWT_SECRET: "jwt-secret-0123456789-abcdefghijklmnopqrstuv",
                COOKIE_SECRET: "cookie-secret-9876543210-vutsrqponmlkjihgfedcba",
            } as NodeJS.ProcessEnv)
        ).toBeNull();
    });

    it("rejects missing JWT_SECRET", () => {
        expect(
            validateProductionSecrets({
                COOKIE_SECRET: "b".repeat(40),
            } as NodeJS.ProcessEnv)
        ).not.toBeNull();
    });

    it("rejects weak placeholder secrets", () => {
        expect(
            validateProductionSecrets({
                JWT_SECRET: "s3cr3t",
                COOKIE_SECRET: "b".repeat(40),
            } as NodeJS.ProcessEnv)
        ).not.toBeNull();
    });
});
