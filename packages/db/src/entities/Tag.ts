// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";
import BaseEntity from "./Base.js";
import { TAGSECTION, TAGTYPE } from "@stacks/types";

class TagEntity extends BaseEntity {}

TagEntity.initialize(
    {
        title: { type: DataTypes.STRING, allowNull: false },
        color: { type: DataTypes.STRING, allowNull: false },
        section: { type: DataTypes.ENUM(...Object.values(TAGSECTION)), allowNull: false },
        type: { type: DataTypes.ENUM(...Object.values(TAGTYPE)), allowNull: false },
        parent: { type: DataTypes.UUID, allowNull: true },
    },
    {
        tableName: "tags",
        sequelize,
    }
);

export default TagEntity;
