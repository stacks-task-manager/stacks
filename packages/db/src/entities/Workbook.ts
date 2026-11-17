// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";
import BaseEntity from "./Base.js";

class WorkbookEntity extends BaseEntity {}

WorkbookEntity.initialize(
    {
        title: { type: DataTypes.STRING, allowNull: false },
        filters: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    },
    {
        tableName: "workbooks",
        sequelize,
    }
);

export default WorkbookEntity;
