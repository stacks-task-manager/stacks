import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ create: vi.fn() }));

vi.mock("@stacks/db", () => ({ OAuthAttemptEntity: { create: mocks.create } }));
vi.mock("node:crypto", async importOriginal => {
    const actual = await importOriginal<typeof import("node:crypto")>();
    return {
        ...actual,
        randomBytes: vi.fn((size: number) => Buffer.alloc(size, 0xff)),
    };
});

import { beginOAuthAttempt } from "./oauthAttempts";

describe("OAuth PKCE values", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.create.mockResolvedValue(undefined);
    });

    it("uses unpadded base64url for state, nonce, verifier, and challenge", async () => {
        const attempt = await beginOAuthAttempt("user-1", "tenant-1", "session-1");
        const stored = mocks.create.mock.calls[0][0];

        expect(attempt.state).toMatch(/^[A-Za-z0-9_-]+$/);
        expect(attempt.nonce).toMatch(/^[A-Za-z0-9_-]+$/);
        expect(stored.codeVerifier).toMatch(/^[A-Za-z0-9_-]+$/);
        expect(attempt.challenge).toMatch(/^[A-Za-z0-9_-]+$/);
        expect(attempt.state).toContain("_");
        expect(stored.codeVerifier).toContain("_");
        expect(attempt.challenge).toBe(createHash("sha256").update(stored.codeVerifier).digest("base64url"));
    });
});
