// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { HTMLSelect } from "@blueprintjs/core";
import React, { FunctionComponent, useCallback } from "react";

import { TaskDetailsSection } from "app/components/project";
import { CustomFieldProps } from "./fieldsModel";
import { FieldTooltip } from "./FieldTooltip";

export const FieldTypeDropDown: FunctionComponent<CustomFieldProps> = props => {
    const { id, title, value, options, description, onChange } = props;
    const items: string[] = (options as string[]) ?? [];

    const handleChangeValue = useCallback(
        (event: React.ChangeEvent<HTMLSelectElement>) => {
            onChange(id, event.currentTarget.value);
        },
        [id]
    );

    return (
        <TaskDetailsSection title={title} accessory={<FieldTooltip description={description} />}>
            <HTMLSelect value={value} style={{ minWidth: 150 }} onChange={handleChangeValue}>
                <option value=""></option>
                {items.map((item, i) => (
                    <option key={i} value={item}>
                        {item}
                    </option>
                ))}
            </HTMLSelect>
        </TaskDetailsSection>
    );
};
