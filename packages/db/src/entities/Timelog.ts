// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";
import BaseEntity from "./Base.js";
import { TIMELOG_STATUS } from "@stacks/types";

class TimelogEntity extends BaseEntity {}

TimelogEntity.initialize(
    {
        description: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        date: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        duration: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        billable: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false,
        },
        billed: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false,
        },
        person: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        project: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        task: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        status: {
            type: DataTypes.ENUM(...Object.values(TIMELOG_STATUS)),
            allowNull: true,
            defaultValue: TIMELOG_STATUS.PENDING,
        },
        approvedBy: {
            type: DataTypes.UUID,
            allowNull: true,
            defaultValue: null,
        },
        approvedOn: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: null,
        },
        rejectReason: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: null,
        },
    },
    {
        tableName: "timelogs",
        createdAt: "created",
        sequelize,
    }
);

export default TimelogEntity;
