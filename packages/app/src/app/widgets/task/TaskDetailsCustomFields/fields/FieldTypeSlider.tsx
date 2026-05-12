// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Slider } from "@blueprintjs/core";
import React, { FunctionComponent, useCallback, useState } from "react";

import { TaskDetailsSection } from "app/components/project";
import { CustomFieldProps } from "./fieldsModel";
import { FieldTooltip } from "./FieldTooltip";

export const FieldTypeSlider: FunctionComponent<CustomFieldProps> = props => {
    const { id, title, value, options, description, onChange } = props;
    const [val, setVal] = useState(value && value.length ? Number(value) : undefined);

    const handleChange = (newValue: number) => {
        setVal(newValue);
    };

    const handleChangeValue = useCallback(
        (val: number) => {
            onChange(id, `${val}`);
        },
        [id]
    );

    return (
        <TaskDetailsSection title={title} accessory={<FieldTooltip description={description} />}>
            <Slider
                value={val}
                min={options.min ? Number(options.min) : undefined}
                max={options.max ? Number(options.max) : undefined}
                stepSize={options.step ? Number(options.step) : undefined}
                labelStepSize={options.step ? Number(options.step) : undefined}
                onChange={handleChange}
                onRelease={handleChangeValue}
            />
        </TaskDetailsSection>
    );
};
