// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { CalendarEntity, PermissionEntity, UserEntity } from "@stacks/db";
import { getLicense } from "@stacks/license";
import { POLLINGTYPE } from "@stacks/types";

const ensureCalendarPermission = async (calendar: any, owner: string) => {
    const calendarData = typeof calendar.toJSON === "function" ? calendar.toJSON() : calendar;
    const existing = await PermissionEntity.findOne({
        where: {
            id: calendarData.id,
            tenant: calendarData.tenant,
            deleted: null,
        },
    });

    if (existing) return;

    await PermissionEntity.create({
        id: calendarData.id,
        owner,
        isPublic: true,
        visibleUsers: [],
        visibleRoles: [],
        type: POLLINGTYPE.CALENDAR,
        tenant: calendarData.tenant,
        createdBy: calendarData.createdBy ?? owner,
        updatedBy: calendarData.updatedBy ?? owner,
    });
};

/**
 * Seeds the database with default calendars for each tenant if they don't exist
 */
export const seedCalendars = async () => {
    const license = getLicense();

    // Find the system user
    const systemUsers = await UserEntity.findAll({
        where: {
            system: true,
        },
    });

    if (systemUsers.length === 0) {
        console.log("⚠️ No system user found, skipping calendar seeding");
        return;
    }

    const systemUser = systemUsers[0].toJSON();

    for (const tenant of license.tenants) {
        try {
            // Check if tenant has any calendars
            const calendarResults = await CalendarEntity.findAll({
                where: {
                    tenant: tenant.id,
                    deleted: null,
                },
            });

            if (calendarResults.length === 0) {
                console.log(`➡️ Creating default calendar for tenant: ${tenant.name}`);

                // Find first admin user for this tenant to use as creator
                const adminUser = await UserEntity.findOne({
                    where: {
                        tenant: tenant.id,
                        admin: true,
                    },
                });

                const creator = adminUser ? adminUser.toJSON() : systemUser;

                const calendar = await CalendarEntity.create({
                    title: "Local Calendar",
                    color: "#FF8C00",
                    primary: true,
                    source: "local",
                    tenant: tenant.id,
                    createdBy: creator.id,
                    updatedBy: creator.id,
                });
                await ensureCalendarPermission(calendar, creator.id);

                console.log(`✅ Default calendar created for tenant: ${tenant.name}`);
            } else {
                await Promise.all(
                    calendarResults
                        .filter(calendar => calendar.get("source") === "local")
                        .map(calendar =>
                            ensureCalendarPermission(calendar, String(calendar.get("createdBy")))
                        )
                );

                // Check if there's a default calendar
                const hasDefault = calendarResults.some(calendar => calendar.get("primary") === true);

                if (!hasDefault) {
                    console.log(`➡️ Setting first calendar as default for tenant: ${tenant.name}`);

                    // Set the first calendar as default
                    const firstCalendar = calendarResults[0];
                    await CalendarEntity.update(
                        { primary: true, updatedBy: systemUser.id },
                        { where: { id: firstCalendar.id, tenant: tenant.id } }
                    );

                    console.log(`✅ First calendar set as default for tenant: ${tenant.name}`);
                }
            }
        } catch (error) {
            console.error(`❌ Error seeding calendar for tenant ${tenant.name}:`, error);
        }
    }

    console.log("✅ Calendar seeding completed");
};
