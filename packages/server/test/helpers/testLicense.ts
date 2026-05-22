// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import type { ILicense } from "@stacks/types";
import { LICENSETYPE } from "@stacks/types";

/** Same shape as global setup; Vitest globalSetup runs in another process, so the test worker must inject this too (see vitestSetup.ts). */
export const TEST_LICENSE: ILicense = {
    type: LICENSETYPE.LOCAL,
    tenants: [
        {
            id: "00000000-0000-0000-0000-000000000001",
            name: "Test Tenant",
            expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            seats: 10,
            admins: [
                {
                    firstName: "Cris",
                    lastName: "Test",
                    email: "cris@stacks.rocks",
                    password: "12345678",
                },
            ],
            features: {},
        },
    ],
};
