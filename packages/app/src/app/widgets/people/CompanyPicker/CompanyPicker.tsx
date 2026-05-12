// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Classes, HTMLSelect } from "@blueprintjs/core";
import React, { FunctionComponent, useMemo } from "react";

import { ICompany } from "@stacks/types";
import { PeopleStore } from "app/store/people";

interface CompanyPickerProps {
    defaultValue?: string;
    maxWidth?: number | string;
    disabled?: boolean;
    onChange: (companyId: string) => void;
}
export const CompanyPicker: FunctionComponent<CompanyPickerProps> = ({
    defaultValue,
    maxWidth,
    disabled,
    onChange,
}) => {
    const { companies } = PeopleStore.use();

    const sortedCompanies = useMemo(() => {
        return [...companies].sort((a: ICompany, b: ICompany) => a.title.localeCompare(b.title));
    }, [companies]);

    return (
        <HTMLSelect
            disabled={disabled}
            className={Classes.FILL}
            defaultValue={defaultValue}
            fill
            style={{ maxWidth }}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.currentTarget.value)}
        >
            <option value="">None</option>
            <option disabled value="">
                __________
            </option>
            {sortedCompanies.map((company: ICompany) => (
                <option value={company.id} key={company.id}>
                    {company.title}
                </option>
            ))}
        </HTMLSelect>
    );
};
