// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Directory users: birthday filters, profile updates, invites with seat limits.
 */
import { sequelize, UserEntity } from "@stacks/db";
import { Errors } from "../errors";
import { IPerson, ROLE_SECTIONS } from "@stacks/types";
import * as bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { formatISO9075, parseISO } from "date-fns";
import { fn, literal, Op, Transaction, where, type WhereOptions } from "sequelize";
import { invalidateApiCacheForCurrentRequest } from "../utils/cache";
import { toPublicPerson } from "../utils/publicPerson";
import { canWrite, getCurrentUser, getTenantLicense } from "./context";
import { CompaniesLoader } from "./companies";
import { RolesLoader } from "./roles";
import { sanitizeWhere } from "./utils";
import { translate } from "@stacks/translations";
import { createActivationToken } from "../services/accountTokens";
import { revokeAllUserSessions } from "../services/sessions";

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
        const roleIds = matchingRoles.filter(r => r.title.toLowerCase().includes(needle)).map(r => r.id);
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
        andClauses.push(where(fn("EXTRACT", literal(`MONTH FROM "birthday"`)), filters.birthdayMonth));
    }

    if (filters.disabled !== undefined) {
        andClauses.push({ disabled: filters.disabled });
    }

    return sanitizeWhere({ [Op.and]: andClauses }) as WhereOptions;
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

    return users.map(u => toPublicPerson(u.toJSON()));
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

    return { total: count, rows: rows.map(u => toPublicPerson(u.toJSON())) };
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

    return toPublicPerson(userData.toJSON());
};

/** Enforces admin/self rules, optional role change validation, then PATCHes the row. */
const update = async (id: string, updateData: any) => {
    const user = getCurrentUser();
    const targetUserData = await getOne(id);

    const isAdmin = user.admin;
    const isTargetUserDisabled = targetUserData.disabled;
    const isSelfUpdate = user.id === id;

    // Access control logic
    const isUnauthorized = !isSelfUpdate || isTargetUserDisabled;
    if (isUnauthorized && !isAdmin) {
        throw Errors.notFound(translate("User not found or deactivated"));
    }

    if (updateData.email !== undefined && updateData.email !== targetUserData.email && targetUserData.real) {
        throw Errors.badRequest(translate("Invalid request format"));
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

    if (updateData.company != null) {
        await CompaniesLoader.getOne(updateData.company);
    }

    const [affectedRows] = await UserEntity.update(
        { ...updateData, updatedBy: user.id },
        {
            where: { id, tenant: user.tenant },
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

    // Role IDs are tenant-scoped relationships, including for non-login contacts.
    await RolesLoader.getOne(data.role);

    // The route adds server-controlled fields to the request data. Copy only the
    // creation fields accepted by this loader so an ID or tenant can never flow
    // into the soft-delete revival update.
    const personData: NewUser = {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        gender: data.gender,
        real: data.real,
        role: data.role,
    };

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
            email: personData.email,
        },
    });

    const salt = await bcrypt.genSalt(10);
    const password = await bcrypt.hash(randomUUID(), salt);
    const activation = personData.real ? createActivationToken() : null;

    if (oldUser) {
        if (String(oldUser.get("tenant")) !== user.tenant) {
            throw Errors.badRequest(translate("User email already exists"));
        }

        if (oldUser.get("deleted")) {
            // Revive only within the same tenant and retain the user's stable ID.
            // A new login account must complete fresh activation before login; contacts
            // stay disabled. Revoke all old capabilities atomically with the revival.
            const transaction = await sequelize.transaction();
            let revivedUser;
            try {
                revivedUser = await oldUser.update(
                    {
                        ...personData,
                        company: user.company,
                        password,
                        token: null,
                        activationTokenHash: activation?.hash ?? null,
                        activationTokenExpiresAt: activation?.expiresAt ?? null,
                        passwordResetTokenHash: null,
                        passwordResetTokenExpiresAt: null,
                        pendingEmail: null,
                        emailChangeTokenHash: null,
                        emailChangeTokenExpiresAt: null,
                        disabled: true,
                        tenant: user.tenant,
                        deleted: null,
                        updatedBy: user.id,
                        deletedBy: null,
                    },
                    { transaction }
                );
                await revokeAllUserSessions(String(oldUser.get("id")), transaction);
                await transaction.commit();
            } catch (error) {
                await transaction.rollback();
                throw error;
            }

            const revived = revivedUser.toJSON();
            invalidateApiCacheForCurrentRequest();
            return {
                person: toPublicPerson(revived),
                activationToken: activation?.token ?? null,
            };
        } else {
            throw Errors.badRequest(translate("User email already exists"));
        }
    }

    const newUser = await UserEntity.create({
        ...personData,
        company: user.company,
        password,
        activationTokenHash: activation?.hash ?? null,
        activationTokenExpiresAt: activation?.expiresAt ?? null,
        tenant: user.tenant,
        createdBy: user.id,
        updatedBy: user.id,
    });
    const created = newUser.toJSON();
    invalidateApiCacheForCurrentRequest();
    return {
        person: toPublicPerson(created),
        activationToken: activation?.token ?? null,
    };
};

export const PeopleLoader = {
    getAll,
    getAllWithCount,
    getOne,
    update,
    create,
};
