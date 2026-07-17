// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";
import BaseEntity from "./Base.js";

class CalendarEntity extends BaseEntity { }

CalendarEntity.initialize(
    {
        title: { type: DataTypes.STRING, allowNull: true },
        color: { type: DataTypes.STRING, allowNull: true },
        primary: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        source: { type: DataTypes.STRING, allowNull: false, defaultValue: "local" },
        readOnly: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    {
        tableName: "calendars",
        sequelize,
    }
);

export default CalendarEntity;
