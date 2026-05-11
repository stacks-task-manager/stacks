// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";
import BaseEntity from "./Base.js";

class PermissionEntity extends BaseEntity {}

PermissionEntity.initialize(
    {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        owner: { type: DataTypes.UUID, allowNull: false },
        isPublic: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        visibleUsers: { type: DataTypes.JSONB, allowNull: true, defaultValue: [] },
        visibleRoles: { type: DataTypes.JSONB, allowNull: true, defaultValue: [] },
        type: { type: DataTypes.STRING, allowNull: false, defaultValue: "" },
    },
    {
        tableName: "permissions",
        createdAt: "created",
        updatedAt: "updated",
        sequelize,
    }
);

export default PermissionEntity;
