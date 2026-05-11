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

/**
 * True when the server should expose AI chat (API flag + WS handler) and the LLM is configured.
 */
export function isAiChatConfigured(): boolean {
    if (isAiChatKillSwitchOn()) {
        return false;
    }
    const base = envTrim("AI_OPENAI_BASE_URL");
    const model = envTrim("AI_MODEL");
    return Boolean(base && model);
}

export function getAiChatPublicConfig(): { enabled: boolean; model: string | null } {
    return {
        enabled: isAiChatConfigured(),
        model: isAiChatConfigured() ? envTrim("AI_MODEL") : null,
    };
}
