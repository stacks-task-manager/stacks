// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";
import BaseEntity from "./Base.js";

class EventEntity extends BaseEntity {}

EventEntity.initialize(
    {
        title: { type: DataTypes.STRING, allowNull: false },
        description: { type: DataTypes.STRING, allowNull: true },
        start: { type: DataTypes.DATE, allowNull: false },
        end: { type: DataTypes.DATE, allowNull: false },
        allDay: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false },
        assignees: { type: DataTypes.JSONB, allowNull: true, defaultValue: [] },
    },
    {
        tableName: "events",
        sequelize,
    }
);

export default EventEntity;
