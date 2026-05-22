// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";
import BaseEntity from "./Base.js";
import { REPORT_TYPE } from "@stacks/types";

class ReportEntity extends BaseEntity {}

ReportEntity.initialize(
    {
        project: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        data: {
            type: DataTypes.JSONB,
            allowNull: false,
        },
        type: {
            type: DataTypes.ENUM(...Object.values(REPORT_TYPE)),
            allowNull: false,
        },
    },
    {
        tableName: "reports",
        createdAt: "created",
        sequelize,
    }
);

export default ReportEntity;
