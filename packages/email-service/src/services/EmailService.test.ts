// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EMAIL_TEMPLATES } from "@stacks/types";

const mocks = vi.hoisted(() => ({ query: vi.fn() }));

// Mock dependencies before importing EmailService
vi.mock("@stacks/db", () => ({
    sequelize: { query: mocks.query },
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
            SMTP_TLS_REJECT_UNAUTHORIZED: process.env.SMTP_TLS_REJECT_UNAUTHORIZED,
            SMTP_REQUIRE_TLS: process.env.SMTP_REQUIRE_TLS,
            SMTP_MAX_CONNECTIONS: process.env.SMTP_MAX_CONNECTIONS,
        };
        for (const name of Object.keys(savedEnv)) delete process.env[name];
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
                tls: { rejectUnauthorized: true },
                requireTLS: false,
                pool: true,
                maxConnections: 5,
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

        it("returns missing required vars when some are absent", () => {
            process.env.SMTP_HOST = "smtp.example.com";
            // SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_EMAIL are missing

            const { config, missing } = EmailService.loadSmtpConfig();

            expect(config).toBeNull();
            expect(missing).toEqual(["SMTP_PORT", "SMTP_FROM_EMAIL"]);
        });

        it("returns missing when all vars are absent", () => {
            delete process.env.SMTP_HOST;
            delete process.env.SMTP_PORT;
            delete process.env.SMTP_USER;
            delete process.env.SMTP_PASSWORD;
            delete process.env.SMTP_FROM_EMAIL;

            const { config, missing } = EmailService.loadSmtpConfig();

            expect(config).toBeNull();
            expect(missing).toEqual(["SMTP_HOST", "SMTP_PORT", "SMTP_FROM_EMAIL"]);
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

    describe("sendEmail", () => {
        it.each([
            {
                description: "recipient",
                to: "user@example.com\r\nBcc: attacker@example.com",
                subject: "Hello",
                fromEmail: "noreply@example.com",
                fromName: "Stacks",
            },
            {
                description: "subject",
                to: "user@example.com",
                subject: "Hello\r\nBcc: attacker@example.com",
                fromEmail: "noreply@example.com",
                fromName: "Stacks",
            },
            {
                description: "sender name",
                to: "user@example.com",
                subject: "Hello",
                fromEmail: "noreply@example.com",
                fromName: "Stacks\r\nBcc: attacker@example.com",
            },
            {
                description: "sender address",
                to: "user@example.com",
                subject: "Hello",
                fromEmail: "noreply@example.com\r\nBcc: attacker@example.com",
                fromName: "Stacks",
            },
        ])(
            "rejects CR/LF in the $description header before sending",
            async ({ to, subject, fromEmail, fromName }) => {
                Object.assign(process.env, {
                    SMTP_HOST: "smtp.example.com",
                    SMTP_PORT: "587",
                    SMTP_FROM_EMAIL: fromEmail,
                    SMTP_FROM_NAME: fromName,
                });
                const service = new EmailService();
                const sendMail = vi.fn().mockResolvedValue(undefined);
                (service as any).transporter = { sendMail };

                await expect(service.sendEmail(to, subject, "<p>Hello</p>")).rejects.toThrow(
                    "Email header values must not contain CR or LF"
                );
                expect(sendMail).not.toHaveBeenCalled();
            }
        );
    });

    describe("queued message retention", () => {
        const queuedEmail = {
            id: 17,
            userId: "recipient-id",
            template: EMAIL_TEMPLATES.WELCOME,
            data: { activationLink: "/auth/activate/one-time-secret" },
            retryCount: 0,
            locale: "en",
            email: "recipient@example.com",
            tenant: "recipient-tenant",
            recipientDisabled: true,
            recipientDeleted: null,
        };

        const createService = () => {
            const service = new EmailService();
            (service as any).templateCompiler = {
                getCompiledTemplate: vi.fn().mockResolvedValue({ body: "Welcome", subject: "Hello" }),
                processTemplateVariables: vi.fn((value: string) => value),
            };
            (service as any).sendEmail = vi.fn().mockResolvedValue(undefined);
            return service;
        };

        it("continues terminal-row retention cleanup while SMTP delivery is idle", async () => {
            const service = new EmailService();
            expect(service.enabled).toBe(false);

            await service.processQueuedEmails();

            expect(mocks.query).toHaveBeenCalledWith(
                expect.stringContaining("DELETE FROM email_queue"),
                expect.objectContaining({ replacements: { retentionDays: 30 } })
            );
        });

        it("deletes only sent and permanently failed rows older than the 30-day retention period", async () => {
            const service = createService();

            await (service as any).cleanupExpiredQueueRows();

            expect(mocks.query).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    replacements: { retentionDays: 30 },
                })
            );
            expect(mocks.query.mock.calls[0][0]).toContain("DELETE FROM email_queue");
            expect(mocks.query.mock.calls[0][0]).toContain("status IN ('sent', 'failed')");
            expect(mocks.query.mock.calls[0][0]).toContain("LIMIT 500");
            expect(mocks.query.mock.calls[0][0]).toContain('COALESCE("sentAt", "updated")');
        });

        it("clears token-bearing payloads after successful delivery", async () => {
            await (createService() as any).processQueuedEmail(queuedEmail);

            expect(mocks.query).toHaveBeenCalledWith(
                expect.stringContaining(`SET status = 'sent', "sentAt" = NOW()`),
                expect.any(Object)
            );
            expect(mocks.query.mock.calls[0][0]).toContain(`"data" = '{}'::jsonb`);
            expect(mocks.query.mock.calls[0][0]).toContain(`"updated" = NOW()`);
        });

        it("retains the payload while a transient delivery failure is retryable", async () => {
            const service = createService();
            (service as any).sendEmail.mockRejectedValueOnce(new Error("SMTP temporarily unavailable"));

            await (service as any).processQueuedEmail(queuedEmail);

            expect(mocks.query.mock.calls[0][0]).toContain(`SET status = 'pending'`);
            expect(mocks.query.mock.calls[0][0]).not.toContain(`"data" = '{}'::jsonb`);
            expect(mocks.query.mock.calls[0][1].replacements.id).toBe(queuedEmail.id);
        });

        it("clears token-bearing payloads after permanent delivery failure", async () => {
            const service = createService();
            (service as any).templateCompiler.getCompiledTemplate.mockResolvedValueOnce(null);

            await (service as any).processQueuedEmail(queuedEmail);

            expect(mocks.query).toHaveBeenCalledWith(
                expect.stringContaining(`SET status = 'failed'`),
                expect.any(Object)
            );
            expect(mocks.query.mock.calls[0][0]).toContain(`"data" = '{}'::jsonb`);
            expect(mocks.query.mock.calls[0][0]).toContain(`"updated" = NOW()`);
        });

        it.each([
            {
                description: "disabled non-activation recipient",
                changes: { recipientDisabled: true, recipientDeleted: null },
                template: EMAIL_TEMPLATES.NOTIFICATION,
            },
            {
                description: "disabled email-change recipient",
                changes: { recipientDisabled: true, recipientDeleted: null },
                template: EMAIL_TEMPLATES.EMAIL_CHANGE,
            },
            {
                description: "deleted activation recipient",
                changes: { recipientDisabled: true, recipientDeleted: new Date() },
                template: EMAIL_TEMPLATES.WELCOME,
            },
        ])("suppresses mail to a $description", async ({ changes, template }) => {
            const service = createService();

            await (service as any).processQueuedEmail({ ...queuedEmail, ...changes, template });

            expect((service as any).sendEmail).not.toHaveBeenCalled();
            expect(mocks.query.mock.calls[0][0]).toContain(`SET status = 'failed'`);
            expect(mocks.query.mock.calls[0][0]).toContain(`"data" = '{}'::jsonb`);
        });
    });
});
