// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { ICommonBase } from "./common";

export interface IPeople {
    id: string;
    people: IPerson[];
    created?: string;
    updated?: string;
}

export enum PERSONTITLE {
    MR = "mr",
    MRS = "mrs",
    MISS = "miss",
    MS = "ms",
    DR = "dr",
    PROF = "prof",
    REV = "rev",
    JR = "jr",
    SR = "sr",
    NONE = "none",
}

export enum PEOPLE_GENDER {
    MALE = "male",
    FEMALE = "female",
    OTHER = "other",
}

export enum USER_ONLINE_STATUS {
    OFFLINE = "offline",
    ONLINE = "online",
    IDLE = "idle",
}

export interface IPerson extends ICommonBase {
    avatar: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string;
    gender: PEOPLE_GENDER;
    nickname: string | null;
    birthday: Date | null;
    age: string | null;
    title: PERSONTITLE | null;
    jobTitle: string | null;
    company: string | null;
    officePhone: string | null;
    cellPhone: string | null;
    homePhone: string | null;
    fax: string | null;
    address: string | null;
    county: string | null;
    zip: string | null;
    city: string | null;
    country: string | null;
    address2: string | null;
    website: string | null;
    notes: string | null;
    socialTwitter: string | null;
    socialFacebook: string | null;
    socialLinkedin: string | null;
    socialInstagram: string | null;
    socialOther: string | null;
    personalId: string | null;
    userId: string | null;
    tags: string[];
    status?: string;
    role: string;
    real: boolean;
    admin: boolean;
    disabled: boolean;
    token: string | null;
    onlineStatus: USER_ONLINE_STATUS;
    password: string; // used for the online server when registering a new user

    // Hourly rates
    hourlyRates: { [currency: string]: number };

    lastOnline: Date | null;
}

export const PersonTemplate: Partial<IPerson> = {
    gender: PEOPLE_GENDER.OTHER,
};

export interface ICompany {
    id: string;

    // General info
    title: string;
    industry: string | null;
    notes: string | null;
    logo: string | null;
    altCode: string | null;

    // Contacts
    website: string | null;
    email: string | null;
    phone: string | null;
    cell: string | null;
    fax: string | null;

    // Address
    address: string | null;
    county: string | null;
    zip: string | null;
    city: string | null;
    country: string | null;
    address2: string | null;

    // Registered office address
    registeredOfficeAddress: string | null;
    registeredOfficeCounty: string | null;
    registeredOfficeZip: string | null;
    registeredOfficeCity: string | null;
    registeredOfficeCountry: string | null;
    registeredOfficeAddress2: string | null;

    // Billing address
    billingAddress: string | null;
    billingCounty: string | null;
    billingZip: string | null;
    billingCity: string | null;
    billingCountry: string | null;
    billingAddress2: string | null;

    // Shipping address
    shippingAddress: string | null;
    shippingCounty: string | null;
    shippingZip: string | null;
    shippingCity: string | null;
    shippingCountry: string | null;
    shippingAddress2: string | null;

    // Payment & Banking
    payment: string | null;
    vat: string | null;

    created: string;
    updated: string;
}

export enum PEOPLE_GROUPING_TYPE {
    UNGROUPED = "ungrouped",
    COMPANY = "company",
}

export enum PEOPLE_GROUPING_TYPE_ICONS {
    UNGROUPED = "align-justify",
    COMPANY = "building-07",
}

export enum PEOPLE_GROUPING_TYPE_LABELS {
    UNGROUPED = "common.group-ungrouped",
    COMPANY = "common.group-company",
}

export interface PeopleProjects {
    title: string;
    id: string;
    people: string[];
}
