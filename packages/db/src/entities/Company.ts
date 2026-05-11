// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";
import BaseEntity from "./Base.js";

class CompanyEntity extends BaseEntity {}

CompanyEntity.initialize(
    {
        title: { type: DataTypes.STRING, allowNull: false },
        industry: { type: DataTypes.STRING, allowNull: true },
        notes: { type: DataTypes.STRING, allowNull: true },
        altCode: { type: DataTypes.STRING, allowNull: true },
        logo: { type: DataTypes.STRING, allowNull: true },

        // Contacts
        website: { type: DataTypes.STRING, allowNull: true },
        email: { type: DataTypes.STRING, allowNull: true },
        phone: { type: DataTypes.STRING, allowNull: true },
        cell: { type: DataTypes.STRING, allowNull: true },
        fax: { type: DataTypes.STRING, allowNull: true },

        // Address
        address: { type: DataTypes.STRING, allowNull: true },
        county: { type: DataTypes.STRING, allowNull: true },
        zip: { type: DataTypes.STRING, allowNull: true },
        city: { type: DataTypes.STRING, allowNull: true },
        country: { type: DataTypes.STRING, allowNull: true },
        address2: { type: DataTypes.STRING, allowNull: true },

        // Registered office address
        registeredOfficeAddress: { type: DataTypes.STRING, allowNull: true },
        registeredOfficeCounty: { type: DataTypes.STRING, allowNull: true },
        registeredOfficeZip: { type: DataTypes.STRING, allowNull: true },
        registeredOfficeCity: { type: DataTypes.STRING, allowNull: true },
        registeredOfficeCountry: { type: DataTypes.STRING, allowNull: true },
        registeredOfficeAddress2: { type: DataTypes.STRING, allowNull: true },

        // Billing address
        billingAddress: { type: DataTypes.STRING, allowNull: true },
        billingCounty: { type: DataTypes.STRING, allowNull: true },
        billingZip: { type: DataTypes.STRING, allowNull: true },
        billingCity: { type: DataTypes.STRING, allowNull: true },
        billingCountry: { type: DataTypes.STRING, allowNull: true },
        billingAddress2: { type: DataTypes.STRING, allowNull: true },

        // Shipping address
        shippingAddress: { type: DataTypes.STRING, allowNull: true },
        shippingCounty: { type: DataTypes.STRING, allowNull: true },
        shippingZip: { type: DataTypes.STRING, allowNull: true },
        shippingCity: { type: DataTypes.STRING, allowNull: true },
        shippingCountry: { type: DataTypes.STRING, allowNull: true },
        shippingAddress2: { type: DataTypes.STRING, allowNull: true },

        // Payment & Banking
        payment: { type: DataTypes.STRING, allowNull: true },
        vat: { type: DataTypes.STRING, allowNull: true },
    },
    {
        tableName: "companies",

        sequelize,
    }
);

export default CompanyEntity;
