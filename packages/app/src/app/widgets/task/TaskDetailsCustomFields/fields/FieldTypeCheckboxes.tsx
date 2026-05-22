// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Checkbox } from "@blueprintjs/core";
import { produce } from "immer";
import React, { FunctionComponent } from "react";

import { TaskDetailsSection } from "app/components/project";
import { CustomFieldProps } from "./fieldsModel";
import { FieldTooltip } from "./FieldTooltip";

export const FieldTypeCheckboxes: FunctionComponent<CustomFieldProps> = props => {
    const { id, title, value, options, description, onChange } = props;
    const items: string[] = (options as string[]) ?? [];
    const values: string[] = (value ?? "").split("|");

    const handleChangeValue = (event: React.ChangeEvent<HTMLInputElement>) => {
        const currentValue = event.currentTarget.value;

        const newValues = produce(values, (draftValues: string[]) => {
            if (draftValues.includes(currentValue)) {
                const index = draftValues.findIndex(item => item === currentValue);
                draftValues.splice(index, 1);
            } else {
                draftValues.push(currentValue);
            }

            return draftValues;
        });

        onChange(id, newValues.join("|"));
    };

    return (
        <TaskDetailsSection title={title} accessory={<FieldTooltip description={description} />}>
            {items.map((item, i) => (
                <Checkbox
                    key={i}
                    label={item}
                    checked={values.includes(item)}
                    value={item}
                    onChange={handleChangeValue}
                />
            ))}
        </TaskDetailsSection>
    );
};
