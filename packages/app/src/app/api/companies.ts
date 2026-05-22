// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Company directory CRUD.
 */
import { ICompany } from "@stacks/types";
import request from "./request";

export const CompaniesAPI = {
    /** Lists companies. */
    async load(): Promise<ICompany[]> {
        return request.get("/api/companies");
    },
    /** Creates a company. */
    async add(company: Partial<ICompany>): Promise<ICompany> {
        return request.post("/api/companies", company);
    },
    /** PATCH company fields. */
    async update(companyId: string, company: Partial<ICompany>): Promise<boolean> {
        return request.patch(`/api/companies/${companyId}`, company);
    },
};
