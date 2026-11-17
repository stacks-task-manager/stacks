// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Button, InputGroup, Intent } from "@blueprintjs/core";
import { FIELDTYPE, FIELDTYPEICON } from "@stacks/types";
import React, { FunctionComponent, useMemo, useState } from "react";

import { Icon } from "app/components/common";
import { TaskDetailsSection } from "app/components/project";
import { openInNewTab } from "app/utils/browser";
import { FieldTooltip } from "./FieldTooltip";
import { CustomFieldProps } from "./fieldsModel";

export const FieldTypeText: FunctionComponent<CustomFieldProps> = props => {
    const { id, title, type, value, description, onChange } = props;
    const isUrl = type === FIELDTYPE.URL;
    const [fieldValue, setFieldValue] = useState(value ?? "");

    const isValid = useMemo(() => {
        if (!isUrl || !fieldValue) return true;
        try {
            new URL(fieldValue);
            return true;
        } catch {
            return false;
        }
    }, [fieldValue, isUrl]);

    const handleChangeValue = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFieldValue(event.currentTarget.value);
    };

    const handleSubmit = () => {
        if (fieldValue === value) return;
        onChange(id, fieldValue);
    };

    return (
        <TaskDetailsSection title={title} accessory={<FieldTooltip description={description} />}>
            <InputGroup
                value={fieldValue}
                type={isUrl ? "url" : "text"}
                placeholder={isUrl ? "https://" : undefined}
                leftIcon={<Icon icon={isUrl ? FIELDTYPEICON.URL : FIELDTYPEICON.TEXT} />}
                rightElement={
                    isUrl ? (
                        !isValid ? (
                            <Button
                                variant="minimal"
                                disabled
                                intent={Intent.DANGER}
                                icon={<Icon icon="alert-triangle" />}
                            />
                        ) : (
                            <Button
                                variant="minimal"
                                icon={<Icon icon="link-external-01" />}
                                onClick={() => openInNewTab(fieldValue)}
                            />
                        )
                    ) : undefined
                }
                onChange={handleChangeValue}
                onBlur={handleSubmit}
            />
        </TaskDetailsSection>
    );
};
