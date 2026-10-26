// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Auth sessions: the DB row behind an issued token. The row is the revocation
 * point — logging out, resetting a password, or activating an account marks it,
 * so a token that was already handed to someone else stops working.
 *
 * The raw bearer token is never stored here; only its claims are signed.
 */
import { sequelize, SessionEntity, TenantEntity, UserEntity } from "@stacks/db";
import type { Transaction } from "sequelize";
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
    lifetimeSeconds: number = SESSION_LIFETIME_SECONDS,
    transaction?: Transaction
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

    await SessionEntity.create(
        {
            id: sid,
            userId,
            tenant,
            createdAt: new Date(issuedAt * 1000),
            expiresAt: new Date(expiresAt * 1000),
        },
        { transaction }
    );

    return { sid, token };
}

/**
 * Complete a password login only while the credential that was checked is still
 * current. Holding the user row until the session insert commits serializes this
 * operation with password reset: either reset revokes this session, or the login
 * sees the replacement hash and issues nothing. The user lock is also the first
 * lock taken by credential changes.
 */
export async function issuePasswordSession(
    userId: string,
    checkedPasswordHash: string
): Promise<{ sid: string; token: string } | null> {
    return sequelize.transaction(async transaction => {
        const user = await UserEntity.findByPk(userId, { transaction, lock: transaction.LOCK.UPDATE });
        if (
            !user ||
            user.get("password") !== checkedPasswordHash ||
            user.get("disabled") ||
            user.get("deleted") ||
            user.get("token") ||
            user.get("activationTokenHash")
        ) {
            return null;
        }

        const tenant = await TenantEntity.findByPk(user.get("tenant"), {
            transaction,
        });
        if (!tenant || tenant.get("disabled")) return null;

        return issueSession(userId, String(user.get("tenant")), SESSION_LIFETIME_SECONDS, transaction);
    });
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
