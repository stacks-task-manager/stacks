// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent } from "react";

import countries from "assets/countries.json";
import { SelectPicker } from "app/components/common/SelectPicker/SelectPicker";

interface ICountryPickerProps {
    defaultValue?: string;
    onChange: (country: string) => void;
}

export const CountryPicker: FunctionComponent<ICountryPickerProps> = ({ defaultValue, onChange }) => {
    return (
        <SelectPicker
            defaultValue={defaultValue}
            placeholder="Choose country"
            fill
            options={countries.map(country => ({ value: country, label: country }))}
            onChange={onChange}
        />
    );
};
