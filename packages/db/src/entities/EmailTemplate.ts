// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { DataTypes } from "sequelize";
import BaseEntity from "./Base.js";
import { sequelize } from "../db.js";

class EmailTemplate extends BaseEntity {
    declare templateType: string;
    declare tenant: string;
    declare subject: string;
    declare body: string;
    declare isActive: boolean;
    declare description?: string;
    declare locale: string;
}

EmailTemplate.init(
    {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        templateType: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        tenant: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        subject: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        body: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        locale: {
            type: DataTypes.STRING(5),
            allowNull: false,
            defaultValue: "en",
        },
        created: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: false },
        updated: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: false },
    },
    {
        indexes: [
            {
                unique: true,
                fields: ["templateType", "tenant", "locale"],
            },
        ],
        sequelize,
        modelName: "EmailTemplate",
        tableName: "email_templates",
        createdAt: "created",
        updatedAt: "updated",
    }
);

export default EmailTemplate;
