// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Auth sessions: the DB row behind an issued token. The row is the revocation
 * point — logging out, resetting a password, or activating an account marks it,
 * so a token that was already handed to someone else stops working.
 *
 * The raw bearer token is never stored here; only its claims are signed.
 */
import { SessionEntity } from "@stacks/db";
import { sign } from "hono/jwt";
import { randomUUID } from "node:crypto";
import { SESSION_AUDIENCE, SESSION_ISSUER, SESSION_LIFETIME_SECONDS } from "../config/session";
import { getJwtSecret } from "../config/secrets";

/**
 * Issues a session and the token that carries it. `lifetimeSeconds` defaults to
 * the policy lifetime; tests pass a short one to exercise expiry.
 */
export async function issueSession(
    userId: string,
    tenant: string,
    lifetimeSeconds: number = SESSION_LIFETIME_SECONDS
): Promise<{ sid: string; token: string }> {
    const sid = randomUUID();
    const issuedAt = Math.floor(Date.now() / 1000);
    const expiresAt = issuedAt + lifetimeSeconds;

    const token = await sign(
        {
            uid: userId,
            sid,
            iat: issuedAt,
            exp: expiresAt,
            iss: SESSION_ISSUER,
            aud: SESSION_AUDIENCE,
        },
        getJwtSecret()
    );

    await SessionEntity.create({
        id: sid,
        userId,
        tenant,
        createdAt: new Date(issuedAt * 1000),
        expiresAt: new Date(expiresAt * 1000),
    });

    return { sid, token };
}

/**
 * Narrow session check: the row must exist, belong to this account, not be
 * revoked, and not be past its own expiry. It never loads the user or tenant —
 * the account policy stays in {@link resolveAccountState}.
 */
export async function sessionStillValid(sid: string, uid: string): Promise<boolean> {
    const session = await SessionEntity.findOne({
        where: {
            id: sid,
            userId: uid,
        },
        attributes: ["id", "expiresAt", "revokedAt"],
    });

    if (!session) {
        return false;
    }
    if (session.get("revokedAt")) {
        return false;
    }

    const expiresAt = session.get("expiresAt");
    return expiresAt instanceof Date && expiresAt.getTime() > Date.now();
}

/** Marks one session revoked. Returns whether a row was changed. */
export async function revokeSession(sid: string, transaction?: any): Promise<boolean> {
    const [rowsUpdated] = await SessionEntity.update(
        { revokedAt: new Date() },
        {
            where: {
                id: sid,
                revokedAt: null,
            },
            ...(transaction === undefined ? {} : { transaction }),
        }
    );
    return rowsUpdated > 0;
}

/**
 * Marks every live session of a user revoked. Returns how many were changed.
 * Pass a transaction to bind the revocation to a credential change.
 */
export async function revokeAllUserSessions(userId: string, transaction?: any): Promise<number> {
    const [rowsUpdated] = await SessionEntity.update(
        { revokedAt: new Date() },
        {
            where: {
                userId,
                revokedAt: null,
            },
            ...(transaction === undefined ? {} : { transaction }),
        }
    );
    return rowsUpdated;
}
