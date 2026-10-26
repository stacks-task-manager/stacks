// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../db.js";

/** Atomic shared fixed-window counters. `keyHash` is an HMAC, never a raw subject identifier. */
class RateLimitCounterEntity extends Model {
    declare keyHash: string;
    declare windowStart: number;
    declare hits: number;
    declare expiresAt: Date;
}

RateLimitCounterEntity.init(
    {
        keyHash: { type: DataTypes.STRING(64), primaryKey: true, allowNull: false },
        windowStart: { type: DataTypes.BIGINT, primaryKey: true, allowNull: false },
        hits: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        expiresAt: { type: DataTypes.DATE, allowNull: false },
    },
    {
        sequelize,
        modelName: "RateLimitCounter",
        tableName: "rate_limit_counters",
        timestamps: false,
        indexes: [{ name: "rate_limit_counters_expiry", fields: ["expiresAt"] }],
    }
);

export default RateLimitCounterEntity;
