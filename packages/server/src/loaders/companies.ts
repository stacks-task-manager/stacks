// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Tenant-scoped company directory with cache invalidation on writes.
 */
import { CompanyEntity } from "@stacks/db";
import { Errors } from "../errors";
import type { ICompany } from "@stacks/types";
import { invalidateApiCacheForCurrentRequest } from "../utils/cache";
import { getCurrentUser } from "./context";
import { sanitizeWhere } from "./utils";

/** All companies visible to the current tenant, sorted by title. */
async function getAll() {
    const companies = await CompanyEntity.findAll({
        where: sanitizeWhere(),
        order: [["title", "ASC"]],
    });
    return companies.map(company => company.toJSON());
}

/** Loads one company or throws not found. */
async function getOne(id: string) {
    const company = await CompanyEntity.findByPk(id);

    if (!company) {
        throw Errors.notFound("Company not found");
    }

    return company.toJSON();
}

/** Creates a company row stamped with the current user and tenant. */
async function create(data: object) {
    const user = getCurrentUser();
    try {
        const newCompany = await CompanyEntity.create({
            ...data,
            tenant: user.tenant,
            createdBy: user.id,
            updatedBy: user.id,
        });

        invalidateApiCacheForCurrentRequest();
        return newCompany.toJSON();
    } catch (error) {
        throw error;
    }
}

/** Partial update after existence check; returns whether a row changed. */
async function update(id: string, data: Partial<ICompany>) {
    const user = getCurrentUser();
    try {
        await getOne(id);

        const [affectedRows] = await CompanyEntity.update(
            {
                ...data,
                updatedBy: user.id,
            },
            {
                where: { id },
                returning: false, // Optimize for performance
            }
        );

        invalidateApiCacheForCurrentRequest();
        return affectedRows > 0;
    } catch (error) {
        throw error;
    }
}

export const CompaniesLoader = {
    getAll,
    getOne,
    create,
    update,
};
