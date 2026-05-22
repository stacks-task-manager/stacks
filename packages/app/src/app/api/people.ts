// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * People directory, birthdays, avatar/logo uploads, nested companies POST.
 */
import { ICompany, IPerson, PeopleProjects } from "@stacks/types";
import request from "./request";

export const PeopleAPI = {
    /** PATCH person profile. */
    async update(personId: string, personData: Partial<IPerson>) {
        return request.patch(`/api/people/${personId}`, personData);
    },
    /** Lists people. */
    async load(): Promise<IPerson[]> {
        return request.get("/api/people");
    },
    /** GET one person. */
    async loadOne(id: string): Promise<IPerson> {
        return request.get(`/api/people/${id}`);
    },
    /** Stub project grouping endpoint. */
    async loadProjects(): Promise<PeopleProjects[]> {
        return request.get("/api/people/projects");
    },
    /** Invites or creates a directory person. */
    async addPerson(person: Partial<IPerson>, real: boolean): Promise<IPerson> {
        return request.post("/api/people", { ...person, real });
    },
    /** Creates a company (same as CompaniesAPI.add). */
    async addCompany(company: Partial<ICompany>): Promise<ICompany> {
        return request.post("/api/companies", company);
    },
    /** Birthday list for a span and anchor date. */
    async birthdays(span?: "day" | "week" | "month", date?: Date): Promise<IPerson[]> {
        return request.get("/api/people/birthdays", {
            params: {
                span,
                date: date?.toISOString(),
            },
        });
    },
    /** Birthday count shortcut. */
    async countBirthdays(): Promise<number> {
        return request.get("/api/people/birthdays/count");
    },
    /** Multipart avatar upload. */
    async uploadAvatar(personId: string, avatar: string): Promise<string> {
        const formData = new FormData();
        formData.append("avatar", avatar);
        return request.post(`/api/people/${personId}/avatar`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
    },
    /** Company logo multipart upload. */
    async uploadLogo(companyId: string, logo: string): Promise<string> {
        const formData = new FormData();
        formData.append("logo", logo);
        return request.post(`/api/companies/${companyId}/logo`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
    },
};
