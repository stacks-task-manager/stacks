// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Switch } from "@blueprintjs/core";
import React, { FunctionComponent } from "react";

import { TaskDetailsSection } from "app/components/project";
import { CustomFieldProps } from "./fieldsModel";
import { FieldTooltip } from "./FieldTooltip";

export const FieldTypeSwitch: FunctionComponent<CustomFieldProps> = props => {
    const { id, title, value, description, onChange } = props;

    const handleChangeValue = () => {
        onChange(id, value === "1" ? "0" : "1");
    };

    return (
        <TaskDetailsSection title={title} accessory={<FieldTooltip description={description} />}>
            <Switch checked={value === "1"} onChange={handleChangeValue} />
        </TaskDetailsSection>
    );
};
