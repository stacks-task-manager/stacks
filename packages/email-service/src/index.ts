// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { connectDb, sequelize } from "@stacks/db";
import EmailService from "./services/EmailService";
import TemplateCompiler from "./services/TemplateCompiler";
import logger from "./utils/logger";

const SHUTDOWN_DRAIN_TIMEOUT_MS = 30_000;
const DRAIN_POLL_INTERVAL_MS = 200;

/**
 * Email Service Application
 *
 * This service processes queued emails on a regular interval
 * and sends them using SMTP configuration.
 */
class EmailServiceApp {
    private emailService: EmailService;
    private intervalId: NodeJS.Timeout | null = null;
    private isProcessing = false;
    private shuttingDown = false;

    constructor() {
        this.emailService = new EmailService();
    }

    /**
     * Initialize the email service: connect to the database, verify
     * SMTP connectivity, and compile the latest templates.
     *
     * If SMTP is not configured, initialization is skipped entirely so
     * the process can sit idle (see {@link start}) instead of crashing
     * and being restarted in a loop by the orchestrator.
     */
    async initialize(): Promise<void> {
        logger.info("🚀 Starting Email Service...");

        if (!this.emailService.enabled) {
            logger.error(
                `⛔ Email service is starting in IDLE mode because SMTP is not configured. Missing: ${this.emailService.missingConfig.join(", ")}`
            );
            logger.error("💡 Set the missing variables in your environment and restart the service.");
            return;
        }

        try {
            await connectDb();

            const smtpConnected = await this.emailService.testConnection();
            if (!smtpConnected) {
                logger.warn("⚠️  SMTP connection failed, but service will continue");
                logger.warn("💡 Please check your SMTP configuration in .env file");
            }

            await this.compileTemplates();

            logger.info("✅ Email Service initialized successfully");
        } catch (error) {
            logger.error("❌ Failed to initialize Email Service:", error);
            throw error;
        }
    }

    /**
     * Start the email processing interval. When SMTP is not configured
     * this is a no-op; the caller is expected to keep the process alive
     * (see {@link main}) so the orchestrator does not restart it in a
     * loop.
     */
    start(): void {
        if (!this.emailService.enabled) {
            logger.warn(
                "⏸️  Email service idling; no emails will be processed until SMTP is configured and the service is restarted"
            );
            return;
        }

        const interval = parseInt(process.env.EMAIL_PROCESS_INTERVAL || "60000", 10);

        logger.info(`📅 Starting email processing with ${interval}ms interval`);

        void this.processEmails();

        this.intervalId = setInterval(() => {
            void this.processEmails();
        }, interval);
    }

    /** Whether the underlying SMTP service is configured and active. */
    isEnabled(): boolean {
        return this.emailService.enabled;
    }

    /**
     * Stop the email processing interval, drain any in-flight batch,
     * and close transport / database resources.
     */
    async stop(): Promise<void> {
        if (this.shuttingDown) {
            return;
        }
        this.shuttingDown = true;

        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        await this.drainInflight();

        try {
            this.emailService.close();
        } catch (error) {
            logger.warn("⚠️  Failed to close SMTP transporter cleanly:", error);
        }

        if (this.emailService.enabled) {
            try {
                await sequelize.close();
            } catch (error) {
                logger.warn("⚠️  Failed to close database connection cleanly:", error);
            }
        }

        logger.info("🛑 Email processing stopped");
    }

    /**
     * Wait for any in-flight batch to finish, up to a bounded timeout.
     */
    private async drainInflight(timeoutMs: number = SHUTDOWN_DRAIN_TIMEOUT_MS): Promise<void> {
        if (!this.isProcessing) {
            return;
        }

        logger.info("⏳ Waiting for in-flight email batch to finish...");
        const deadline = Date.now() + timeoutMs;
        while (this.isProcessing && Date.now() < deadline) {
            await new Promise(resolve => setTimeout(resolve, DRAIN_POLL_INTERVAL_MS));
        }
        if (this.isProcessing) {
            logger.warn(`⚠️  In-flight batch still running after ${timeoutMs}ms, continuing shutdown`);
        }
    }

    /**
     * Process emails (with concurrency protection).
     */
    private async processEmails(): Promise<void> {
        if (this.isProcessing) {
            logger.debug("⏳ Email processing already in progress, skipping...");
            return;
        }
        if (this.shuttingDown) {
            return;
        }

        this.isProcessing = true;

        try {
            await this.emailService.processQueuedEmails();
        } catch (error) {
            logger.error("❌ Error during email processing:", error);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Compile and store email templates.
     */
    private async compileTemplates(): Promise<void> {
        const templateCompiler = new TemplateCompiler();
        await templateCompiler.compileAllTemplates();
    }
}

async function main(): Promise<void> {
    const app = new EmailServiceApp();

    const shutdown = async (signal: string): Promise<void> => {
        logger.info(`\n🛑 Received ${signal}, shutting down gracefully...`);
        try {
            await app.stop();
            process.exit(0);
        } catch (error) {
            logger.error("❌ Error during shutdown:", error);
            process.exit(1);
        }
    };

    process.on("SIGINT", () => void shutdown("SIGINT"));
    process.on("SIGTERM", () => void shutdown("SIGTERM"));

    try {
        await app.initialize();
        app.start();

        if (!app.isEnabled()) {
            // SMTP is missing. Keep the process alive without any periodic
            // work so the orchestrator does not see a crash loop. The signal
            // handlers above are the only way out.
            await new Promise<never>(() => {});
        }
    } catch (error) {
        logger.error("❌ Failed to start Email Service:", error);
        await app.stop().catch(() => undefined);
        process.exit(1);
    }
}

if (require.main === module) {
    void main();
}

export default EmailServiceApp;
