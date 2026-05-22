// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";
import BaseEntity from "./Base.js";

class FileEntity extends BaseEntity {}

FileEntity.initialize(
    {
        hash: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        mimeType: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        size: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
    },
    {
        tableName: "files",
        createdAt: "created",
        updatedAt: "updated",
        sequelize,
    }
);

export default FileEntity;
