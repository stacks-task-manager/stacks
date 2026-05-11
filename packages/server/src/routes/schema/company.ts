// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Company create and patch shapes (rich address and billing fields on update).
 */
import { z } from 'zod/v4';

/** Required fields for a new company. */
export const NewCompanySchema = z.object({
    title: z.string(),
});

/** Partial company update; all fields optional. */
export const UpdateCompanySchema = z.object({
    title: z.string().optional(),
    logo: z.string().optional(),

    industry: z.string().optional(),
    notes: z.string().optional(),
    altCode: z.string().optional(),

    // Contacts
    website: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    cell: z.string().optional(),
    fax: z.string().optional(),

    // Address
    address: z.string().optional(),
    county: z.string().optional(),
    zip: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    address2: z.string().optional(),

    // Registered office address
    registeredOfficeAddress: z.string().optional(),
    registeredOfficeCounty: z.string().optional(),
    registeredOfficeZip: z.string().optional(),
    registeredOfficeCity: z.string().optional(),
    registeredOfficeCountry: z.string().optional(),
    registeredOfficeAddress2: z.string().optional(),

    // Billing address
    billingAddress: z.string().optional(),
    billingCounty: z.string().optional(),
    billingZip: z.string().optional(),
    billingCity: z.string().optional(),
    billingCountry: z.string().optional(),
    billingAddress2: z.string().optional(),

    // Shipping address
    shippingAddress: z.string().optional(),
    shippingCounty: z.string().optional(),
    shippingZip: z.string().optional(),
    shippingCity: z.string().optional(),
    shippingCountry: z.string().optional(),
    shippingAddress2: z.string().optional(),

    // Payment & Banking
    payment: z.string().optional(),
    vat: z.string().optional(),
});