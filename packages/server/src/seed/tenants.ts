// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { isBefore } from "date-fns";
import { getLicense } from "@stacks/license";
import { TenantEntity } from "@stacks/db";

export const seedTenants = async () => {
    const license = getLicense();

    try {
        /**
         * ------------------
         * TENANTS EXPIRY CHECK
         * ------------------
         */
        for (const tenant of license.tenants) {
            const { id, name, expiry } = tenant;
            if (!expiry) {
                console.log(`⚠️  Tenant ${name} has no expiry, skipping expiry check`);
                continue;
            }
            const isExpired = isBefore(expiry, new Date());
            if (isExpired) {
                console.log(`❌ Tenant ${name} is expired on: ${expiry}`);
                console.log(`🚨 Disabling tenant ${name}`);

                await TenantEntity.update(
                    {
                        disabled: true,
                    },
                    {
                        where: {
                            id: tenant.id,
                        },
                        returning: false,
                    }
                );
            } else {
                console.log(`✅ Tenant ${name} is valid until: ${expiry}`);
            }
        }
    } catch (error) {
        console.log("❌ Error verifying tenants:", error);
    }
};
