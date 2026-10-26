// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../db.js";

/** A bounded active-work slot; its key is an HMAC and expired leases are reclaimable. */
class RateLimitLeaseEntity extends Model {
    declare id: string;
    declare keyHash: string;
    declare expiresAt: Date;
}

RateLimitLeaseEntity.init(
    {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        keyHash: { type: DataTypes.STRING(64), allowNull: false },
        expiresAt: { type: DataTypes.DATE, allowNull: false },
    },
    {
        sequelize,
        modelName: "RateLimitLease",
        tableName: "rate_limit_leases",
        timestamps: false,
        indexes: [
            { name: "rate_limit_leases_key_expiry", fields: ["keyHash", "expiresAt"] },
            { name: "rate_limit_leases_expiry", fields: ["expiresAt"] },
        ],
    }
);

export default RateLimitLeaseEntity;
