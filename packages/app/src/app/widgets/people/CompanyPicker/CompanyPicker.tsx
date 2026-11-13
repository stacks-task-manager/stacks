// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent, useMemo } from "react";

import { ICompany } from "@stacks/types";
import { SelectPicker } from "app/components/common/SelectPicker/SelectPicker";
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

    const options = useMemo(
        () => [
            { value: "", label: "None" },
            { value: "", label: "__________", disabled: true },
            ...[...companies]
                .sort((a: ICompany, b: ICompany) => a.title.localeCompare(b.title))
                .map(company => ({ value: company.id, label: company.title })),
        ],
        [companies]
    );

    return (
        <SelectPicker
            options={options}
            defaultValue={defaultValue}
            maxWidth={maxWidth}
            disabled={disabled}
            fill
            onChange={onChange}
        />
    );
};
