// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Company listing and CRUD with short-lived response caching on reads.
 */
import type { Context } from "hono";
import { Hono } from "hono";
import { translate } from "@stacks/translations";

import { CompaniesLoader } from "../loaders/companies";
import { validator } from "../middleware/validator";
import { cacheMiddleware } from "../utils/cache";
import { Errors } from "../errors";
import { asyncHandler } from "../utils/errorHandler";
import { parseUuidParam } from "./schema/common";
import { NewCompanySchema, UpdateCompanySchema } from "./schema/company";

const companies = new Hono();

/** GET `/` — Lists all companies (cached ~10 minutes). */
companies.get(
    "/",
    cacheMiddleware({ ttl: 600 }),
    asyncHandler(async (c: Context) => {
        const companies = await CompaniesLoader.getAll();
        return c.replySuccess(companies);
    })
);

/** POST `/` — Creates a company from validated JSON. */
companies.post(
    "/",
    validator(NewCompanySchema),
    asyncHandler(async (c: Context) => {
        const companyData = c.req.valid("json");
        const newCompany = await CompaniesLoader.create(companyData);
        return c.replySuccess(newCompany);
    })
);

/** GET `/:id` — Returns one company by id (cached ~5 minutes). */
companies.get(
    "/:id",
    cacheMiddleware({ ttl: 300 }),
    asyncHandler(async (c: Context) => {
        const companyId = c.req.param("id")!;
        parseUuidParam(companyId);

        const company = await CompaniesLoader.getOne(companyId);
        if (!company) {
            throw Errors.notFound(translate("Company not found"));
        }

        return c.replySuccess(company);
    })
);

/** PATCH `/:id` — Partially updates a company. */
companies.patch(
    "/:id",
    validator(UpdateCompanySchema),
    asyncHandler(async (c: Context) => {
        const companyId = c.req.param("id")!;
        const companyData = c.req.valid("json");
        parseUuidParam(companyId);

        const updated = await CompaniesLoader.update(companyId, companyData);
        return c.replySuccess(updated);
    })
);

export default companies;
