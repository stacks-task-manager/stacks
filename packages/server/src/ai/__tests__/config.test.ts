// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { isAiChatConfigured, isAiChatKillSwitchOn, getNeedleConfidenceThreshold } from "../config";

describe("ai config", () => {
    const env = { ...process.env };

    beforeEach(() => {
        delete process.env.AI_CHAT_ENABLED;
        delete process.env.AI_BASE_URL;
        delete process.env.AI_MODEL;
    });

    afterEach(() => {
        process.env = { ...env };
    });

    it("uses the default threshold for invalid values and accepts 0 through 1", () => {
        for (const value of ["", "NaN", "-1", "1.1", "oops"]) {
            process.env.AI_NEEDLE_CONFIDENCE_THRESHOLD = value;
            expect(getNeedleConfidenceThreshold()).toBe(0.7);
        }
        for (const value of ["0", "0.5", "1"]) {
            process.env.AI_NEEDLE_CONFIDENCE_THRESHOLD = value;
            expect(getNeedleConfidenceThreshold()).toBe(Number(value));
        }
    });
    it("is false when vars missing", () => {
        expect(isAiChatConfigured()).toBe(false);
    });

    it("is true when base URL and model set", () => {
        process.env.AI_BASE_URL = "http://127.0.0.1:1234/v1";
        process.env.AI_MODEL = "test-model";
        expect(isAiChatConfigured()).toBe(true);
    });

    it("is false when kill switch is false string", () => {
        process.env.AI_BASE_URL = "http://127.0.0.1:1234/v1";
        process.env.AI_MODEL = "test-model";
        process.env.AI_CHAT_ENABLED = "false";
        expect(isAiChatConfigured()).toBe(false);
        expect(isAiChatKillSwitchOn()).toBe(true);
    });
});
