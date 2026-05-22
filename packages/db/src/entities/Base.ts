// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { DataTypes, Model, type InitOptions, type ModelAttributes } from "sequelize";

class BaseEntity extends Model {
    declare id: number;
    declare createdAt: Date;
    declare updatedAt: Date;

    public toJSON() {
        const values = Object.assign({}, this.get()); // Get all attributes

        for (const key in values) {
            if (values.hasOwnProperty(key) && values[key] === null) {
                values[key] = undefined;
            }
        }

        return values;
    }

    // Override the init method to automatically add base attributes
    static initialize(attributes: ModelAttributes, options: InitOptions) {
        const firstAttributes = {
            id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        };

        const baseAttributes = {
            tenant: { type: DataTypes.UUID, allowNull: false },
            createdBy: { type: DataTypes.UUID, allowNull: false },
            updatedBy: { type: DataTypes.UUID, allowNull: false },
            deletedBy: { type: DataTypes.UUID, allowNull: true },
            created: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: false },
            updated: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: false },
            deleted: { type: DataTypes.DATE, allowNull: true },
        };

        const baseOptions = {
            createdAt: "created",
            updatedAt: "updated",
        };

        // Merge base attributes with child attributes
        const mergedAttributes = { ...firstAttributes, ...attributes, ...baseAttributes };
        const mergedOptions = { ...options, ...baseOptions };

        return super.init(mergedAttributes, mergedOptions);
    }
}

export default BaseEntity;
