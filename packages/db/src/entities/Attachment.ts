// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";
import BaseEntity from "./Base.js";
import { FILES_TYPE } from "@stacks/types";

class AttachmentEntity extends BaseEntity {}

AttachmentEntity.initialize(
    {
        fileId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: "files",
                key: "id",
            },
        },
        recordId: {
            type: DataTypes.UUID,
            allowNull: false,
            comment: "Polymorphic reference to tasks, notepads, or documents",
        },

        hasPreview: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        originalName: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        type: {
            type: DataTypes.ENUM(...Object.values(FILES_TYPE)),
            allowNull: false,
            defaultValue: "file",
        },
    },
    {
        tableName: "attachments",
        createdAt: "created",
        updatedAt: "updated",
        sequelize,
    }
);

export default AttachmentEntity;
