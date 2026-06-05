// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock dependencies before importing EmailService
vi.mock("@stacks/db", () => ({
    sequelize: {},
    connectDb: vi.fn(),
    EmailTemplateEntity: {},
    EmailQueueEntity: {},
    TenantEntity: {},
}));

vi.mock("./TemplateCompiler", () => ({ default: class {} }));

// Suppress logger console output during tests
const mockConsole = {
    log: vi.spyOn(console, "log").mockImplementation(() => {}),
    warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
    error: vi.spyOn(console, "error").mockImplementation(() => {}),
    info: vi.spyOn(console, "log").mockImplementation(() => {}),
};

import EmailService from "./EmailService";

const restoreEnv = (vars: Record<string, string | undefined>) => {
    for (const [k, v] of Object.entries(vars)) {
        if (v === undefined) {
            delete process.env[k];
        } else {
            process.env[k] = v;
        }
    }
};

describe("EmailService", () => {
    let savedEnv: Record<string, string | undefined>;

    beforeEach(() => {
        savedEnv = {
            SMTP_HOST: process.env.SMTP_HOST,
            SMTP_PORT: process.env.SMTP_PORT,
            SMTP_USER: process.env.SMTP_USER,
            SMTP_PASSWORD: process.env.SMTP_PASSWORD,
            SMTP_FROM_EMAIL: process.env.SMTP_FROM_EMAIL,
            SMTP_FROM_NAME: process.env.SMTP_FROM_NAME,
            SMTP_SECURE: process.env.SMTP_SECURE,
        };
    });

    afterEach(() => {
        restoreEnv(savedEnv);
        vi.clearAllMocks();
    });

    describe("loadSmtpConfig", () => {
        it("returns config when all required vars are present", () => {
            process.env.SMTP_HOST = "smtp.example.com";
            process.env.SMTP_PORT = "587";
            process.env.SMTP_USER = "user@example.com";
            process.env.SMTP_PASSWORD = "secret";
            process.env.SMTP_FROM_EMAIL = "noreply@example.com";

            const { config, missing } = EmailService.loadSmtpConfig();

            expect(missing).toHaveLength(0);
            expect(config).toEqual({
                host: "smtp.example.com",
                port: 587,
                secure: false,
                auth: { user: "user@example.com", pass: "secret" },
                connectionTimeout: 60000,
                greetingTimeout: 30000,
                socketTimeout: 60000,
                tls: { rejectUnauthorized: false },
            });
        });

        it("sets secure=true when SMTP_SECURE is true", () => {
            Object.assign(process.env, {
                SMTP_HOST: "smtp.example.com",
                SMTP_PORT: "465",
                SMTP_USER: "user@example.com",
                SMTP_PASSWORD: "secret",
                SMTP_FROM_EMAIL: "noreply@example.com",
                SMTP_SECURE: "true",
            });

            const { config } = EmailService.loadSmtpConfig();
            expect(config?.secure).toBe(true);
        });

        it("returns missing vars when some are absent", () => {
            process.env.SMTP_HOST = "smtp.example.com";
            // SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_EMAIL are missing

            const { config, missing } = EmailService.loadSmtpConfig();

            expect(config).toBeNull();
            expect(missing).toEqual(["SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM_EMAIL"]);
        });

        it("returns missing when all vars are absent", () => {
            delete process.env.SMTP_HOST;
            delete process.env.SMTP_PORT;
            delete process.env.SMTP_USER;
            delete process.env.SMTP_PASSWORD;
            delete process.env.SMTP_FROM_EMAIL;

            const { config, missing } = EmailService.loadSmtpConfig();

            expect(config).toBeNull();
            expect(missing).toEqual(["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM_EMAIL"]);
        });

        it("treats empty string as missing", () => {
            Object.assign(process.env, {
                SMTP_HOST: "smtp.example.com",
                SMTP_PORT: "",
                SMTP_USER: "user@example.com",
                SMTP_PASSWORD: "secret",
                SMTP_FROM_EMAIL: "noreply@example.com",
            });

            const { config, missing } = EmailService.loadSmtpConfig();
            expect(config).toBeNull();
            expect(missing).toContain("SMTP_PORT");
        });

        it("warns on port 465 without SMTP_SECURE=true", () => {
            Object.assign(process.env, {
                SMTP_HOST: "smtp.example.com",
                SMTP_PORT: "465",
                SMTP_USER: "user@example.com",
                SMTP_PASSWORD: "secret",
                SMTP_FROM_EMAIL: "noreply@example.com",
                SMTP_SECURE: "false",
            });

            EmailService.loadSmtpConfig();
            expect(mockConsole.warn.mock.calls[0][1]).toBe(
                "⚠️  Port 465 typically requires SMTP_SECURE=true"
            );
        });

        it("warns on port 587 with SMTP_SECURE=true", () => {
            Object.assign(process.env, {
                SMTP_HOST: "smtp.example.com",
                SMTP_PORT: "587",
                SMTP_USER: "user@example.com",
                SMTP_PASSWORD: "secret",
                SMTP_FROM_EMAIL: "noreply@example.com",
                SMTP_SECURE: "true",
            });

            EmailService.loadSmtpConfig();
            expect(mockConsole.warn.mock.calls[0][1]).toBe(
                "⚠️  Port 587 typically uses SMTP_SECURE=false with STARTTLS"
            );
        });

        it("parses port as integer", () => {
            Object.assign(process.env, {
                SMTP_HOST: "smtp.example.com",
                SMTP_PORT: "2525",
                SMTP_USER: "user@example.com",
                SMTP_PASSWORD: "secret",
                SMTP_FROM_EMAIL: "noreply@example.com",
            });

            const { config } = EmailService.loadSmtpConfig();
            expect(config?.port).toBe(2525);
            expect(typeof config?.port).toBe("number");
        });
    });
});
