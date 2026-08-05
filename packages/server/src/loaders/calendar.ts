// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Local calendar CRUD operations.
 */
import { Op } from "sequelize";
import { Errors } from "../errors";
import { CalendarEntity, PermissionEntity } from "@stacks/db";
import { findAll, findOne, sanitizeWhere, updateOne, withTransaction } from "./utils";
import { getCurrentUser } from "./context";
import { invalidateApiCacheForCurrentRequest } from "../utils/cache";
import { ICalendar, IPermissions, POLLINGACTIONS, POLLINGTYPE } from "@stacks/types";
import { PermissionsLoader } from "./permissions";
import { sendRealtimeUpdate } from "../events";
import { translate } from "@stacks/translations";

export interface ILocalCalendar {
    id: string;
    title: string;
    color: string | null;
    primary: boolean;
    tenant: string;
    createdBy: string;
    updatedBy: string;
    created: string;
    updated: string;
    deleted: string | null;
    deletedBy: string | null;
    permissions?: IPermissions;
}

CalendarEntity.hasOne(PermissionEntity, { foreignKey: "id", constraints: false });
PermissionEntity.belongsTo(CalendarEntity, { foreignKey: "id", constraints: false });

async function sendCalendarRealtimeUpdate(
    record: string,
    action: POLLINGACTIONS,
    permissions?: IPermissions
) {
    const user = getCurrentUser();
    await sendRealtimeUpdate({
        type: POLLINGTYPE.CALENDAR,
        record,
        action,
        permissions:
            permissions ??
            ({
                id: record,
                owner: user.id,
                type: POLLINGTYPE.CALENDAR,
                isPublic: true,
                visibleUsers: [],
                visibleRoles: [],
            } as IPermissions),
    });
}

function assertCanManageCalendar(calendar: ILocalCalendar) {
    const user = getCurrentUser();
    if (user.admin) return;

    if (calendar.permissions?.owner !== user.id) {
        throw Errors.forbidden(translate("Calendar update not allowed"));
    }
}

async function getAll(): Promise<ILocalCalendar[]> {
    const user = getCurrentUser();
    return findAll<ILocalCalendar>({
        entity: CalendarEntity,
        filter: { tenant: user.tenant, deleted: null, source: "local" },
    });
}

async function getOne(id: string): Promise<ILocalCalendar> {
    const calendar = await findOne({
        entity: CalendarEntity,
        id,
    });
    if (!calendar) {
        throw Errors.notFound(translate("Calendar not found"));
    }
    return calendar as unknown as ILocalCalendar;
}

async function getVisibleLocalCalendarIds(): Promise<string[]> {
    const calendars = await getAll();
    return calendars.map(calendar => calendar.id);
}

function getPrimaryFlag(data: { primary?: boolean; isDefault?: boolean }): boolean {
    return data.primary ?? data.isDefault ?? false;
}

async function create(data: {
    title: string;
    color?: string;
    primary?: boolean;
    isDefault?: boolean;
    isPublic?: boolean;
}): Promise<ILocalCalendar> {
    const user = getCurrentUser();
    const primary = getPrimaryFlag(data);

    return withTransaction(undefined, async transaction => {
        // If setting as default, unset any existing default for this tenant
        if (primary) {
            await CalendarEntity.update(
                { primary: false },
                { where: sanitizeWhere({ tenant: user.tenant, primary: true, deleted: null }), transaction }
            );
        }

        const calendar = await CalendarEntity.create(
            {
                title: data.title,
                color: data.color ?? "#FF8C00", // Default orange color
                primary,
                source: "local",
                readOnly: false,
                tenant: user.tenant,
                createdBy: user.id,
                updatedBy: user.id,
                // Required fields from base entity
                resourceId: user.id, // Using user ID as resourceId for local calendars
                resourceType: "local",
                person: user.id,
                type: "local",
            },
            { transaction }
        );

        const calendarData = calendar.toJSON() as unknown as ILocalCalendar;
        const permissions = await PermissionsLoader.create(
            calendarData.id,
            {
                type: POLLINGTYPE.CALENDAR,
                isPublic: data.isPublic ?? true,
                visibleUsers: [],
                visibleRoles: [],
            },
            transaction
        );

        await sendCalendarRealtimeUpdate(calendarData.id, POLLINGACTIONS.CREATE, permissions);
        invalidateApiCacheForCurrentRequest();
        return { ...calendarData, permissions };
    });
}

async function update(
    id: string,
    data: { title?: string; color?: string; primary?: boolean; isDefault?: boolean }
): Promise<ILocalCalendar> {
    const user = getCurrentUser();
    const calendar = await getOne(id);
    assertCanManageCalendar(calendar);
    const primary = getPrimaryFlag(data);

    // If setting as default, unset any existing default for this tenant
    if (primary) {
        await CalendarEntity.update(
            { primary: false },
            {
                where: sanitizeWhere({
                    tenant: user.tenant,
                    primary: true,
                    deleted: null,
                    id: { [Op.ne]: id },
                }),
            }
        );
    }

    const { isDefault, ...calendarData } = data;
    await updateOne({
        entity: CalendarEntity,
        id,
        data: {
            ...calendarData,
            ...(isDefault != null && data.primary == null ? { primary } : {}),
            updatedBy: user.id,
        },
    });

    invalidateApiCacheForCurrentRequest();
    const updatedCalendar = await getOne(id);
    await sendCalendarRealtimeUpdate(id, POLLINGACTIONS.UPDATE, updatedCalendar.permissions);
    return updatedCalendar;
}

async function remove(id: string): Promise<boolean> {
    const user = getCurrentUser();
    const calendar = await getOne(id);
    assertCanManageCalendar(calendar);

    // Don't allow deleting the default calendar if it's the only one
    const calendars = await getAll();
    if (calendar.primary && calendars.length === 1) {
        throw Errors.badRequest(translate("Cannot delete only default calendar"));
    }

    await updateOne({
        entity: CalendarEntity,
        id,
        data: {
            deleted: new Date(),
            deletedBy: user.id,
        },
    });

    await PermissionsLoader.remove(id);

    // If we deleted the default calendar, make another one default
    if (calendar.primary) {
        const remaining = await CalendarEntity.findAll({
            where: sanitizeWhere({ tenant: user.tenant, deleted: null }),
        });
        if (remaining.length > 0) {
            await CalendarEntity.update(
                { primary: true, updatedBy: user.id },
                { where: sanitizeWhere({ id: remaining[0].id, tenant: user.tenant }) }
            );
        }
    }

    invalidateApiCacheForCurrentRequest();
    await sendCalendarRealtimeUpdate(id, POLLINGACTIONS.DELETED, calendar.permissions);
    return true;
}

const getPrimary = async (): Promise<ICalendar | null> => {
    const user = getCurrentUser();
    const calendars = await findAll<ICalendar>({
        entity: CalendarEntity,
        filter: { tenant: user.tenant, deleted: null, source: "local", primary: true },
    });
    return calendars[0] ?? null;
};

export const CalendarsLoader = {
    getAll,
    getOne,
    getVisibleLocalCalendarIds,
    create,
    update,
    remove,
    getPrimary,
};
