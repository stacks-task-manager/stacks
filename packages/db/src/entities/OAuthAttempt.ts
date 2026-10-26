// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../db.js";

/**
 * Server-only record of one Google OAuth flow. A row is created when the browser
 * asks for the authorization URL and is consumed once by the callback that
 * finishes the flow, so an unsolicited or replayed callback has nothing to redeem.
 *
 * The state value and the browser nonce are never stored as issued: only their
 * hashes are, so a leaked row cannot be replayed. `codeVerifier` stays server-side
 * (PKCE) and is never returned by any public API.
 */
class OAuthAttemptEntity extends Model {
    declare id: string;
    declare userId: string;
    declare tenant: string;
    declare sid: string;
    declare stateHash: string;
    declare nonceHash: string;
    declare codeVerifier: string;
    declare createdAt: Date;
    declare expiresAt: Date;
    declare consumedAt?: Date;
}

OAuthAttemptEntity.init(
    {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        userId: { type: DataTypes.UUID, allowNull: false },
        tenant: { type: DataTypes.UUID, allowNull: false },
        sid: { type: DataTypes.UUID, allowNull: false },
        stateHash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
        nonceHash: { type: DataTypes.STRING(64), allowNull: false },
        codeVerifier: { type: DataTypes.TEXT, allowNull: false },
        createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        expiresAt: { type: DataTypes.DATE, allowNull: false },
        consumedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
        sequelize,
        modelName: "OAuthAttempt",
        tableName: "oauth_attempts",
        timestamps: false,
    }
);

export default OAuthAttemptEntity;
