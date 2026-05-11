// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";
import BaseEntity from "./Base.js";
import { RECORDTYPE } from "@stacks/types";

class DocumentEntity extends BaseEntity {}

DocumentEntity.initialize(
    {
        title: { type: DataTypes.STRING, allowNull: false },
        parent: { type: DataTypes.UUID, allowNull: true, defaultValue: null },
        type: { type: DataTypes.ENUM(...Object.values(RECORDTYPE)), allowNull: false },
        tint: { type: DataTypes.STRING, allowNull: true },
        order: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
        archived: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
    },
    {
        tableName: "documents",
        sequelize,
    }
);

export default DocumentEntity;
