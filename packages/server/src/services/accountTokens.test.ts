import { describe, expect, it } from "vitest";
import { createEmailChangeToken, EMAIL_CHANGE_TOKEN_TTL_MS, hashAccountToken } from "./accountTokens";

describe("email change tokens", () => {
    it("creates a unique random token while retaining only its hash and a bounded expiry", () => {
        const first = createEmailChangeToken();
        const second = createEmailChangeToken();

        expect(first.token).toMatch(/^[0-9a-f]{64}$/);
        expect(first.token).not.toBe(second.token);
        expect(first.hash).toBe(hashAccountToken(first.token));
        expect(first.hash).not.toBe(first.token);
        expect(first.expiresAt.getTime()).toBeGreaterThan(Date.now());
        expect(first.expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + EMAIL_CHANGE_TOKEN_TTL_MS);
    });
});
