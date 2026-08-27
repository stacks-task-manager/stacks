// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import * as nodemailer from "nodemailer";
import { QueryTypes } from "sequelize";
import { sequelize } from "@stacks/db";
import { EMAIL_TEMPLATES } from "@stacks/types";
import TemplateCompiler from "./TemplateCompiler";
import logger from "../utils/logger";
import { parseEmailData } from "../utils/emailData";

interface SMTPConfig {
    host: string;
    port: number;
    secure: boolean;
    auth?: {
        user: string;
        pass: string;
    };
    connectionTimeout?: number;
    greetingTimeout?: number;
    socketTimeout?: number;
    tls?: {
        rejectUnauthorized: boolean;
    };
    requireTLS?: boolean;
    pool?: boolean;
    maxConnections?: number;
}

interface QueuedEmailRow {
    id: number;
    userId: string;
    template: EMAIL_TEMPLATES;
    data: Record<string, unknown> | string;
    retryCount: number;
    locale: string;
    email: string | null;
    tenant: string | null;
}

const REQUIRED_SMTP_VARS = ["SMTP_HOST", "SMTP_PORT", "SMTP_FROM_EMAIL"] as const;
const DEFAULT_MAX_ATTEMPTS = 3;
const SEND_RETRY_LIMIT = 2;

export function parsePositiveInteger(value: string | undefined, fallback: number, maximum: number): number {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
}

export function isTransientSmtpError(error: unknown): boolean {
    const candidate = error as { code?: string; responseCode?: number };
    return (
        ["ETIMEDOUT", "ECONNRESET", "ECONNREFUSED", "EPIPE", "ENETUNREACH"].includes(candidate?.code ?? "") ||
        (typeof candidate?.responseCode === "number" &&
            candidate.responseCode >= 400 &&
            candidate.responseCode < 500)
    );
}

export function normalizePublicUrl(value: string | undefined): string {
    const normalized = value?.trim().replace(/\/+$/, "") ?? "";
    if (!normalized) return "";
    const url = new URL(normalized);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
        throw new Error("PUBLIC_URL must use http or https");
    }
    return normalized;
}

function failureMessage(error: unknown): string {
    return (error instanceof Error ? error.message : "Unknown error").slice(0, 2000);
}

function maskEmail(email: string | null): string {
    if (!email) return "unknown";
    const [local, domain] = email.split("@");
    return domain ? `${local.slice(0, 2)}***@${domain}` : "invalid-address";
}

class PermanentEmailError extends Error {}

class EmailService {
    private transporter: nodemailer.Transporter | null;
    private fromName: string;
    private fromEmail: string;
    private templateCompiler: TemplateCompiler;
    public readonly enabled: boolean;
    public readonly missingConfig: readonly string[];

    constructor() {
        this.templateCompiler = new TemplateCompiler();
        const { config, missing } = EmailService.loadSmtpConfig();

        this.missingConfig = missing;
        this.enabled = config !== null;

        this.fromName = process.env.SMTP_FROM_NAME || "Stacks Notifications";
        this.fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || "";

        this.transporter = config ? nodemailer.createTransport(config) : null;
    }

    /**
     * Read and validate SMTP configuration from the environment.
     *
     * Returns `{ config: null, missing }` when one or more required variables
     * are absent. The caller is expected to keep the service idle (rather
     * than crash) so the process stays alive instead of being restarted in
     * a loop by the orchestrator.
     */
    static loadSmtpConfig(): { config: SMTPConfig | null; missing: readonly string[] } {
        const missing = REQUIRED_SMTP_VARS.filter(name => {
            const v = process.env[name];
            return !v || v.trim() === "";
        });

        if (missing.length > 0) {
            logger.error(`⛔ Missing required SMTP configuration variables: ${missing.join(", ")}`);
            return { config: null, missing };
        }

        const port = Number(process.env.SMTP_PORT);
        if (!Number.isInteger(port) || port < 1 || port > 65535) {
            logger.error("⛔ SMTP_PORT must be an integer between 1 and 65535");
            return { config: null, missing: ["SMTP_PORT"] };
        }
        const user = process.env.SMTP_USER?.trim();
        const password = process.env.SMTP_PASSWORD?.trim();
        if (Boolean(user) !== Boolean(password)) {
            logger.error("⛔ SMTP_USER and SMTP_PASSWORD must either both be set or both be empty");
            return { config: null, missing: [user ? "SMTP_PASSWORD" : "SMTP_USER"] };
        }
        const secure = process.env.SMTP_SECURE === "true";

        if (port === 465 && !secure) {
            logger.warn("⚠️  Port 465 typically requires SMTP_SECURE=true");
        } else if (port === 587 && secure) {
            logger.warn("⚠️  Port 587 typically uses SMTP_SECURE=false with STARTTLS");
        }

        logger.info(`📡 SMTP Server: ${process.env.SMTP_HOST}:${port}`);
        logger.info(`🔒 Secure Connection: ${secure ? "SSL/TLS (port 465)" : "STARTTLS (port 587)"}`);

        return {
            config: {
                host: process.env.SMTP_HOST as string,
                port,
                secure,
                ...(user && password ? { auth: { user, pass: password } } : {}),
                connectionTimeout: 60000,
                greetingTimeout: 30000,
                socketTimeout: 60000,
                tls: {
                    rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== "false",
                },
                requireTLS: process.env.SMTP_REQUIRE_TLS === "true",
                pool: true,
                maxConnections: parsePositiveInteger(process.env.SMTP_MAX_CONNECTIONS, 5, 20),
            },
            missing: [],
        };
    }

    /**
     * Send a single email with retry logic for transient connection issues.
     */
    async sendEmail(to: string, subject: string, body: string, attempt: number = 0): Promise<void> {
        if (!this.transporter) {
            throw new Error("SMTP transport is not configured");
        }

        const mailOptions = {
            from: `"${this.fromName}" <${this.fromEmail}>`,
            to,
            subject,
            html: body,
        };

        try {
            await this.transporter.sendMail(mailOptions);
        } catch (error) {
            const code = (error as NodeJS.ErrnoException)?.code;
            if (isTransientSmtpError(error) && attempt < SEND_RETRY_LIMIT) {
                const delay = 5000 * (attempt + 1);
                logger.warn(
                    `🔄 SMTP ${code}, retrying in ${delay}ms (attempt ${attempt + 1}/${SEND_RETRY_LIMIT})`
                );
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.sendEmail(to, subject, body, attempt + 1);
            }
            throw error;
        }
    }

    /**
     * Atomically leases pending rows, commits immediately, then performs slow SMTP
     * I/O outside the transaction. An expired lease makes crash-interrupted rows
     * eligible again without holding database locks while connecting to SMTP.
     */
    async processQueuedEmails(limit: number = 50): Promise<void> {
        if (!this.enabled) {
            logger.debug("SMTP disabled; skipping queue processing");
            return;
        }

        const batchLimit = Math.max(1, Math.min(Math.floor(limit), 500));
        const leaseMs = parsePositiveInteger(process.env.EMAIL_CLAIM_LEASE_MS, 300_000, 3_600_000);
        const concurrency = parsePositiveInteger(process.env.EMAIL_SEND_CONCURRENCY, 5, 20);
        const transaction = await sequelize.transaction();
        let queuedEmails: QueuedEmailRow[] = [];
        try {
            queuedEmails = await sequelize.query<QueuedEmailRow>(
                `
                SELECT "queue".*, users.email, users.tenant
                FROM email_queue AS "queue"
                LEFT JOIN users ON users.id = "queue"."userId"
                WHERE "queue".status = 'pending'
                  AND "queue"."scheduledAt" <= NOW()
                ORDER BY "queue"."scheduledAt" ASC
                LIMIT :limit
                FOR UPDATE OF "queue" SKIP LOCKED;
                `,
                {
                    type: QueryTypes.SELECT,
                    replacements: { limit: batchLimit },
                    transaction,
                }
            );

            if (queuedEmails.length === 0) {
                await transaction.commit();
                return;
            }
            await sequelize.query(
                `UPDATE email_queue
                 SET "scheduledAt" = :leaseUntil
                 WHERE id IN (:ids) AND status = 'pending'`,
                {
                    replacements: {
                        ids: queuedEmails.map(email => email.id),
                        leaseUntil: new Date(Date.now() + leaseMs),
                    },
                    type: QueryTypes.UPDATE,
                    transaction,
                }
            );
            await transaction.commit();
        } catch (error) {
            logger.error("❌ Error processing email queue:", error);
            try {
                await transaction.rollback();
            } catch (rollbackError) {
                logger.error("❌ Failed to rollback transaction:", rollbackError);
            }
            return;
        }

        logger.info(`📧 Processing ${queuedEmails.length} queued emails with concurrency ${concurrency}`);
        for (let index = 0; index < queuedEmails.length; index += concurrency) {
            await Promise.all(
                queuedEmails.slice(index, index + concurrency).map(email => this.processQueuedEmail(email))
            );
        }
    }

    /**
     * Process a single locked queue row inside the supplied transaction.
     * Failures are recorded in a single UPDATE that either reschedules the
     * row for retry or marks it permanently failed.
     */
    private async processQueuedEmail(queuedEmail: QueuedEmailRow): Promise<void> {
        const recipientEmail = queuedEmail.email;
        try {
            const emailData = parseEmailData(queuedEmail.data);
            try {
                emailData.publicUrl = normalizePublicUrl(process.env.PUBLIC_URL);
            } catch (error) {
                throw new PermanentEmailError(failureMessage(error));
            }

            const tenantId = queuedEmail.tenant ?? "default";

            const emailTemplate = await this.templateCompiler.getCompiledTemplate(
                queuedEmail.template,
                queuedEmail.locale,
                tenantId
            );

            if (!emailTemplate) {
                throw new PermanentEmailError(
                    `Template not found: ${queuedEmail.template} for locale ${queuedEmail.locale} and tenant ${tenantId}`
                );
            }

            const emailHtml = this.templateCompiler.processTemplateVariables(
                emailTemplate.body,
                emailData,
                true
            );
            const subject = this.templateCompiler.processTemplateVariables(emailTemplate.subject, emailData);

            if (!recipientEmail) {
                throw new PermanentEmailError("Recipient email not found for queue row");
            }

            await this.sendEmail(recipientEmail, subject, emailHtml);

            await sequelize.query(
                `UPDATE email_queue
                 SET status = 'sent', "sentAt" = NOW()
                 WHERE id = :id`,
                {
                    replacements: { id: queuedEmail.id },
                    type: QueryTypes.UPDATE,
                }
            );

            logger.info(`✅ Email ${queuedEmail.id} sent to ${maskEmail(recipientEmail)}`);
        } catch (error) {
            const message = failureMessage(error);
            const newRetryCount = queuedEmail.retryCount + 1;
            const maxAttempts = parsePositiveInteger(
                process.env.EMAIL_MAX_ATTEMPTS,
                DEFAULT_MAX_ATTEMPTS,
                20
            );
            const canRetry = !(error instanceof PermanentEmailError) && newRetryCount < maxAttempts;

            logger.error(
                `❌ Failed to send email ${queuedEmail.id} to ${maskEmail(recipientEmail)}: ${message}`
            );

            if (canRetry) {
                const retryDelayMs = Math.pow(2, queuedEmail.retryCount) * 60 * 1000;
                const scheduledAt = new Date(Date.now() + retryDelayMs);
                await sequelize.query(
                    `UPDATE email_queue
                     SET status = 'pending',
                         "failureReason" = :failureReason,
                         "retryCount" = :retryCount,
                         "scheduledAt" = :scheduledAt
                     WHERE id = :id`,
                    {
                        replacements: {
                            id: queuedEmail.id,
                            failureReason: message,
                            retryCount: newRetryCount,
                            scheduledAt,
                        },
                        type: QueryTypes.UPDATE,
                    }
                );
                logger.warn(`🔄 Email ${queuedEmail.id} rescheduled in ${retryDelayMs / 1000}s`);
            } else {
                await sequelize.query(
                    `UPDATE email_queue
                     SET status = 'failed',
                         "failureReason" = :failureReason,
                         "retryCount" = :retryCount
                     WHERE id = :id`,
                    {
                        replacements: {
                            id: queuedEmail.id,
                            failureReason: message,
                            retryCount: newRetryCount,
                        },
                        type: QueryTypes.UPDATE,
                    }
                );
                logger.error(`💀 Email ${queuedEmail.id} permanently failed after ${newRetryCount} attempts`);
            }
        }
    }

    /**
     * Test SMTP connection
     */
    async testConnection(): Promise<boolean> {
        if (!this.transporter) {
            return false;
        }
        try {
            await this.transporter.verify();
            logger.info("✅ SMTP connection verified");
            return true;
        } catch (error) {
            logger.error("❌ SMTP connection failed:", error);
            return false;
        }
    }

    /**
     * Close the underlying SMTP transport. Used during graceful shutdown.
     */
    close(): void {
        this.transporter?.close();
        this.transporter = null;
    }
}

export default EmailService;
