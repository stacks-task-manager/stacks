// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";
import BaseEntity from "./Base.js";

class RoleEntity extends BaseEntity {}

RoleEntity.initialize(
    {
        title: { type: DataTypes.STRING, allowNull: false },
        description: { type: DataTypes.STRING, allowNull: true },
        access: { type: DataTypes.JSON, allowNull: false, defaultValue: {} },
        disabled: { type: DataTypes.BOOLEAN, defaultValue: false, allowNull: false },
    },
    {
        tableName: "roles",
        sequelize,
    }
);

export default RoleEntity;
