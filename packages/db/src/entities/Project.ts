// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";
import BaseEntity from "./Base.js";

class ProjectEntity extends BaseEntity {}

ProjectEntity.initialize(
    {
        description: { type: DataTypes.TEXT, allowNull: true },
        notes: { type: DataTypes.TEXT, allowNull: true },
        startDate: { type: DataTypes.DATE, allowNull: true },
        endDate: { type: DataTypes.DATE, allowNull: true },
        health: { type: DataTypes.STRING, allowNull: true },
        company: { type: DataTypes.UUID, allowNull: true },
        projectOwner: { type: DataTypes.UUID, allowNull: true },
        approvers: { type: DataTypes.JSONB, allowNull: true, defaultValue: [] },
        automations: { type: DataTypes.JSONB, allowNull: true, defaultValue: [] },
        currency: { type: DataTypes.STRING, allowNull: true, defaultValue: "USD" },
        hourlyRate: { type: DataTypes.FLOAT, allowNull: true, defaultValue: 0 },
        fields: { type: DataTypes.JSONB, allowNull: true, defaultValue: [] },
        backgroundUrl: { type: DataTypes.STRING, allowNull: true, defaultValue: "" },
        includeSubtasks: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false },
        estimate: { type: DataTypes.INTEGER, allowNull: true },
        stacksOrder: { type: DataTypes.JSONB, allowNull: true, defaultValue: [] },
    },
    {
        tableName: "projects",
        createdAt: "created",
        updatedAt: "updated",
        sequelize,
    }
);

export default ProjectEntity;
