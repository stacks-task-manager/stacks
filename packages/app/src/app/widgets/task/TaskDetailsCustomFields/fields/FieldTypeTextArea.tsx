// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { TextArea } from "@blueprintjs/core";
import React, { FunctionComponent, useCallback } from "react";

import { TaskDetailsSection } from "app/components/project";
import { CustomFieldProps } from "./fieldsModel";
import { FieldTooltip } from "./FieldTooltip";

export const FieldTypeTextArea: FunctionComponent<CustomFieldProps> = props => {
    const { id, title, value, description, onChange } = props;

    const handleChangeValue = useCallback(
        (event: React.ChangeEvent<HTMLTextAreaElement>) => {
            onChange(id, event.currentTarget.value);
        },
        [id]
    );

    return (
        <TaskDetailsSection title={title} accessory={<FieldTooltip description={description} />}>
            <TextArea value={value} onChange={handleChangeValue} fill autoResize autoCorrect="false" />
        </TaskDetailsSection>
    );
};
