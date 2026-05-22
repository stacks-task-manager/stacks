// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Button, InputGroup, Intent } from "@blueprintjs/core";
import React, { FunctionComponent, useCallback, useMemo, useState } from "react";

import { Icon } from "app/components/common";
import { TaskDetailsSection } from "app/components/project";
import { FIELDTYPEICON } from "@stacks/types";
import { FieldTooltip } from "./FieldTooltip";
import { CustomFieldProps } from "./fieldsModel";

export const FieldTypeUrl: FunctionComponent<CustomFieldProps> = props => {
    const { id, title, value, description, onChange } = props;
    const [fieldValue, setFieldValue] = useState(value ?? "");

    const isValid = useMemo(() => {
        if (!value) return true;

        try {
            new URL(value);
            return true;
        } catch (_) {
            return false;
        }
    }, [value]);

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
                type="url"
                placeholder="https://"
                leftIcon={<Icon icon={FIELDTYPEICON.URL} />}
                rightElement={
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
                            onClick={() => window.open(fieldValue, "_blank")}
                        />
                    )
                }
                onChange={handleChangeValue}
                onBlur={handleSubmit}
            />
        </TaskDetailsSection>
    );
};
