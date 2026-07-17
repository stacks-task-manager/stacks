// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Local calendar CRUD operations.
 */
import { Op } from "sequelize";
import { Errors } from "../errors";
import { CalendarEntity } from "@stacks/db";
import { sanitizeWhere } from "./utils";
import { getCurrentUser } from "./context";
import { invalidateApiCacheForCurrentRequest } from "../utils/cache";
import { ICalendar } from "@stacks/types";

export interface ILocalCalendar {
    id: string;
    title: string;
    color: string | null;
    isDefault: boolean;
    tenant: string;
    createdBy: string;
    updatedBy: string;
    created: string;
    updated: string;
    deleted: string | null;
    deletedBy: string | null;
}

async function getAll(): Promise<ILocalCalendar[]> {
    const user = getCurrentUser();
    const calendars = await CalendarEntity.findAll({
        where: sanitizeWhere({ tenant: user.tenant, deleted: null }),
    });
    return calendars as unknown as ILocalCalendar[];
}

async function getOne(id: string): Promise<ILocalCalendar> {
    const user = getCurrentUser();
    const calendar = await CalendarEntity.findOne({
        where: sanitizeWhere({ id, tenant: user.tenant, deleted: null }),
    });
    if (!calendar) {
        throw Errors.notFound("Calendar not found");
    }
    return calendar as unknown as ILocalCalendar;
}

async function create(data: { title: string; color?: string; isDefault?: boolean }): Promise<ILocalCalendar> {
    const user = getCurrentUser();

    // If setting as default, unset any existing default for this tenant
    if (data.isDefault) {
        await CalendarEntity.update(
            { isDefault: false },
            { where: sanitizeWhere({ tenant: user.tenant, isDefault: true, deleted: null }) }
        );
    }

    const calendar = await CalendarEntity.create({
        title: data.title,
        color: data.color ?? "#FF8C00", // Default orange color
        isDefault: data.isDefault ?? false,
        tenant: user.tenant,
        createdBy: user.id,
        updatedBy: user.id,
        // Required fields from base entity
        resourceId: user.id, // Using user ID as resourceId for local calendars
        resourceType: "local",
        person: user.id,
        type: "local",
    });

    invalidateApiCacheForCurrentRequest();
    return calendar.toJSON() as unknown as ILocalCalendar;
}

async function update(id: string, data: { title?: string; color?: string; isDefault?: boolean }): Promise<ILocalCalendar> {
    const user = getCurrentUser();
    const calendar = await getOne(id);

    // If setting as default, unset any existing default for this tenant
    if (data.isDefault) {
        await CalendarEntity.update(
            { isDefault: false },
            { where: sanitizeWhere({ tenant: user.tenant, isDefault: true, deleted: null, id: { [Op.ne]: id } }) }
        );
    }

    const [affectedCount] = await CalendarEntity.update(
        { ...data, updatedBy: user.id },
        { where: sanitizeWhere({ id, tenant: user.tenant }) }
    );

    if (affectedCount === 0) {
        throw Errors.notFound("Calendar not found");
    }

    invalidateApiCacheForCurrentRequest();
    return getOne(id);
}

async function remove(id: string): Promise<boolean> {
    const user = getCurrentUser();
    const calendar = await getOne(id);

    // Don't allow deleting the default calendar if it's the only one
    const calendars = await getAll();
    if (calendar.isDefault && calendars.length === 1) {
        throw Errors.badRequest("Cannot delete the only default calendar");
    }

    const [affectedCount] = await CalendarEntity.update(
        {
            deleted: new Date(),
            deletedBy: user.id,
        },
        { where: sanitizeWhere({ id, tenant: user.tenant }) }
    );

    if (affectedCount === 0) {
        throw Errors.notFound("Calendar not found");
    }

    // If we deleted the default calendar, make another one default
    if (calendar.isDefault) {
        const remaining = await CalendarEntity.findAll({
            where: sanitizeWhere({ tenant: user.tenant, deleted: null }),
        });
        if (remaining.length > 0) {
            await CalendarEntity.update(
                { isDefault: true, updatedBy: user.id },
                { where: sanitizeWhere({ id: remaining[0].id, tenant: user.tenant }) }
            );
        }
    }

    invalidateApiCacheForCurrentRequest();
    return true;
}

const getPrimary = async (): Promise<ICalendar | null> => {
    const user = getCurrentUser();
    return await CalendarEntity.findOne({
        where: sanitizeWhere({ tenant: user.tenant, deleted: null, primary: true }),
        raw: true,
    }) as ICalendar | null;
}

export const CalendarsLoader = {
    getAll,
    getOne,
    create,
    update,
    remove,
    getPrimary
};