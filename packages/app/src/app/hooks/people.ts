// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * People hooks and selectors.
 */
import { ICompany, IPerson, IRole, IRoleActions, ROLE_ACTIONS, ROLE_SECTIONS } from "@stacks/types";
import { PeopleActions } from "app/store/actions";
import { PeopleStore } from "app/store/people";
import { useMemo } from "react";
import { isAfter, isBefore } from "date-fns";
import { shallowEqual } from "./store";

/**
 * Custom hook to get a person by id along with the people store loading state.
 * @param {string} personId The id of the person to look up.
 * @returns {object} An object with `isLoading` and the matched `person` (or `undefined`).
 */
export const usePerson = (personId?: string) => {
    return PeopleStore.use(
        state => ({
            isLoading: state.isLoading,
            person: state.people.find((person: IPerson) => person.id === personId),
        }),
        shallowEqual
    );
};

/**
 * Returns the person with the given id from the people store.
 * @param {string} personId The id of the person to look up.
 * @returns {IPerson | undefined} The matched person, or `undefined` if not found.
 */
export const getPerson = (personId: string): IPerson | undefined => {
    return PeopleStore.get().people.find((person: IPerson) => person.id === personId);
};

/**
 * Custom hook to get all people whose ids are included in the given list.
 * @param {string[]} peopleIds The ids of the people to select.
 * @returns {IPerson[]} The matched people.
 */
export const usePeople = (peopleIds: string[]): IPerson[] => {
    return PeopleStore.use(
        state => state.people.filter((person: IPerson) => peopleIds.includes(person.id)),
        shallowEqual
    );
};

/**
 * Returns all people whose ids are included in the given list from the people store.
 * @param {string[]} peopleIds The ids of the people to select.
 * @returns {IPerson[]} The matched people.
 */
export const getPeople = (peopleIds: string[]): IPerson[] => {
    return PeopleStore.get().people.filter((person: IPerson) => peopleIds.includes(person.id));
};

/**
 * Custom hook to get the current logged-in user.
 * @returns {IPerson} The current user's person record.
 */
export const useMe = (): IPerson => {
    return PeopleStore.use(
        state => state.people.find(person => person.id === state.me),
        shallowEqual
    ) as IPerson;
};

/**
 * Returns the current logged-in user from the people store.
 * @returns {IPerson} The current user's person record.
 */
export const getMe = (): IPerson => {
    return PeopleStore.get().people.find(person => person.id === PeopleStore.get().me) as IPerson;
};

/**
 * Custom hook to get all roles from the people store.
 * @returns {IRole[]} All roles.
 */
export const useRoles = (): IRole[] => {
    return PeopleStore.use(state => state.roles, shallowEqual);
};

/**
 * Custom hook to get all people belonging to the given company.
 * @param {string} companyId The id of the company.
 * @returns {IPerson[]} The people belonging to the company.
 */
export const useCompanyStaff = (companyId: string) => {
    const people = PeopleStore.use(state => state.people, shallowEqual);

    return people.filter(person => person.company === companyId);
};

/**
 * Custom hook to get a company by id along with the people store loading state.
 * @param {string} companyId The id of the company to look up.
 * @returns {object} An object with `isLoading` and the matched `company` (or `undefined`).
 */
export const useCompany = (companyId?: string) => {
    return PeopleStore.use(
        state => ({
            isLoading: state.isLoading,
            company: state.companies.find((company: ICompany) => company.id === companyId),
        }),
        shallowEqual
    );
};

/**
 * Custom hook to get people filtered by the current query and active filters
 * (tags, status, company, and gender). Returns an empty array while loading or when no people exist.
 * @returns {IPerson[]} The filtered people.
 */
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

/**
 * Custom hook to get companies filtered by the current query, sorted alphabetically by title.
 * Returns an empty array while loading or when no companies exist.
 * @returns {ICompany[]} The filtered companies.
 */
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

/**
 * Custom hook to check whether any people filters (company, tags, status, or gender) are active.
 * @returns {boolean} True if at least one filter is set, otherwise false.
 */
export const usePeopleHasFilters = () => {
    const filters = PeopleStore.use(state => state.filters, shallowEqual);

    const { company, tags, status, genders } = filters;

    return company != null || tags.length > 0 || status != null || genders.length > 0;
};

/**
 * Custom hook to get the current people view type.
 * @returns {PeopleViewType} The current view type.
 */
export const useViewType = () => {
    return PeopleStore.use(state => state.viewType, shallowEqual);
};

/**
 * Returns the current people view type from the people store.
 * @returns {PeopleViewType} The current view type.
 */
export const getViewType = () => {
    return PeopleStore.get().viewType;
};

/**
 * Custom hook to get a role by id from the people store.
 * @param {string} roleId The id of the role to look up.
 * @returns {IRole | undefined} The matched role, or `undefined` if not found.
 */
export const useRole = (roleId: string) => {
    const roles = PeopleStore.use(state => state.roles, shallowEqual);
    return useMemo(() => {
        return roles.find(r => r.id === roleId);
    }, [roleId, roles]);
};

/**
 * Returns the role with the given id from the people store.
 * @param {string} roleId The id of the role to look up.
 * @returns {IRole | undefined} The matched role, or `undefined` if not found.
 */
export const getRole = (roleId: string): IRole | undefined => {
    return PeopleStore.get().roles.find(role => role.id === roleId);
};

/**
 * Checks whether the current user is allowed to perform the given action within a section.
 * Admins can do everything; otherwise the user's role access is consulted.
 * @param {keyof IRoleActions} action The action to check.
 * @param {ROLE_SECTIONS} section The section the action belongs to.
 * @returns {boolean} True if the action is allowed, otherwise false.
 */
export const canUserDo = (action: keyof IRoleActions, section: ROLE_SECTIONS): boolean => {
    const me = getMe();
    if (me.admin) return true;

    const role = getRole(me.role);
    if (!role) return false;

    return role.access[section]?.[action] ?? false;
};

/**
 * Checks whether the current user can read the given section.
 * @param {ROLE_SECTIONS} section The section to check.
 * @returns {boolean} True if the user can read the section.
 */
export const canRead = (section: ROLE_SECTIONS): boolean => {
    return canUserDo(ROLE_ACTIONS.READ, section);
};

/**
 * Checks whether the current user can write to the given section.
 * @param {ROLE_SECTIONS} section The section to check.
 * @returns {boolean} True if the user can write to the section.
 */
export const canWrite = (section: ROLE_SECTIONS): boolean => {
    return canUserDo(ROLE_ACTIONS.WRITE, section);
};

/**
 * Custom hook to get the read/write access flags for the current user within a section.
 * @param {ROLE_SECTIONS} section The section to check.
 * @returns {object} An object describing whether the current user can read and write in the section.
 */
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

/**
 * Checks whether a birthday's month and day fall within the given date range, ignoring the year.
 * @param {Date} birthday The birthday date to check.
 * @param {Date} from The start of the range.
 * @param {Date} to The end of the range.
 * @returns {boolean} True if the birthday falls within the range.
 */
const isBirthdayInRange = (birthday: Date, from: Date, to: Date): boolean => {
    const bMonth = birthday.getMonth();
    const bDay = birthday.getDate();
    const fMonth = from.getMonth();
    const fDay = from.getDate();
    const tMonth = to.getMonth();
    const tDay = to.getDate();

    // Compare only month and day, ignoring year
    const birthdayDate = new Date(2000, bMonth, bDay);
    const fromDate = new Date(2000, fMonth, fDay);
    const toDate = new Date(2000, tMonth, tDay);

    return !isBefore(birthdayDate, fromDate) && !isAfter(birthdayDate, toDate);
};

/**
 * Custom hook to get all people whose birthday falls within the given date range.
 * @param {Date} from The start of the range.
 * @param {Date} to The end of the range.
 * @returns {IPerson[]} The people with a birthday in the range.
 */
export const usePeopleWithBirthdayInRange = (from: Date, to: Date): IPerson[] => {
    const people = PeopleStore.use(state => state.people, shallowEqual);

    return useMemo(() => {
        return people.filter(
            (person: IPerson) => person.birthday && isBirthdayInRange(person.birthday, from, to)
        );
    }, [people, from, to]);
};

/**
 * Returns the people whose birthday falls within the given date range.
 * @param {IPerson[]} people The people to filter.
 * @param {Date} from The start of the range.
 * @param {Date} to The end of the range.
 * @returns {IPerson[]} The people with a birthday in the range.
 */
export const getPeopleWithBirthdayInRange = (people: IPerson[], from: Date, to: Date): IPerson[] => {
    return people.filter(
        (person: IPerson) => person.birthday && isBirthdayInRange(person.birthday, from, to)
    );
};
