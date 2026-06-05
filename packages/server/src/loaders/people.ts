// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Directory users: birthday filters, profile updates, invites with seat limits.
 */
import { UserEntity } from "@stacks/db";
import { Errors } from "../errors";
import { IPerson, ROLE_SECTIONS } from "@stacks/types";
import * as bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { formatISO9075, parseISO } from "date-fns";
import { fn, literal, Op, Transaction, where, type WhereOptions } from "sequelize";
import { invalidateApiCacheForCurrentRequest } from "../utils/cache";
import { canWrite, getCurrentUser, getTenantLicense } from "./context";
import { RolesLoader } from "./roles";
import { sanitizeWhere } from "./utils";
import { translate } from "@stacks/translations";

/**
 * Filters accepted by {@link getAll}. All fields are optional and AND-composed;
 * omit everything to get the full non-system directory.
 *
 * Text filters (`query`, `jobTitle`, `company`, `city`, `country`) are
 * case-insensitive substring matches. `roleTitle` is resolved by looking up
 * role ids whose title contains the value (see the role-id subquery in
 * {@link getAll}), so the caller doesn't need to know role UUIDs.
 *
 * Presence filters (`hasEmail`, `hasCellPhone`, `hasOfficePhone`) use
 * `true` → column is non-empty, `false` → column is NULL or empty.
 *
 * `birthdayMonth` is independent of `span`/`date` and filters purely by
 * calendar month (1-12).
 */
interface PeopleFilters {
    from?: string;
    to?: string;
    query?: string;
    jobTitle?: string;
    company?: string;
    city?: string;
    country?: string;
    roleTitle?: string;
    hasEmail?: boolean;
    hasCellPhone?: boolean;
    hasOfficePhone?: boolean;
    birthdayMonth?: number;
    /** `false` → only active users, `true` → only deactivated, omit → all. */
    disabled?: boolean;
    /** Cap on returned rows (server still orders by firstName/lastName). */
    limit?: number;
}

function iLikeContains(value: string): Record<symbol, string> {
    return { [Op.iLike]: `%${value}%` };
}

/** Build the presence condition for a text column. */
function presenceClause(column: string, flag: boolean): object {
    if (flag) {
        return {
            [Op.and]: [{ [column]: { [Op.ne]: null } }, { [column]: { [Op.ne]: "" } }],
        };
    }
    return { [Op.or]: [{ [column]: { [Op.is]: null } }, { [column]: "" }] };
}

/**
 * Build the Sequelize `where` clause from {@link PeopleFilters}. Extracted so
 * `getAll` and `getAllWithCount` share one source of truth for the filter
 * semantics. Returns `null` when a filter provably matches nothing (e.g. a
 * `roleTitle` that resolves to zero roles) so callers can short-circuit.
 */
async function buildWhereClause(filters: PeopleFilters): Promise<WhereOptions | null> {
    const andClauses: unknown[] = [{ system: false }];

    if (filters.from && filters.to) {
        const fromDate = parseISO(filters.from);
        const toDate = parseISO(filters.to);

        const fromMonth = fromDate.getMonth() + 1;
        const toMonth = toDate.getMonth() + 1;
        const fromDay = fromDate.getDate();
        const toDay = toDate.getDate();

        andClauses.push({
            [Op.and]: [
                where(fn("EXTRACT", literal(`MONTH FROM "birthday"`)), { [Op.gte]: fromMonth }),
                where(fn("EXTRACT", literal(`DAY FROM "birthday"`)), { [Op.gte]: fromDay }),
                where(fn("EXTRACT", literal(`MONTH FROM "birthday"`)), { [Op.lte]: toMonth }),
                where(fn("EXTRACT", literal(`DAY FROM "birthday"`)), { [Op.lte]: toDay }),
            ],
        });
    }

    if (filters.query && filters.query.length) {
        andClauses.push({
            [Op.or]: [
                { firstName: iLikeContains(filters.query) },
                { lastName: iLikeContains(filters.query) },
                { email: iLikeContains(filters.query) },
            ],
        });
    }

    if (filters.jobTitle) {
        andClauses.push({ jobTitle: iLikeContains(filters.jobTitle) });
    }
    if (filters.company) {
        andClauses.push({ company: iLikeContains(filters.company) });
    }
    if (filters.city) {
        andClauses.push({ city: iLikeContains(filters.city) });
    }
    if (filters.country) {
        andClauses.push({ country: iLikeContains(filters.country) });
    }

    if (filters.roleTitle) {
        // Resolve role titles to ids once, then `IN`-filter users. Roles are a
        // small table (usually <20 rows), so this extra query is cheap and
        // keeps the main SQL simple (no JOIN or correlated subquery).
        const needle = filters.roleTitle.toLowerCase();
        const matchingRoles = await RolesLoader.getAll();
        const roleIds = matchingRoles
            .filter(r => r.title.toLowerCase().includes(needle))
            .map(r => r.id);
        if (roleIds.length === 0) {
            return null;
        }
        andClauses.push({ role: { [Op.in]: roleIds } });
    }

    if (filters.hasEmail !== undefined) {
        andClauses.push(presenceClause("email", filters.hasEmail));
    }
    if (filters.hasCellPhone !== undefined) {
        andClauses.push(presenceClause("cellPhone", filters.hasCellPhone));
    }
    if (filters.hasOfficePhone !== undefined) {
        andClauses.push(presenceClause("officePhone", filters.hasOfficePhone));
    }

    if (filters.birthdayMonth !== undefined) {
        andClauses.push(literal(`EXTRACT(MONTH FROM "birthday") = ${filters.birthdayMonth}`));
    }

    if (filters.disabled !== undefined) {
        andClauses.push({ disabled: filters.disabled });
    }

    return sanitizeWhere({ [Op.and]: andClauses }) as WhereOptions;
}

function stripPassword(user: Record<string, unknown>): IPerson {
    const { password: _password, ...rest } = user;
    return rest as unknown as IPerson;
}

/** Lists non-system people; all {@link PeopleFilters} are composed with AND. */
async function getAll(filters: PeopleFilters): Promise<IPerson[]> {
    const whereClause = await buildWhereClause(filters);
    if (whereClause === null) {
        return [];
    }

    const users = await UserEntity.findAll({
        where: whereClause,
        order: [
            ["firstName", "ASC"],
            ["lastName", "ASC"],
        ],
        ...(filters.limit !== undefined ? { limit: filters.limit } : {}),
    });

    return users.map(u => stripPassword(u.toJSON()));
}

/**
 * Same filters as {@link getAll}, but returns the unbounded match count
 * alongside the (possibly limited) rows — in one round trip via Sequelize's
 * `findAndCountAll`. Use this when the caller needs to distinguish
 * "this is the full set" from "this is a page of a larger set"
 * (e.g. the AI directory search reporting `truncated`).
 */
async function getAllWithCount(filters: PeopleFilters): Promise<{ total: number; rows: IPerson[] }> {
    const whereClause = await buildWhereClause(filters);
    if (whereClause === null) {
        return { total: 0, rows: [] };
    }

    const { count, rows } = await UserEntity.findAndCountAll({
        where: whereClause,
        order: [
            ["firstName", "ASC"],
            ["lastName", "ASC"],
        ],
        ...(filters.limit !== undefined ? { limit: filters.limit } : {}),
    });

    return { total: count, rows: rows.map(u => stripPassword(u.toJSON())) };
}

/** Loads one person without password hash; optional transaction for nested writes. */
const getOne = async (id: string, extTransaction?: Transaction) => {
    const userData = await UserEntity.findOne({
        where: sanitizeWhere({
            id,
            system: false,
        }),
        transaction: extTransaction,
    });

    if (!userData) {
        throw Errors.notFound(translate("User not found or deactivated"));
    }

    const { password, ...rest } = userData?.toJSON();
    return rest;
};

/** Enforces admin/self rules, optional role change validation, then PATCHes the row. */
const update = async (id: string, updateData: any) => {
    const user = getCurrentUser();
    const targetUserData = await getOne(id);

    const isAdmin = user.admin;
    const isTargetUserReal = targetUserData.real;
    const isTargetUserDisabled = targetUserData.disabled;
    const isSelfUpdate = user.id === id;

    // Access control logic
    const isUnauthorized = (isTargetUserReal && !isSelfUpdate) || isTargetUserDisabled;
    if (isUnauthorized && !isAdmin) {
        throw Errors.forbidden(translate("User not authorized"));
    }

    if (updateData.role != null) {
        if (!isAdmin) {
            throw Errors.forbidden(translate("User not authorized"));
        }

        const role = await RolesLoader.getOne(updateData.role);
        if (!role) {
            throw Errors.notFound(translate("Role not found"));
        }
    }

    const [affectedRows] = await UserEntity.update(
        { ...updateData, updatedBy: user.id },
        {
            where: { id },
            returning: false, // Optimize for performance
        }
    );

    invalidateApiCacheForCurrentRequest();
    return affectedRows > 0;
};

type NewUser = Pick<IPerson, "email" | "firstName" | "lastName" | "gender" | "real" | "role">;

/** Creates or revives a soft-deleted user subject to license seats and permissions. */
const create = async (data: NewUser) => {
    const user = getCurrentUser();
    const canCreatePerson = canWrite(ROLE_SECTIONS.PEOPLE);

    if ((data.real && !user.admin) || !canCreatePerson) {
        throw Errors.forbidden(translate("User not authorized"));
    }

    const license = getTenantLicense();

    const { count } = await UserEntity.findAndCountAll({
        where: {
            tenant: user.tenant,
            deleted: {
                [Op.not]: null,
            },
        },
    });

    if (count >= (license?.seats ?? 0)) {
        throw Errors.badRequest(translate("Tenant seats exceeded"));
    }

    const oldUser = await UserEntity.findOne({
        where: {
            email: data.email,
        },
    });

    const salt = await bcrypt.genSalt(10);
    const password = await bcrypt.hash(randomUUID(), salt);

    if (oldUser) {
        if (oldUser.get("deleted")) {
            // if the user was previously deleted
            // undelete it and return the user
            await UserEntity.update(
                {
                    ...data,
                    password,
                    tenant: user.tenant,
                    deleted: null,
                    updatedBy: user.id,
                    deletedBy: null,
                },
                {
                    where: { id: oldUser.get("id") },
                }
            );

            const { password: pwd, deleted, ...person } = oldUser.toJSON();
            invalidateApiCacheForCurrentRequest();
            return person;
        } else {
            throw Errors.badRequest(translate("User email already exists"));
        }
    }

    const newUser = await UserEntity.create({
        ...data,
        password,
        tenant: user.tenant,
        createdBy: user.id,
        updatedBy: user.id,
    });
    const { password: pwd, ...person } = newUser.toJSON();
    invalidateApiCacheForCurrentRequest();
    return person;
};

export const PeopleLoader = {
    getAll,
    getAllWithCount,
    getOne,
    update,
    create,
};
