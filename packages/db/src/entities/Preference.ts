// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";
import BaseEntity from "./Base.js";

class PreferenceEntity extends BaseEntity {}

PreferenceEntity.initialize(
    {
        userId: { type: DataTypes.UUID, allowNull: false },
        preferences: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    },
    {
        tableName: "preferences",
        sequelize,
    }
);

export default PreferenceEntity;
