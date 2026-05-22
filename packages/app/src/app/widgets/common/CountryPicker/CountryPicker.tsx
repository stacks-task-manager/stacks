// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { HTMLSelect } from "@blueprintjs/core";
import React, { FunctionComponent } from "react";

import countries from "assets/countries.json";

interface ICountryPickerProps {
    defaultValue?: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

export const CountryPicker: FunctionComponent<ICountryPickerProps> = ({ defaultValue, onChange }) => {
    return (
        <HTMLSelect defaultValue={defaultValue} fill onChange={onChange}>
            <option selected disabled>
                Choose country
            </option>
            {countries.map((country: string) => (
                <option value={country} key={country}>
                    {country}
                </option>
            ))}
        </HTMLSelect>
    );
};
