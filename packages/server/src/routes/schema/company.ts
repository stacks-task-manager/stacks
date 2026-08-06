// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Company create and patch shapes (rich address and billing fields on update).
 */
import { z } from "zod/v4";

const NullableStringSchema = z.string().nullable().optional();

/** Required fields for a new company. */
export const NewCompanySchema = z.object({
    title: z.string(),
});

/** Partial company update; all fields optional. */
export const UpdateCompanySchema = z.object({
    title: z.string().optional(),
    logo: NullableStringSchema,

    industry: NullableStringSchema,
    notes: NullableStringSchema,
    altCode: NullableStringSchema,

    // Contacts
    website: NullableStringSchema,
    email: NullableStringSchema,
    phone: NullableStringSchema,
    cell: NullableStringSchema,
    fax: NullableStringSchema,

    // Address
    address: NullableStringSchema,
    county: NullableStringSchema,
    zip: NullableStringSchema,
    city: NullableStringSchema,
    country: NullableStringSchema,
    address2: NullableStringSchema,

    // Registered office address
    registeredOfficeAddress: NullableStringSchema,
    registeredOfficeCounty: NullableStringSchema,
    registeredOfficeZip: NullableStringSchema,
    registeredOfficeCity: NullableStringSchema,
    registeredOfficeCountry: NullableStringSchema,
    registeredOfficeAddress2: NullableStringSchema,

    // Billing address
    billingAddress: NullableStringSchema,
    billingCounty: NullableStringSchema,
    billingZip: NullableStringSchema,
    billingCity: NullableStringSchema,
    billingCountry: NullableStringSchema,
    billingAddress2: NullableStringSchema,

    // Shipping address
    shippingAddress: NullableStringSchema,
    shippingCounty: NullableStringSchema,
    shippingZip: NullableStringSchema,
    shippingCity: NullableStringSchema,
    shippingCountry: NullableStringSchema,
    shippingAddress2: NullableStringSchema,

    // Payment & Banking
    payment: NullableStringSchema,
    vat: NullableStringSchema,
});
