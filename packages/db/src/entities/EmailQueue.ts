// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../db.js";

import { EMAIL_TEMPLATES } from "@stacks/types";

class EmailQueue extends Model {
    declare id: number;
    declare userId: string;
    declare template: EMAIL_TEMPLATES;
    declare data: object;
    declare status: "pending" | "sent" | "failed";
    declare sentAt?: Date;
    declare failureReason?: string;
    declare retryCount: number;
    declare scheduledAt?: Date;
    declare locale: string;
    declare createdAt: Date;
    declare updatedAt: Date;
}

EmailQueue.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        template: {
            type: DataTypes.STRING(50),
            allowNull: false,
            comment: "Template name (e.g., welcome, password-reset, notification)",
        },
        data: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: {},
        },
        status: {
            type: DataTypes.ENUM("pending", "sent", "failed"),
            allowNull: false,
            defaultValue: "pending",
        },
        sentAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        failureReason: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        retryCount: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        scheduledAt: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: DataTypes.NOW,
        },
        locale: {
            type: DataTypes.STRING(5),
            allowNull: false,
            defaultValue: "en",
        },
        created: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        updated: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        deleted: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        sequelize,
        modelName: "EmailQueue",
        tableName: "email_queue",
        timestamps: true,
        createdAt: "created",
        updatedAt: "updated",
    }
);

// Define associations

// Note: No longer using database template associations
// emailTemplateId now stores template names directly

export default EmailQueue;
