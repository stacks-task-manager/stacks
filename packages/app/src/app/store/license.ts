// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Client license info from boot.
 */
import { ILicense } from "@stacks/types";
import { entity } from "app/hooks/store";

export const LicenseStore = entity<ILicense | null>(null);
