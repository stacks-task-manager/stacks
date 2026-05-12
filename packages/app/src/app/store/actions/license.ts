// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Refresh license from boot/API.
 */
import { ILicense } from "@stacks/types";
import { LicenseStore } from "../license";

export const setLicense = (license: ILicense) => {
    LicenseStore.set(license);
};

export const LicenseActions = {
    setLicense,
};
