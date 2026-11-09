// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * One OAuth attempt per browser flow. {@link beginOAuthAttempt} is called when the
 * client asks for the authorization URL; the row it writes is the only thing the
 * callback can redeem, so a callback that arrives without the matching state (an
 * unsolicited one, or a replay) has nothing to exchange and cannot link anything.
 *
 * The state value, the browser nonce, and the PKCE verifier are returned once and
 * never read back: the row keeps only hashes for the first two, and the verifier
 * stays server-side. {@link redeemOAuthAttempt} marks the row consumed before the
 * provider is called, so a failed exchange still burns the attempt.
 */
import { OAuthAttemptEntity } from "@stacks/db";
import { createHash, randomBytes } from "node:crypto";
import { hashAccountToken } from "./accountTokens";
import { OAUTH_ATTEMPT_LIFETIME_MS } from "../config/oauthAttempts";

/** Base64url without padding, the encoding the OAuth PKCE parameters use. */
function encodeOpaque(value: Buffer): string {
    return value.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** S256 challenge for a verifier: BASE64URL(SHA-256(verifier)). */
function pkceChallenge(verifier: string): string {
    return encodeOpaque(createHash("sha256").update(verifier).digest());
}

/**
 * Issues the state, browser nonce, and PKCE verifier for one flow and records the
 * attempt they belong to. The caller must hand `state` to the provider and `nonce`
 * to the browser as a cookie; neither value is stored in the clear.
 */
export async function beginOAuthAttempt(
    userId: string,
    tenant: string,
    sid: string
): Promise<{ state: string; nonce: string; challenge: string }> {
    const state = encodeOpaque(randomBytes(32));
    const nonce = encodeOpaque(randomBytes(32));
    const verifier = encodeOpaque(randomBytes(48));

    await OAuthAttemptEntity.create({
        userId,
        tenant,
        sid,
        stateHash: hashAccountToken(state),
        nonceHash: hashAccountToken(nonce),
        codeVerifier: verifier,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + OAUTH_ATTEMPT_LIFETIME_MS),
    });

    return { state, nonce, challenge: pkceChallenge(verifier) };
}

/**
 * Redeems an attempt for the request that is finishing the flow. Every binding is
 * checked before anything is exchanged, and the row is marked consumed atomically,
 * so concurrent callbacks for the same state get exactly one winner.
 */
export async function redeemOAuthAttempt(
    state: string | undefined,
    userId: string,
    tenant: string,
    sid: string,
    nonce: string | undefined
): Promise<{ codeVerifier: string } | null> {
    if (!state || !nonce) {
        return null;
    }

    const attempt = await OAuthAttemptEntity.findOne({
        where: {
            stateHash: hashAccountToken(state),
        },
        attributes: ["id", "userId", "tenant", "sid", "nonceHash", "codeVerifier", "expiresAt", "consumedAt"],
    });

    if (!attempt) {
        return null;
    }

    if (
        String(attempt.get("userId")) !== userId ||
        String(attempt.get("tenant")) !== tenant ||
        String(attempt.get("sid")) !== sid
    ) {
        return null;
    }

    if (hashAccountToken(nonce) !== String(attempt.get("nonceHash"))) {
        return null;
    }

    const expiresAt = attempt.get("expiresAt");
    if (!(expiresAt instanceof Date) || expiresAt.getTime() <= Date.now()) {
        return null;
    }

    const [rowsUpdated] = await OAuthAttemptEntity.update(
        { consumedAt: new Date() },
        {
            where: {
                id: attempt.get("id"),
                consumedAt: null,
            },
        }
    );

    if (rowsUpdated !== 1) {
        return null;
    }

    return { codeVerifier: String(attempt.get("codeVerifier")) };
}
