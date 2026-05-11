// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";
import BaseEntity from "./Base.js";

class NotepadEntity extends BaseEntity {}

NotepadEntity.initialize(
    {
        content: { type: DataTypes.TEXT, allowNull: true, defaultValue: "" },
        cover: { type: DataTypes.STRING, allowNull: true },
    },
    {
        tableName: "notepads",
        createdAt: "created",
        updatedAt: "updated",
        sequelize,
    }
);

export default NotepadEntity;
