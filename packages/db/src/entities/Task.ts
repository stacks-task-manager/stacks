// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";
import BaseEntity from "./Base.js";

class TaskEntity extends BaseEntity {}

TaskEntity.initialize(
    {
        title: { type: DataTypes.TEXT, allowNull: false },
        description: { type: DataTypes.TEXT, allowNull: true },
        project: { type: DataTypes.UUID, allowNull: false },
        stack: { type: DataTypes.UUID, allowNull: false },
        startdate: { type: DataTypes.DATE, allowNull: true },
        duedate: { type: DataTypes.DATE, allowNull: true },
        dodate: { type: DataTypes.DATE, allowNull: true },
        cover: { type: DataTypes.STRING, allowNull: true },
        done: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false },
        estimate: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
        progress: { type: DataTypes.INTEGER, allowNull: true },
        hourlyRate: { type: DataTypes.FLOAT, allowNull: true, defaultValue: null },
        priority: {
            type: DataTypes.ENUM("critical", "high", "medium", "low", "none"),
            allowNull: true,
            defaultValue: "none",
        },
        parent: { type: DataTypes.STRING, allowNull: true },
        subtasksOrder: { type: DataTypes.JSONB, allowNull: true, defaultValue: [] },
        sprint: { type: DataTypes.STRING, allowNull: true },
        tint: { type: DataTypes.STRING, allowNull: true },
        dependencies: { type: DataTypes.JSONB, allowNull: true, defaultValue: [] },
        assignees: { type: DataTypes.JSONB, allowNull: true, defaultValue: [] },
        tags: { type: DataTypes.JSONB, allowNull: true, defaultValue: [] },
        status: { type: DataTypes.UUID, allowNull: true },
        repeats: { type: DataTypes.JSONB, allowNull: true },
        links: { type: DataTypes.JSONB, allowNull: true, defaultValue: [] },
        locations: { type: DataTypes.JSONB, allowNull: true, defaultValue: [] },
        timeSpent: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
        completed: { type: DataTypes.DATE, allowNull: true },
        archived: { type: DataTypes.DATE, allowNull: true },
    },
    {
        tableName: "tasks",
        sequelize,
    }
);

export default TaskEntity;
