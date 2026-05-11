// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
type Level = "debug" | "info" | "warn" | "error";

const LEVELS: Record<Level, number> = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
};

function resolveLevel(): Level {
    const raw = (process.env.LOG_LEVEL || "info").toLowerCase();
    if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") {
        return raw;
    }
    return "info";
}

const minLevel = LEVELS[resolveLevel()];

function shouldLog(level: Level): boolean {
    return LEVELS[level] >= minLevel;
}

function format(level: Level, args: unknown[]): unknown[] {
    const ts = new Date().toISOString();
    return [`[${ts}] [${level.toUpperCase()}]`, ...args];
}

export const logger = {
    debug(...args: unknown[]): void {
        if (shouldLog("debug")) {
            console.log(...format("debug", args));
        }
    },
    info(...args: unknown[]): void {
        if (shouldLog("info")) {
            console.log(...format("info", args));
        }
    },
    warn(...args: unknown[]): void {
        if (shouldLog("warn")) {
            console.warn(...format("warn", args));
        }
    },
    error(...args: unknown[]): void {
        if (shouldLog("error")) {
            console.error(...format("error", args));
        }
    },
};

export default logger;
