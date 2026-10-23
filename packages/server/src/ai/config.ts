// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * AI chat feature flags and env (OpenAI-compatible local/LAN servers).
 */

/** Reads `process.env[name]` trimmed, or empty string when unset. */

function envTrim(name: string): string {
    const v = process.env[name];
    return typeof v === "string" ? v.trim() : "";
}

export function isAiChatKillSwitchOn(): boolean {
    const v = envTrim("AI_CHAT_ENABLED").toLowerCase();
    return v === "false" || v === "0" || v === "off";
}

export function getLlmConfig() {
    return {
        baseURL: envTrim("AI_BASE_URL") || envTrim("AI_OPENAI_BASE_URL"),
        modelId: envTrim("AI_MODEL"),
        apiKey: envTrim("AI_API_KEY") || envTrim("AI_OPENAI_API_KEY") || "not-needed",
        cacheNamespace: envTrim("AI_PROMPT_CACHE_NAMESPACE") || "stacks",
        cacheMode: envTrim("AI_PROMPT_CACHE_MODE") || "auto",
        cacheRetention: envTrim("AI_PROMPT_CACHE_RETENTION"),
        cacheProtocol: envTrim("AI_PROMPT_CACHE_PROTOCOL") || "auto",
        disableThinking: ["true", "1", "yes", "on"].includes(envTrim("AI_DISABLE_THINKING").toLowerCase()),
    };
}
export function isLlmConfigured() {
    const config = getLlmConfig();
    return Boolean(config.baseURL && config.modelId);
}
export function isAiChatConfigured(): boolean {
    return !isAiChatKillSwitchOn() && isLlmConfigured();
}

export function getAiChatPublicConfig(): { enabled: boolean; model: string | null } {
    return {
        enabled: isAiChatConfigured(),
        model: isAiChatConfigured() ? envTrim("AI_MODEL") : null,
    };
}
