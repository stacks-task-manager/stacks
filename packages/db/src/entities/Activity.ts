// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";
import BaseEntity from "./Base.js";

class ActivityEntity extends BaseEntity {}

ActivityEntity.initialize(
    {
        resourceId: { type: DataTypes.UUID, allowNull: false },
        resourceType: { type: DataTypes.STRING, allowNull: false },
        parent: { type: DataTypes.UUID, allowNull: true },
        title: { type: DataTypes.TEXT, allowNull: true },
        person: { type: DataTypes.UUID, allowNull: false },
        content: { type: DataTypes.TEXT, allowNull: true },
        type: { type: DataTypes.STRING, allowNull: false },
        change: { type: DataTypes.JSONB, allowNull: true, defaultValue: {} },
    },
    {
        tableName: "activities",
        sequelize,
    }
);

export default ActivityEntity;
