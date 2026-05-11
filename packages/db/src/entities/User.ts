// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { DataTypes } from "sequelize";
import { sequelize } from "../db.js"; // Adjust the path based on your project structure
import BaseEntity from "./Base.js";
import { PEOPLE_GENDER, USER_ONLINE_STATUS } from "@stacks/types";

class UserEntity extends BaseEntity {
    declare password: string;
    declare role: string;
    declare tenant: string;
}

UserEntity.init(
    {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        email: { type: DataTypes.STRING, allowNull: false },
        password: { type: DataTypes.STRING, allowNull: false },
        firstName: { type: DataTypes.STRING, allowNull: false },
        lastName: { type: DataTypes.STRING, allowNull: false },
        avatar: { type: DataTypes.STRING, allowNull: true },
        gender: {
            type: DataTypes.ENUM(...Object.values(PEOPLE_GENDER)),
            allowNull: true,
            defaultValue: PEOPLE_GENDER.OTHER,
        },
        nickname: { type: DataTypes.STRING, allowNull: true },
        title: { type: DataTypes.STRING, allowNull: true },
        jobTitle: { type: DataTypes.STRING, allowNull: true },
        company: { type: DataTypes.UUID, allowNull: true },
        officePhone: { type: DataTypes.STRING, allowNull: true },
        cellPhone: { type: DataTypes.STRING, allowNull: true },
        homePhone: { type: DataTypes.STRING, allowNull: true },
        fax: { type: DataTypes.STRING, allowNull: true },
        address: { type: DataTypes.STRING, allowNull: true },
        county: { type: DataTypes.STRING, allowNull: true },
        zip: { type: DataTypes.STRING, allowNull: true },
        city: { type: DataTypes.STRING, allowNull: true },
        country: { type: DataTypes.STRING, allowNull: true },
        address2: { type: DataTypes.STRING, allowNull: true },
        website: { type: DataTypes.STRING, allowNull: true },
        notes: { type: DataTypes.STRING, allowNull: true },
        socialTwitter: { type: DataTypes.STRING, allowNull: true },
        socialFacebook: { type: DataTypes.STRING, allowNull: true },
        socialLinkedin: { type: DataTypes.STRING, allowNull: true },
        socialInstagram: { type: DataTypes.STRING, allowNull: true },
        socialOther: { type: DataTypes.STRING, allowNull: true },
        personalId: { type: DataTypes.STRING, allowNull: true },
        userId: { type: DataTypes.STRING, allowNull: true },
        tags: { type: DataTypes.JSONB, allowNull: true, defaultValue: [] },
        status: { type: DataTypes.STRING, allowNull: true },
        role: { type: DataTypes.UUID, allowNull: false },
        birthday: { type: DataTypes.DATE, allowNull: true },
        hourlyRates: { type: DataTypes.JSONB, allowNull: true, defaultValue: {} },
        tenant: { type: DataTypes.STRING, allowNull: false },
        admin: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false },
        real: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false },
        onlineStatus: { type: DataTypes.ENUM(...Object.values(USER_ONLINE_STATUS)), allowNull: true },
        disabled: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false },
        system: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false },
        token: { type: DataTypes.STRING, allowNull: true, defaultValue: null },
        oauthTokens: { type: DataTypes.JSONB, allowNull: true, defaultValue: {} },
        deletedBy: { type: DataTypes.UUID, allowNull: true },
        lastOnline: { type: DataTypes.DATE, allowNull: true },
        created: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: false },
        updated: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: false },
        deleted: { type: DataTypes.DATE, allowNull: true },
    },
    {
        tableName: "users",
        createdAt: "created",
        updatedAt: "updated",
        sequelize,
        indexes: [
            {
                unique: true,
                fields: ["email", "tenant"],
            },
        ],
    }
);

export default UserEntity;
