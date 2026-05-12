// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * People directory loads and patches.
 */
import { translate } from "@stacks/translations";
import { Intent } from "@blueprintjs/core";
import { produce } from "immer";
import { xor } from "lodash";
import {
    ICompany,
    IPerson,
    IRole,
    PEOPLE_GROUPING_TYPE,
    ROLE_SECTIONS,
    USER_ONLINE_STATUS,
} from "@stacks/types";
import { default as API, CompaniesAPI, ExportAPI, PeopleAPI, RolesAPI } from "app/api";
import { Confirm } from "app/components/common";
import { getCookie } from "app/utils/cookie";
import Dialog from "app/utils/dialog";
import Storage from "app/utils/storage";
import { createDebouncedCallback, patchFilterField } from "../actionHelpers";
import { IPeopleStore, PeopleFilter, PeopleStore, PeopleViewType } from "../people";
import { cleanupResourceNavigationRefs } from "./resourceNavigationCleanup";

const VIEW_TYPE_NAME = "people-view-type";
const FAVORITE_PEOPLE = "favorite-people";
const FAVORITE_COMAPNIES = "favorite-companies";

const load = async () => {
    const favoritePeople = Storage.get(FAVORITE_PEOPLE, true, []);
    const favoriteCompanies = Storage.get(FAVORITE_COMAPNIES, true, []);

    PeopleStore.set(
        produce((state: IPeopleStore) => {
            state.isLoading = true;
            state.favoritePeople = favoritePeople;
            state.favoriteCompanies = favoriteCompanies;
        })
    );

    const uid = getCookie("uid");
    const people = await PeopleAPI.load();
    const roles = await RolesAPI.load();
    let canViewCompanies = false;

    if (uid) {
        const me = people.find(p => p.id === uid);
        const role = roles.find(r => r.id === me?.role);
        const access = role?.access[ROLE_SECTIONS.COMPANIES];
        canViewCompanies = (me?.admin || access?.read) ?? false;
    }

    const companies = canViewCompanies ? await CompaniesAPI.load() : [];

    const lastViewType = Storage.get(VIEW_TYPE_NAME, false, "contacts");

    PeopleStore.set(
        produce((state: IPeopleStore) => {
            state.people = people;
            state.companies = companies;
            state.roles = roles;
            state.viewType = lastViewType;
            state.isLoading = false;
            state.me = uid!;
        })
    );
};

const reloadPeople = async () => {
    const people = await PeopleAPI.load();
    const roles = await RolesAPI.load();

    PeopleStore.set(
        produce((state: IPeopleStore) => {
            state.people = people;
            state.roles = roles;
        })
    );
};

const reloadPerson = async (personId: string) => {
    const person = await PeopleAPI.loadOne(personId);

    PeopleStore.set(
        produce((state: IPeopleStore) => {
            state.people = state.people.map(p => {
                if (p.id === personId) {
                    return person;
                }
                return p;
            });
        })
    );
};

const reloadCompanies = async () => {
    const companies = await CompaniesAPI.load();

    PeopleStore.set(
        produce((state: IPeopleStore) => {
            state.companies = companies;
        })
    );
};

const debouncedPeopleQuery = createDebouncedCallback(500);
const setQuery = (query: string) => {
    debouncedPeopleQuery(() => {
        PeopleStore.set(
            produce((state: IPeopleStore) => {
                state.query = query;
            })
        );
    });
};

const changeViewType = (view: PeopleViewType) => {
    const { viewType, people } = PeopleStore.get();
    if (view === viewType || !people) return;

    Storage.set(VIEW_TYPE_NAME, view);

    PeopleStore.set(
        produce((state: IPeopleStore) => {
            state.viewType = view;
            state.query = "";
        })
    );
};

const personHasQuery = (person: IPerson) => {
    const { query } = PeopleStore.get();
    if (!query.trim().length) return true;
    const q = query.toLowerCase();

    return (
        Boolean(person.firstName?.toLowerCase().includes(q)) ||
        Boolean(person.lastName?.toLowerCase().includes(q)) ||
        Boolean(person.email?.toLowerCase().includes(q)) ||
        Boolean(person.nickname?.toLowerCase().includes(q)) ||
        Boolean(person.jobTitle?.toLowerCase().includes(q)) ||
        Boolean(person.company?.toLowerCase().includes(q)) ||
        Boolean(person.officePhone?.toLowerCase().includes(q)) ||
        Boolean(person.cellPhone?.toLowerCase().includes(q)) ||
        Boolean(person.homePhone?.toLowerCase().includes(q)) ||
        Boolean(person.fax?.toLowerCase().includes(q)) ||
        Boolean(person.address?.toLowerCase().includes(q)) ||
        Boolean(person.county?.toLowerCase().includes(q)) ||
        Boolean(person.city?.toLowerCase().includes(q)) ||
        Boolean(person.country?.toLowerCase().includes(q)) ||
        Boolean(person.address2?.toLowerCase().includes(q)) ||
        Boolean(person.website?.toLowerCase().includes(q)) ||
        Boolean(person.notes?.toLowerCase().includes(q)) ||
        Boolean(person.socialTwitter?.toLowerCase().includes(q)) ||
        Boolean(person.socialFacebook?.toLowerCase().includes(q)) ||
        Boolean(person.socialLinkedin?.toLowerCase().includes(q)) ||
        Boolean(person.socialInstagram?.toLowerCase().includes(q)) ||
        Boolean(person.socialOther?.toLowerCase().includes(q))
    );
};

// const toggleTag = (tag: string) => {
//     PeopleStore.set(
//         produce((state: IPeopleStore) => {
//             state.tags = xor(state.tags, [tag]);
//         })
//     );
// };

// const setStatus = (status?: string) => {
//     PeopleStore.set(
//         produce((state: IPeopleStore) => {
//             state.status = status;
//         })
//     );
// };

// const setCompany = (company: string | undefined) => {
//     PeopleStore.set(
//         produce((state: IPeopleStore) => {
//             state.company = company;
//         })
//     );
// };

const setFilter = (key: keyof PeopleFilter, value: PeopleFilter[keyof PeopleFilter]) => {
    PeopleStore.set(
        produce((state: IPeopleStore) => {
            patchFilterField(state.filters, key, value);
        })
    );
};

const resetFilters = () => {
    PeopleStore.set(
        produce((state: IPeopleStore) => {
            state.filters = {
                tags: [],
                genders: [],
            };
        })
    );
};

// const select = (personId: string) => {
//     if (personId === "0") {
//         PeopleStore.set(
//             produce((state: IPeopleStore) => {
//                 state.person = { ...PersonTemplate, id: uuidv4(), created: new Date().toJSON() };
//             })
//         );
//     } else {
//         const { people } = PeopleStore.get();
//         if (!people) {
//             PeopleStore.set(
//                 produce((state: IPeopleStore) => {
//                     state.person = undefined;
//                 })
//             );
//         } else {
//             const person = people.find(person => person.id === personId);
//             PeopleStore.set(
//                 produce((state: IPeopleStore) => {
//                     state.person = person ? { ...person } : undefined;
//                 })
//             );
//         }
//     }
// };

// const unselect = () => {
//     PeopleStore.set(
//         produce((state: IPeopleStore) => {
//             state.person = undefined;
//         })
//     );
// };

const getPerson = (personId: string): IPerson | undefined => {
    const { people } = PeopleStore.get();
    if (!people) return undefined;

    return people.find(person => person.id === personId);
};

const getMe = (): string => {
    return PeopleStore.get().me;
};

const update = async (id: string, updatedPerson: Partial<IPerson>) => {
    const { people } = PeopleStore.get();
    if (!people) return;

    PeopleStore.set(
        produce((state: IPeopleStore) => {
            state.people = state.people.map((person: IPerson) => {
                if (person.id === id) {
                    return { ...person, ...updatedPerson, updated: new Date() };
                }
                return person;
            });
        })
    );

    await PeopleAPI.update(id, updatedPerson);
};

const updateOnlineStatus = (personId: string, onlineStatus: USER_ONLINE_STATUS) => {
    PeopleStore.set(
        produce((state: IPeopleStore) => {
            state.people = state.people.map((person: IPerson) => {
                if (person.id === personId) {
                    return { ...person, onlineStatus };
                }
                return person;
            });
        })
    );
};

const toggleCompany = async (personId: string, companyId: string) => {
    const person = getPerson(personId);
    if (!person) return;

    return await update(personId, { company: person.company === companyId ? undefined : companyId });
};

const remove = async (personId: string) => {
    const { favoritePeople } = PeopleStore.get();

    const me = getMe();
    if (me === personId) {
        window.toaster.show({
            message: "The current user cannot be deleted",
            intent: Intent.WARNING,
            icon: "user",
        });
        return;
    }

    PeopleStore.set(
        produce((state: IPeopleStore) => {
            state.people = state.people.filter((person: IPerson) => person.id !== personId);
        })
    );

    if (favoritePeople.some(person => person === personId)) {
        toggleFavoritePerson(personId);
    }

    await cleanupResourceNavigationRefs(personId);

    await API("people/save", PeopleStore.get().people!);
    await API("people/remove", personId);
};

const removeAlert = async (personId: string) => {
    const result = await Dialog.confirm(
        translate("Delete person"),
        translate("Are you sure you want to delete this person This cannot be undone"),
        Intent.DANGER
    );

    if (!result) return;

    await remove(personId);
};

const removeAlertBatch = async () => {
    const selectedPeople = PeopleStore.get().selectedPeople;
    if (!selectedPeople.length) return;

    const result = await Dialog.confirm(
        translate("Delete selected people"),
        translate("Are you sure you want to delete all the selected people This cannot be undone"),
        Intent.DANGER
    );

    if (!result) return;

    for (const personId of selectedPeople) {
        await remove(personId);
    }

    PeopleStore.set(
        produce((state: IPeopleStore) => {
            state.selectedPeople = [];
        })
    );
};

const removeCompany = async (companyId: string, removePeople?: boolean) => {
    const { favoriteCompanies } = PeopleStore.get();

    PeopleStore.set(
        produce((state: IPeopleStore) => {
            state.companies = state.companies.filter((company: ICompany) => company.id !== companyId);
        })
    );

    if (favoriteCompanies.some(company => company === companyId)) {
        toggleFavoriteCompany(companyId);
    }

    const people = getCompanyPeople(companyId);
    if (removePeople) {
        for (const person of people) {
            await remove(person.id);
        }
    } else {
        for (const person of people) {
            update(person.id, { company: undefined });
        }
    }

    await cleanupResourceNavigationRefs(companyId);

    await API("people/saveCompanies", PeopleStore.get().companies);
    await API("people/removeCompany", companyId);
};

const removeAlertCompany = async (companyId: string) => {
    const { answer, checked } = await Confirm({
        title: "Delete company",
        description: "Are you sure you want to delete this company? This cannot be undone!",
        intent: Intent.DANGER,
        checkboxLabel: "Also delete staff members",
    });

    if (!answer) return;

    removeCompany(companyId, checked);
};

const setAvatar = async (personId: string, avatar: string) => {
    await update(personId, { avatar });

    return avatar;
};

const addPerson = async (personData: Partial<IPerson>, real: boolean) => {
    const person = await PeopleAPI.addPerson(personData, real);

    PeopleStore.set(
        produce((state: IPeopleStore) => {
            state.people.push(person);
        })
    );

    return person;
};

const addCompany = async (title: string) => {
    const { companies } = PeopleStore.get();
    if (companies.some(company => company.title === title)) {
        window.toaster.show({
            message: "Company with this name already present",
            intent: Intent.WARNING,
        });
        return;
    }

    const company = await PeopleAPI.addCompany({ title });

    PeopleStore.set(
        produce((state: IPeopleStore) => {
            state.companies.push(company);
        })
    );

    return company;
};

const getCompany = (companyId: string) => {
    return PeopleStore.get().companies.find(company => company.id === companyId);
};

/**
 * Returns all people from the requested company
 * @param companyId
 * @returns
 */
const getCompanyPeople = (companyId: string) => {
    return PeopleStore.get().people.filter(person => person.company === companyId);
};

/**
 * Returns all people that are not part of the requested company
 * @param companyId
 * @returns
 */
const getNonCompanyPeople = (companyId: string) => {
    return PeopleStore.get().people.filter(person => person.company != null && person.company !== companyId);
};

/**
 * Returns all people that are not assigned to any company
 * @returns
 */
const getNoCompanyPeople = () => {
    return PeopleStore.get().people.filter(person => person.company == null);
};

const toggleFavoritePerson = (personId: string) => {
    PeopleStore.set(
        produce((state: IPeopleStore) => {
            if (state.favoritePeople.includes(personId)) {
                state.favoritePeople = state.favoritePeople.filter(person => person !== personId);
            } else {
                state.favoritePeople.push(personId);
            }
        })
    );

    Storage.set(FAVORITE_PEOPLE, PeopleStore.get().favoritePeople);
};

const toggleFavoriteCompany = (companyId: string) => {
    PeopleStore.set(
        produce((state: IPeopleStore) => {
            if (state.favoriteCompanies.includes(companyId)) {
                state.favoriteCompanies = state.favoriteCompanies.filter(company => company !== companyId);
            } else {
                state.favoriteCompanies.push(companyId);
            }
        })
    );

    Storage.set(FAVORITE_COMAPNIES, PeopleStore.get().favoriteCompanies);
};

const updateCompany = async (updatedCompany: ICompany) => {
    const { companies } = PeopleStore.get();
    if (!companies) return;

    PeopleStore.set(
        produce((state: IPeopleStore) => {
            state.companies = state.companies.map((company: ICompany) => {
                if (company.id === updatedCompany.id) {
                    return { ...updatedCompany, updated: new Date().toJSON() };
                }
                return company;
            });
        })
    );

    await CompaniesAPI.update(updatedCompany.id, updatedCompany);
};

const setLogo = async (companyId: string, logo: string) => {
    PeopleStore.set(
        produce((state: IPeopleStore) => {
            state.companies = state.companies.map((company: ICompany) => {
                if (company.id === companyId) {
                    return { ...company, logo };
                }
                return company;
            });
        })
    );

    await CompaniesAPI.update(companyId, { logo });

    return logo;
};

const getSorted = () => {
    return [...PeopleStore.get().people].sort((a, b) =>
        `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
    );
};

const toggleFilters = () => {
    PeopleStore.set(
        produce((state: IPeopleStore) => {
            state.filtersVisible = !state.filtersVisible;
        })
    );
};

const setGrouping = (grouping: PEOPLE_GROUPING_TYPE) => {
    PeopleStore.set(
        produce((state: IPeopleStore) => {
            state.grouping = grouping;
        })
    );
};

const togglePersonSelection = (personId: string) => {
    PeopleStore.set(
        produce((state: IPeopleStore) => {
            state.selectedPeople = xor(state.selectedPeople, [personId]);
        })
    );
};

const updateRole = async (data: IRole) => {
    PeopleStore.set(
        produce((state: IPeopleStore) => {
            state.roles = state.roles.map(role => {
                if (role.id === data.id) {
                    return data;
                }

                return role;
            });
        })
    );

    await RolesAPI.update(data.id, {
        access: data.access,
        title: data.title,
        description: data.description,
    });
};

const exportPeople = async (format: "json" | "excel") => {
    // ExportAPI.export({
    //     data: PeopleStore.get().people,
    //     companies: PeopleStore.get().companies,
    //     destination: info.filePath,
    //     type,
    // });

    ExportAPI.export({
        title: "people",
        data: PeopleStore.get().people,
        format,
    });
};

const exportCompanies = async (format: "json" | "excel") => {
    ExportAPI.export({
        title: "companies",
        data: PeopleStore.get().companies,
        format,
    });
};

const exportPerson = async (format: "json" | "pdf" | "excel", personId: string) => {
    const person = getPerson(personId);
    if (!person) return;

    ExportAPI.export({
        title: `${person.firstName}_${person.lastName}`,
        data: [person],
        type: "person",
        format,
    });
};

const exportCompany = async (format: "json" | "pdf" | "excel", companyId: string) => {
    const company = getCompany(companyId);
    if (!company) return;

    ExportAPI.export({
        title: company.title,
        data: [company],
        type: "company",
        format,
    });
};

export const PeopleActions = {
    load,
    reloadPeople,
    reloadCompanies,
    reloadPerson,
    setQuery,
    changeViewType,
    personHasQuery,
    getPerson,
    setFilter,
    resetFilters,
    getMe,
    update,
    updateOnlineStatus,
    toggleCompany,
    remove,
    removeAlert,
    removeAlertBatch,
    removeAlertCompany,
    setAvatar,
    addPerson,
    addCompany,
    getCompany,
    getCompanyPeople,
    getNonCompanyPeople,
    getNoCompanyPeople,
    toggleFavoritePerson,
    toggleFavoriteCompany,
    updateCompany,
    setLogo,
    getSorted,
    toggleFilters,
    setGrouping,
    togglePersonSelection,
    updateRole,
    exportPeople,
    exportCompanies,
    exportPerson,
    exportCompany,
};
