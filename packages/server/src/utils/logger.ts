// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Context } from "hono";
import { getClientIP as resolveRequestClientIp } from "./clientIp";

/**
 * Log levels enum
 */
export enum LogLevel {
    ERROR = 0,
    WARN = 1,
    INFO = 2,
    DEBUG = 3,
    TRACE = 4,
}

/**
 * Log entry interface
 */
interface LogEntry {
    timestamp: string;
    level: string;
    message: string;
    requestId?: string;
    userId?: string;
    method?: string;
    path?: string;
    statusCode?: number;
    duration?: number;
    error?: {
        name: string;
        message: string;
        stack?: string;
    };
    metadata?: Record<string, any>;
}

/**
 * Logger configuration
 */
interface LoggerConfig {
    level: LogLevel;
    format: "json" | "text";
    includeTimestamp: boolean;
    includeStack: boolean;
    colorize: boolean;
    outputs: LogOutput[];
}

/**
 * Log output interface
 */
interface LogOutput {
    type: "console" | "file" | "http";
    config?: {
        filePath?: string;
        url?: string;
        headers?: Record<string, string>;
    };
}

/**
 * Enhanced logger utility class
 */
export class Logger {
    private static config: LoggerConfig = {
        level: LogLevel.INFO,
        format: "json",
        includeTimestamp: true,
        includeStack: true,
        colorize: process.env.NODE_ENV !== "production",
        outputs: [{ type: "console" }],
    };

    private static colors = {
        ERROR: "\x1b[31m", // Red
        WARN: "\x1b[33m", // Yellow
        INFO: "\x1b[36m", // Cyan
        DEBUG: "\x1b[35m", // Magenta
        TRACE: "\x1b[37m", // White
        RESET: "\x1b[0m",
    };

    /**
     * Configure logger
     */
    static configure(config: Partial<LoggerConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Log error message
     */
    static error(message: string, error?: Error, metadata?: Record<string, any>, context?: Context): void {
        if (this.config.level >= LogLevel.ERROR) {
            this.log(LogLevel.ERROR, message, { error, metadata, context });
        }
    }

    /**
     * Log warning message
     */
    static warn(message: string, metadata?: Record<string, any>, context?: Context): void {
        if (this.config.level >= LogLevel.WARN) {
            this.log(LogLevel.WARN, message, { metadata, context });
        }
    }

    /**
     * Log info message
     */
    static info(message: string, metadata?: Record<string, any>, context?: Context): void {
        if (this.config.level >= LogLevel.INFO) {
            this.log(LogLevel.INFO, message, { metadata, context });
        }
    }

    /**
     * Log debug message
     */
    static debug(message: string, metadata?: Record<string, any>, context?: Context): void {
        if (this.config.level >= LogLevel.DEBUG) {
            this.log(LogLevel.DEBUG, message, { metadata, context });
        }
    }

    /**
     * Log trace message
     */
    static trace(message: string, metadata?: Record<string, any>, context?: Context): void {
        if (this.config.level >= LogLevel.TRACE) {
            this.log(LogLevel.TRACE, message, { metadata, context });
        }
    }

    /**
     * Log HTTP request
     */
    static request(context: Context, duration?: number): void {
        const requestId = context.get("requestId");
        const user = context.get("user");

        this.info("HTTP Request", {
            method: context.req.method,
            path: context.req.path,
            userAgent: context.req.header("User-Agent"),
            ip: this.getClientIP(context),
            duration,
            requestId,
            userId: user?.id,
        });
    }

    /**
     * Log HTTP response
     */
    static response(context: Context, statusCode: number, duration: number): void {
        const requestId = context.get("requestId");
        const user = context.get("user");
        const level = statusCode >= 500 ? LogLevel.ERROR : statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;

        const message = `HTTP Response ${statusCode}`;

        if (this.config.level >= level) {
            this.log(level, message, {
                metadata: {
                    method: context.req.method,
                    path: context.req.path,
                    statusCode,
                    duration,
                    requestId,
                    userId: user?.id,
                },
                context,
            });
        }
    }

    /**
     * Log database query
     */
    static query(sql: string, duration: number, requestId?: string): void {
        if (this.config.level >= LogLevel.DEBUG) {
            this.log(LogLevel.DEBUG, "Database Query", {
                metadata: {
                    sql: sql.substring(0, 200) + (sql.length > 200 ? "..." : ""),
                    duration,
                    requestId,
                },
            });
        }
    }

    /**
     * Log slow query warning
     */
    static slowQuery(sql: string, duration: number, threshold: number = 1000, requestId?: string): void {
        if (duration > threshold) {
            this.warn("Slow Database Query Detected", {
                sql: sql.substring(0, 200) + (sql.length > 200 ? "..." : ""),
                duration,
                threshold,
                requestId,
            });
        }
    }

    /**
     * Log authentication events
     */
    static auth(
        event: "login" | "logout" | "register" | "failed_login",
        userId?: string,
        metadata?: Record<string, any>,
        context?: Context
    ): void {
        const level = event === "failed_login" ? LogLevel.WARN : LogLevel.INFO;

        if (this.config.level >= level) {
            this.log(level, `Authentication: ${event}`, {
                metadata: {
                    event,
                    userId,
                    ip: context ? this.getClientIP(context) : undefined,
                    userAgent: context?.req.header("User-Agent"),
                    ...metadata,
                },
                context,
            });
        }
    }

    /**
     * Log security events
     */
    static security(
        event: string,
        severity: "low" | "medium" | "high" | "critical",
        metadata?: Record<string, any>,
        context?: Context
    ): void {
        const level =
            severity === "critical" || severity === "high"
                ? LogLevel.ERROR
                : severity === "medium"
                ? LogLevel.WARN
                : LogLevel.INFO;

        if (this.config.level >= level) {
            this.log(level, `Security Event: ${event}`, {
                metadata: {
                    event,
                    severity,
                    ip: context ? this.getClientIP(context) : undefined,
                    userAgent: context?.req.header("User-Agent"),
                    timestamp: new Date().toISOString(),
                    ...metadata,
                },
                context,
            });
        }
    }

    /**
     * Log performance metrics
     */
    static performance(
        metric: string,
        value: number,
        unit: string = "ms",
        metadata?: Record<string, any>,
        context?: Context
    ): void {
        if (this.config.level >= LogLevel.DEBUG) {
            this.log(LogLevel.DEBUG, `Performance: ${metric}`, {
                metadata: {
                    metric,
                    value,
                    unit,
                    requestId: context?.get("requestId"),
                    ...metadata,
                },
                context,
            });
        }
    }

    /**
     * Core logging method
     */
    private static log(
        level: LogLevel,
        message: string,
        options: {
            error?: Error;
            metadata?: Record<string, any>;
            context?: Context;
        } = {}
    ): void {
        const { error, metadata, context } = options;

        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level: LogLevel[level],
            message,
            requestId: context?.get("requestId"),
            userId: context?.get("user")?.id,
            method: context?.req.method,
            path: context?.req.path,
            metadata,
        };

        if (error) {
            entry.error = {
                name: error.name,
                message: error.message,
                stack: this.config.includeStack ? error.stack : undefined,
            };
        }

        // Output to configured outputs
        for (const output of this.config.outputs) {
            this.writeToOutput(entry, output);
        }
    }

    /**
     * Write log entry to output
     */
    private static writeToOutput(entry: LogEntry, output: LogOutput): void {
        const formatted = this.formatEntry(entry);

        switch (output.type) {
            case "console":
                this.writeToConsole(formatted, entry.level);
                break;
            case "file":
                this.writeToFile(formatted, output.config?.filePath);
                break;
            case "http":
                this.writeToHttp(entry, output.config);
                break;
        }
    }

    /**
     * Format log entry
     */
    private static formatEntry(entry: LogEntry): string {
        if (this.config.format === "json") {
            return JSON.stringify(entry);
        } else {
            const timestamp = this.config.includeTimestamp ? `[${entry.timestamp}] ` : "";
            const level = `[${entry.level}]`;
            const requestId = entry.requestId ? ` [${entry.requestId}]` : "";
            const metadata = entry.metadata ? ` ${JSON.stringify(entry.metadata)}` : "";
            const error = entry.error
                ? ` Error: ${entry.error.message}${entry.error.stack ? "\n" + entry.error.stack : ""}`
                : "";

            return `${timestamp}${level}${requestId} ${entry.message}${metadata}${error}`;
        }
    }

    /**
     * Write to console with colors
     */
    private static writeToConsole(formatted: string, level: string): void {
        if (this.config.colorize) {
            const color = this.colors[level as keyof typeof this.colors] || this.colors.RESET;
            console.log(`${color}${formatted}${this.colors.RESET}`);
        } else {
            console.log(formatted);
        }
    }

    /**
     * Write to file (placeholder - would need file system implementation)
     */
    private static writeToFile(formatted: string, filePath?: string): void {
        // In a real implementation, this would write to a file
        // For now, just log to console with file indicator
        console.log(`[FILE:${filePath}] ${formatted}`);
    }

    /**
     * Write to HTTP endpoint (placeholder)
     */
    private static writeToHttp(
        entry: LogEntry,
        config?: { url?: string; headers?: Record<string, string> }
    ): void {
        // In a real implementation, this would send HTTP request
        // For now, just log to console with HTTP indicator
        console.log(`[HTTP:${config?.url}] ${JSON.stringify(entry)}`);
    }

    /**
     * Get client IP address from context
     */
    private static getClientIP(context: Context): string {
        return resolveRequestClientIp(context);
    }

    /**
     * Create child logger with additional context
     */
    static child(metadata: Record<string, any>) {
        return {
            error: (
                message: string,
                error?: Error,
                additionalMetadata?: Record<string, any>,
                context?: Context
            ) => this.error(message, error, { ...metadata, ...additionalMetadata }, context),
            warn: (message: string, additionalMetadata?: Record<string, any>, context?: Context) =>
                this.warn(message, { ...metadata, ...additionalMetadata }, context),
            info: (message: string, additionalMetadata?: Record<string, any>, context?: Context) =>
                this.info(message, { ...metadata, ...additionalMetadata }, context),
            debug: (message: string, additionalMetadata?: Record<string, any>, context?: Context) =>
                this.debug(message, { ...metadata, ...additionalMetadata }, context),
            trace: (message: string, additionalMetadata?: Record<string, any>, context?: Context) =>
                this.trace(message, { ...metadata, ...additionalMetadata }, context),
        };
    }

    /**
     * Get current log level
     */
    static getLevel(): LogLevel {
        return this.config.level;
    }

    /**
     * Set log level
     */
    static setLevel(level: LogLevel): void {
        this.config.level = level;
    }

    /**
     * Check if level is enabled
     */
    static isLevelEnabled(level: LogLevel): boolean {
        return this.config.level >= level;
    }
}

/**
 * Logging middleware for Hono
 */
export const loggingMiddleware = () => {
    return async (c: Context, next: Function) => {
        const startTime = Date.now();

        // Log incoming request
        Logger.request(c);

        try {
            await next();

            // Log successful response
            const duration = Date.now() - startTime;
            Logger.response(c, c.res.status, duration);
        } catch (error) {
            // Log error response
            const duration = Date.now() - startTime;
            Logger.error(
                "Request failed",
                error as Error,
                {
                    method: c.req.method,
                    path: c.req.path,
                    duration,
                },
                c
            );

            throw error;
        }
    };
};

/**
 * Structured logging utilities
 */
export class StructuredLogger {
    /**
     * Log with structured data
     */
    static log(level: LogLevel, event: string, data: Record<string, any>, context?: Context): void {
        const message = `Event: ${event}`;

        switch (level) {
            case LogLevel.ERROR:
                Logger.error(message, undefined, data, context);
                break;
            case LogLevel.WARN:
                Logger.warn(message, data, context);
                break;
            case LogLevel.INFO:
                Logger.info(message, data, context);
                break;
            case LogLevel.DEBUG:
                Logger.debug(message, data, context);
                break;
            case LogLevel.TRACE:
                Logger.trace(message, data, context);
                break;
        }
    }

    /**
     * Log business event
     */
    static business(event: string, data: Record<string, any>, context?: Context): void {
        this.log(LogLevel.INFO, `business.${event}`, data, context);
    }

    /**
     * Log system event
     */
    static system(event: string, data: Record<string, any>, context?: Context): void {
        this.log(LogLevel.INFO, `system.${event}`, data, context);
    }

    /**
     * Log audit event
     */
    static audit(event: string, data: Record<string, any>, context?: Context): void {
        this.log(
            LogLevel.INFO,
            `audit.${event}`,
            {
                ...data,
                timestamp: new Date().toISOString(),
                auditTrail: true,
            },
            context
        );
    }
}

/**
 * Export default logger instance
 */
export default Logger;
