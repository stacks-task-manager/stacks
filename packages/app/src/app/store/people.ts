// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * People list cache.
 */
import { entity } from "app/hooks/store";
import { ICompany, IPerson, IRole, PEOPLE_GENDER, PEOPLE_GROUPING_TYPE } from "@stacks/types";

export type PeopleViewType = "contacts" | "workload" | "roles" | "companies" | "timesheet" | "approvals";

export interface PeopleFilter {
    tags: string[];
    status?: string;
    company?: string;
    genders: PEOPLE_GENDER[];
}

export interface IPeopleStore {
    isLoading: boolean;
    people: IPerson[];
    roles: IRole[];
    companies: ICompany[];
    query: string;
    viewType: PeopleViewType;
    me: string;
    favoritePeople: string[];
    favoriteCompanies: string[];
    filtersVisible: boolean;
    grouping: PEOPLE_GROUPING_TYPE;
    filters: PeopleFilter;
    selectedPeople: string[];
}

export const defaultColumnsList = ["name", "gender", "jobTitle", "notes", "created", "updated"];

export const PeopleStore = entity<IPeopleStore>({
    isLoading: false,
    people: [],
    roles: [],
    companies: [],
    query: "",
    filters: {
        tags: [],
        genders: [],
    },
    viewType: "contacts",
    favoritePeople: [],
    favoriteCompanies: [],
    filtersVisible: false,
    grouping: PEOPLE_GROUPING_TYPE.UNGROUPED,
    selectedPeople: [],
    me: "",
});
