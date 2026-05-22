// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";
import BaseEntity from "./Base.js";

class BookmarkEntity extends BaseEntity {}

BookmarkEntity.initialize(
    {
        title: { type: DataTypes.STRING, allowNull: false },
        type: { type: DataTypes.STRING, allowNull: false },
        url: { type: DataTypes.STRING, allowNull: false },
        pinned: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    {
        tableName: "bookmarks",
        sequelize,
    }
);

export default BookmarkEntity;
