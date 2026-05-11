// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";
import BaseEntity from "./Base.js";
import { NOTIFICATION_RECORD_TYPE } from "@stacks/types";

class NotificationEntity extends BaseEntity {}

NotificationEntity.initialize(
    {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        subject: { type: DataTypes.STRING, allowNull: false },
        message: { type: DataTypes.TEXT, allowNull: true },
        recipient: { type: DataTypes.UUID, allowNull: false },
        recordId: { type: DataTypes.UUID, allowNull: true },
        recordType: {
            type: DataTypes.ENUM(...Object.values(NOTIFICATION_RECORD_TYPE)),
            allowNull: true,
        },
        data: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
        read: { type: DataTypes.BOOLEAN, defaultValue: false, allowNull: true },
        readOn: { type: DataTypes.DATE, allowNull: true },
    },
    {
        tableName: "notifications",
        createdAt: "created",
        sequelize,
    }
);

export default NotificationEntity;
