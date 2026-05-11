// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";
import BaseEntity from "./Base.js";

class TenantEntity extends BaseEntity {}

TenantEntity.init(
    {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        title: { type: DataTypes.STRING, allowNull: false },
        description: { type: DataTypes.STRING, allowNull: true },
        disabled: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false },
        expiry: { type: DataTypes.DATE, allowNull: false },
        created: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: false },
        updated: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: false },
    },
    {
        tableName: "tenants",
        createdAt: "created",
        updatedAt: "updated",
        sequelize,
    }
);

export default TenantEntity;
