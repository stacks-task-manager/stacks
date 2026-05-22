// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import * as nodemailer from "nodemailer";
import { QueryTypes, Transaction } from "sequelize";
import { sequelize } from "@stacks/db";
import { EMAIL_TEMPLATES } from "@stacks/types";
import TemplateCompiler from "./TemplateCompiler";
import logger from "../utils/logger";

interface SMTPConfig {
    host: string;
    port: number;
    secure: boolean;
    auth: {
        user: string;
        pass: string;
    };
    connectionTimeout?: number;
    greetingTimeout?: number;
    socketTimeout?: number;
    tls?: {
        rejectUnauthorized: boolean;
    };
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

const REQUIRED_SMTP_VARS = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM_EMAIL"] as const;
const MAX_RETRIES = 3;
const SEND_RETRY_LIMIT = 2;

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
            logger.error(
                `⛔ Missing required SMTP configuration variables: ${missing.join(", ")}`
            );
            return { config: null, missing };
        }

        const port = parseInt(process.env.SMTP_PORT as string, 10);
        const secure = process.env.SMTP_SECURE === "true";

        if (port === 465 && !secure) {
            logger.warn("⚠️  Port 465 typically requires SMTP_SECURE=true");
        } else if (port === 587 && secure) {
            logger.warn("⚠️  Port 587 typically uses SMTP_SECURE=false with STARTTLS");
        }

        logger.info(`📡 SMTP Server: ${process.env.SMTP_HOST}:${port}`);
        logger.info(
            `🔒 Secure Connection: ${secure ? "SSL/TLS (port 465)" : "STARTTLS (port 587)"}`
        );

        return {
            config: {
                host: process.env.SMTP_HOST as string,
                port,
                secure,
                auth: {
                    user: process.env.SMTP_USER as string,
                    pass: process.env.SMTP_PASSWORD as string,
                },
                connectionTimeout: 60000,
                greetingTimeout: 30000,
                socketTimeout: 60000,
                tls: {
                    rejectUnauthorized: false,
                },
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
            if ((code === "ETIMEDOUT" || code === "ECONNRESET") && attempt < SEND_RETRY_LIMIT) {
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
     * Atomically claim up to `limit` pending emails using FOR UPDATE SKIP LOCKED,
     * process them, and update their status before committing the transaction.
     * Holding the row locks for the duration of the batch prevents concurrent
     * service instances from picking the same emails.
     */
    async processQueuedEmails(limit: number = 50): Promise<void> {
        if (!this.enabled) {
            logger.debug("SMTP disabled; skipping queue processing");
            return;
        }

        const transaction = await sequelize.transaction();
        let committed = false;
        try {
            const queuedEmails = await sequelize.query<QueuedEmailRow>(
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
                    replacements: { limit },
                    transaction,
                }
            );

            if (queuedEmails.length === 0) {
                await transaction.commit();
                committed = true;
                return;
            }

            logger.info(`📧 Processing ${queuedEmails.length} queued emails`);

            for (const queuedEmail of queuedEmails) {
                await this.processQueuedEmail(queuedEmail, transaction);
            }

            await transaction.commit();
            committed = true;
        } catch (error) {
            logger.error("❌ Error processing email queue:", error);
            if (!committed) {
                try {
                    await transaction.rollback();
                } catch (rollbackError) {
                    logger.error("❌ Failed to rollback transaction:", rollbackError);
                }
            }
        }
    }

    /**
     * Process a single locked queue row inside the supplied transaction.
     * Failures are recorded in a single UPDATE that either reschedules the
     * row for retry or marks it permanently failed.
     */
    private async processQueuedEmail(
        queuedEmail: QueuedEmailRow,
        transaction: Transaction
    ): Promise<void> {
        const recipientEmail = queuedEmail.email;
        try {
            const emailData = this.parseEmailData(queuedEmail.data);
            emailData.publicUrl = process.env.PUBLIC_URL ?? "";

            const tenantId = queuedEmail.tenant ?? "default";

            const emailTemplate = await this.templateCompiler.getCompiledTemplate(
                queuedEmail.template,
                queuedEmail.locale,
                tenantId
            );

            if (!emailTemplate) {
                throw new Error(
                    `Template not found: ${queuedEmail.template} for locale ${queuedEmail.locale} and tenant ${tenantId}`
                );
            }

            const emailHtml = this.templateCompiler.processTemplateVariables(
                emailTemplate.body,
                emailData
            );
            const subject = this.templateCompiler.processTemplateVariables(
                emailTemplate.subject,
                emailData
            );

            if (!recipientEmail) {
                throw new Error("Recipient email not found for queue row");
            }

            await this.sendEmail(recipientEmail, subject, emailHtml);

            await sequelize.query(
                `UPDATE email_queue
                 SET status = 'sent', "sentAt" = NOW()
                 WHERE id = :id`,
                {
                    replacements: { id: queuedEmail.id },
                    type: QueryTypes.UPDATE,
                    transaction,
                }
            );

            logger.info(`✅ Email sent to ${recipientEmail}`);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            const newRetryCount = queuedEmail.retryCount + 1;
            const canRetry = queuedEmail.retryCount < MAX_RETRIES;

            logger.error(
                `❌ Failed to send email to ${recipientEmail ?? "unknown"} (id ${queuedEmail.id}): ${message}`
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
                        transaction,
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
                        transaction,
                    }
                );
                logger.error(`💀 Email ${queuedEmail.id} permanently failed after ${newRetryCount} attempts`);
            }
        }
    }

    /**
     * Normalise the JSONB / string data column into a plain object.
     */
    private parseEmailData(data: QueuedEmailRow["data"]): Record<string, unknown> {
        if (typeof data === "string") {
            try {
                return JSON.parse(data) as Record<string, unknown>;
            } catch {
                return {};
            }
        }
        return data ?? {};
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
