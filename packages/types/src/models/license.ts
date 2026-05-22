// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
export enum LICENSETYPE {
    LOCAL = "local",
    SERVER = "server",
}

export interface ILicenseAdmin {
    firstName: string;
    lastName: string;
    email: string;
    password?: string;
}

export interface ILicenseFeatures {
    [key: string]: boolean;
}

export interface ILicenseTenant {
    id: string;
    name: string;
    expiry?: string;
    seats: number;
    admins: ILicenseAdmin[];
    features?: ILicenseFeatures;
}

export interface ILicense {
    tenants: ILicenseTenant[];
    type?: LICENSETYPE;
}
