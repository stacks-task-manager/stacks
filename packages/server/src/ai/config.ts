// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * AI chat feature flags and env (OpenAI-compatible local/LAN servers).
 */

/** Reads `process.env[name]` trimmed, or empty string when unset. */
import { isNeedleReady } from "./needle/runtime";

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
    };
}
export function isLlmConfigured() {
    const config = getLlmConfig();
    return Boolean(config.baseURL && config.modelId);
}
export function isAiChatConfigured(): boolean {
    return !isAiChatKillSwitchOn() && (isNeedleReady() || isLlmConfigured());
}

export function getAiChatPublicConfig(): { enabled: boolean; model: string | null } {
    return {
        enabled: isAiChatConfigured(),
        model: isAiChatConfigured() ? envTrim("AI_MODEL") : null,
    };
}

/** Unscored proposals require confirmation; all calls retain grounding and Zod checks. */
export function getNeedleConfidenceThreshold(): number {
    const raw = envTrim("AI_NEEDLE_CONFIDENCE_THRESHOLD");
    const value = Number(raw);
    return raw && Number.isFinite(value) && value >= 0 && value <= 1 ? value : 0.7;
}
