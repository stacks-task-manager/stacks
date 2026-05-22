// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * People hooks and selectors.
 */
import { ICompany, IPerson, IRole, IRoleActions, ROLE_ACTIONS, ROLE_SECTIONS } from "@stacks/types";
import { PeopleActions } from "app/store/actions";
import { PeopleStore } from "app/store/people";
import { useMemo } from "react";
import { shallowEqual } from "./store";

export const usePerson = (personId?: string) => {
    return PeopleStore.use(
        state => ({
            isLoading: state.isLoading,
            person: state.people.find((person: IPerson) => person.id === personId),
        }),
        shallowEqual
    );
};

export const getPerson = (personId: string): IPerson | undefined => {
    return PeopleStore.get().people.find((person: IPerson) => person.id === personId);
};

export const usePeople = (peopleIds: string[]): IPerson[] => {
    return PeopleStore.use(
        state => state.people.filter((person: IPerson) => peopleIds.includes(person.id)),
        shallowEqual
    );
};

export const getPeople = (peopleIds: string[]): IPerson[] => {
    return PeopleStore.get().people.filter((person: IPerson) => peopleIds.includes(person.id));
};

export const useMe = (): IPerson => {
    return PeopleStore.use(
        state => state.people.find(person => person.id === state.me),
        shallowEqual
    ) as IPerson;
};

export const getMe = (): IPerson => {
    return PeopleStore.get().people.find(person => person.id === PeopleStore.get().me) as IPerson;
};

export const useRoles = (): IRole[] => {
    return PeopleStore.use(state => state.roles, shallowEqual);
};

export const useCompanyStaff = (companyId: string) => {
    const people = PeopleStore.use(state => state.people, shallowEqual);

    return people.filter(person => person.company === companyId);
};

export const useCompany = (companyId?: string) => {
    return PeopleStore.use(
        state => ({
            isLoading: state.isLoading,
            company: state.companies.find((company: ICompany) => company.id === companyId),
        }),
        shallowEqual
    );
};

export const useFilteredPeople = () => {
    const { people, query, isLoading, filters } = PeopleStore.use(
        state => ({
            people: state.people,
            query: state.query,
            isLoading: state.isLoading,
            filters: state.filters,
        }),
        shallowEqual
    );
    const { tags, status, company, genders } = filters;

    if (!people || isLoading) return [];

    return people
        .filter((person: IPerson) => {
            if (query.length) return PeopleActions.personHasQuery(person);
            return true;
        })
        .filter((person: IPerson) => {
            if (tags.length > 0) {
                return person.tags?.length && tags.every(t => person.tags!.includes(t));
            }
            return true;
        })
        .filter((person: IPerson) => {
            if (status != null) return person.status && person.status === status;
            return true;
        })
        .filter((person: IPerson) => {
            if (company) {
                return person.company && person.company === company;
            }
            return true;
        })
        .filter((person: IPerson) => {
            if (genders && genders.length > 0) {
                return genders.includes(person.gender);
            }
            return true;
        });
};

export const useFilteredCompanies = () => {
    const { companies, query, isLoading } = PeopleStore.use(
        state => ({
            companies: state.companies,
            query: state.query,
            isLoading: state.isLoading,
        }),
        shallowEqual
    );

    if (!companies || isLoading) return [];

    return companies
        .filter((company: ICompany) => {
            if (query.length) return Boolean(company.title.toLowerCase().includes(query.toLowerCase()));
            return true;
        })
        .sort((a: ICompany, b: ICompany) => a.title.localeCompare(b.title));
};

export const usePeopleHasFilters = () => {
    const filters = PeopleStore.use(state => state.filters, shallowEqual);

    const { company, tags, status, genders } = filters;

    return company != null || tags.length > 0 || status != null || genders.length > 0;
};

export const useViewType = () => {
    return PeopleStore.use(state => state.viewType, shallowEqual);
};

export const getViewType = () => {
    return PeopleStore.get().viewType;
};

export const useRole = (roleId: string) => {
    const roles = PeopleStore.use(state => state.roles, shallowEqual);
    return useMemo(() => {
        return roles.find(r => r.id === roleId);
    }, [roleId, roles]);
};

export const getRole = (roleId: string): IRole | undefined => {
    return PeopleStore.get().roles.find(role => role.id === roleId);
};

export const canUserDo = (action: keyof IRoleActions, section: ROLE_SECTIONS): boolean => {
    const me = getMe();
    if (me.admin) return true;

    const role = getRole(me.role);
    if (!role) return false;

    return role.access[section]?.[action] ?? false;
};

export const canRead = (section: ROLE_SECTIONS): boolean => {
    return canUserDo(ROLE_ACTIONS.READ, section);
};

export const canWrite = (section: ROLE_SECTIONS): boolean => {
    return canUserDo(ROLE_ACTIONS.WRITE, section);
};

export const useCanAccess = (section: ROLE_SECTIONS) => {
    const me = useMe();
    const role = PeopleStore.use(
        state => (me ? state.roles.find(role => role.id === me.role) : null),
        shallowEqual
    );
    if (!me || !role) return { view: false, create: false };

    const read = me.admin ? true : role?.access[section]?.read ?? false;
    const write = me.admin ? true : role?.access[section]?.write ?? false;
    return { read, write };
};
