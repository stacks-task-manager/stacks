// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../db.js";

/**
 * Server-only auth sessions. A row records that a user was issued a session; the
 * bearer token itself is never stored here (only its claims are signed into the
 * JWT the client keeps). `revokedAt` is set by logout, password reset, or
 * activation rather than deleting the row, so a stolen token replay is refused.
 */
class SessionEntity extends Model {
    declare id: string;
    declare userId: string;
    declare tenant: string;
    declare createdAt: Date;
    declare expiresAt: Date;
    declare revokedAt?: Date;
}

SessionEntity.init(
    {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        userId: { type: DataTypes.UUID, allowNull: false },
        tenant: { type: DataTypes.UUID, allowNull: false },
        createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        expiresAt: { type: DataTypes.DATE, allowNull: false },
        revokedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
        sequelize,
        modelName: "Session",
        tableName: "auth_sessions",
        timestamps: false,
        indexes: [
            {
                name: "auth_sessions_by_user",
                fields: ["userId"],
            },
        ],
    }
);

export default SessionEntity;
