// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { NumericInput } from "@blueprintjs/core";
import clamp from "lodash/clamp";
import React, { FunctionComponent, useRef, useState } from "react";

import { Icon } from "app/components/common";
import { TaskDetailsSection } from "app/components/project";
import { FIELDTYPEICON } from "@stacks/types";
import { FieldTooltip } from "./FieldTooltip";
import { CustomFieldProps } from "./fieldsModel";

function clampValue(value: number, min?: number, max?: number) {
    const adjustedMin = min != null ? min : -Infinity;
    const adjustedMax = max != null ? max : Infinity;
    return clamp(value, adjustedMin, adjustedMax);
}

export const FieldTypeNumber: FunctionComponent<CustomFieldProps> = props => {
    const { id, title, value, options, description, onChange } = props;
    const [fieldValue, setFieldValue] = useState(value ?? "");
    const debounce = useRef<NodeJS.Timeout | null>(null);

    const handleChangeValue = (valueAsNumber: number, valueAsString: string) => {
        setFieldValue(valueAsString);

        if (debounce.current) {
            clearTimeout(debounce.current);
            debounce.current = null;
        }

        debounce.current = setTimeout(() => {
            if (value === valueAsString) return;
            onChange(id, `${clampValue(valueAsNumber, options.min, options.max)}`);
        }, 500);
    };

    const handleSubmitValue = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (value === event.currentTarget.value) return;
        onChange(id, `${clampValue(Number(event.currentTarget.value), options.min, options.max)}`);
    };

    return (
        <TaskDetailsSection title={title} accessory={<FieldTooltip description={description} />}>
            <NumericInput
                value={fieldValue}
                min={options.min ? Number(options.min) : undefined}
                max={options.max ? Number(options.max) : undefined}
                stepSize={options.step ? Number(options.step) : undefined}
                clampValueOnBlur={true}
                leftIcon={<Icon icon={FIELDTYPEICON.NUMBER} />}
                style={{
                    width: 150,
                }}
                onValueChange={handleChangeValue}
                onBlur={handleSubmitValue}
            />
        </TaskDetailsSection>
    );
};
