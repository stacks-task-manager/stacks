// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent, useMemo } from "react";
import { shallowEqual } from "app/hooks/store";

import { PeopleStore } from "app/store/people";

interface CompanyNameProps {
    id?: string;
    placeholder?: string;
}
export const CompanyName: FunctionComponent<CompanyNameProps> = ({ id, placeholder }) => {
    const companies = PeopleStore.use(state => state.companies, shallowEqual);

    const selectedCompany = useMemo(() => {
        if (!id) return undefined;
        return companies.find(company => company.id === id);
    }, [id]);

    if (!selectedCompany) return <>{placeholder}</>;

    return <>{selectedCompany.title}</>;
};
