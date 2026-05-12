// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { InputGroup } from "@blueprintjs/core";
import React, { FunctionComponent, useCallback, useState } from "react";

import { TaskDetailsSection } from "app/components/project";
import { CustomFieldProps } from "./fieldsModel";
import { FieldTooltip } from "./FieldTooltip";
import { FIELDTYPEICON } from "@stacks/types";
import { Icon } from "app/components/common";

export const FieldTypeText: FunctionComponent<CustomFieldProps> = props => {
    const { id, title, value, description, onChange } = props;
    const [fieldValue, setFieldValue] = useState(value ?? "");

    const handleChangeValue = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            setFieldValue(event.currentTarget.value);
        },
        [id]
    );

    const handleSubmit = () => {
        if (fieldValue === value) return;
        onChange(id, fieldValue);
    };

    return (
        <TaskDetailsSection title={title} accessory={<FieldTooltip description={description} />}>
            <InputGroup
                value={fieldValue}
                leftIcon={<Icon icon={FIELDTYPEICON.TEXT} />}
                onChange={handleChangeValue}
                onBlur={handleSubmit}
            />
        </TaskDetailsSection>
    );
};
