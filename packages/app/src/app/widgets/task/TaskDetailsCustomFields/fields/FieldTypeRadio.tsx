// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Radio, RadioGroup } from "@blueprintjs/core";
import React, { FunctionComponent, useCallback } from "react";

import { TaskDetailsSection } from "app/components/project";
import { CustomFieldProps } from "./fieldsModel";
import { FieldTooltip } from "./FieldTooltip";

export const FieldTypeRadio: FunctionComponent<CustomFieldProps> = props => {
    const { id, title, value, options, description, onChange } = props;
    const items: string[] = (options as string[]) ?? [];

    const handleChangeValue = useCallback(
        (event: React.FormEvent<HTMLInputElement>) => {
            onChange(id, event.currentTarget.value);
        },
        [id]
    );

    return (
        <TaskDetailsSection title={title} accessory={<FieldTooltip description={description} />}>
            <RadioGroup selectedValue={value} onChange={handleChangeValue}>
                {items.map((item, i) => (
                    <Radio key={i} label={item} value={item} />
                ))}
            </RadioGroup>
        </TaskDetailsSection>
    );
};
