// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";
import BaseEntity from "./Base.js";

class StackEntity extends BaseEntity {}

StackEntity.initialize(
    {
        title: { type: DataTypes.STRING, allowNull: false },
        project: { type: DataTypes.UUID, allowNull: false },
        collapsed: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false },
        tint: { type: DataTypes.STRING, allowNull: true },
        maxTasks: { type: DataTypes.INTEGER, allowNull: true },
        sorting: { type: DataTypes.STRING, allowNull: true },
        tasksOrder: { type: DataTypes.JSONB, allowNull: true, defaultValue: [] },
    },
    {
        tableName: "stacks",
        sequelize,
    }
);

export default StackEntity;
