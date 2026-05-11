// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";
import BaseEntity from "./Base.js";

class ReminderEntity extends BaseEntity {}

ReminderEntity.init(
    {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        title: { type: DataTypes.STRING, allowNull: false },
        subtitle: { type: DataTypes.STRING, allowNull: true },
        recordId: { type: DataTypes.UUID, allowNull: false },
        recordType: { type: DataTypes.STRING, allowNull: false },
        date: { type: DataTypes.DATE, allowNull: false },
        delivered: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: false },
        tenant: { type: DataTypes.STRING, allowNull: false },
        createdBy: { type: DataTypes.STRING, allowNull: false },
        deletedBy: { type: DataTypes.UUID, allowNull: true },
        created: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: false },
        updated: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: false },
        deleted: { type: DataTypes.DATE, allowNull: true },
    },
    {
        tableName: "reminders",
        createdAt: "created",
        sequelize,
    }
);

export default ReminderEntity;
