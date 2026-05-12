// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { DateInput } from "@blueprintjs/datetime";
import { format, addYears } from "date-fns";
import React, { FunctionComponent, useCallback } from "react";

import { Icon } from "app/components/common";
import { TaskDetailsSection } from "app/components/project";
import { CustomFieldProps } from "./fieldsModel";
import { FieldTooltip } from "./FieldTooltip";

export const FieldTypeDate: FunctionComponent<CustomFieldProps> = props => {
    const { id, title, value, description, onChange } = props;

    const handleChangeValue = useCallback(
        (newDate: string | null, isUserChange: boolean) => {
            if (!isUserChange) return;
            onChange(id, newDate);
        },
        [id]
    );

    const formatDate = (date: Date) => {
        return format(date, "P");
    };

    const parseDate = (str: string) => {
        return new Date(str);
    };

    return (
        <TaskDetailsSection title={title} accessory={<FieldTooltip description={description} />}>
            <DateInput
                value={value}
                inputProps={{
                    leftIcon: <Icon icon="calendar-date" />,
                    style: {
                        width: 150,
                    },
                }}
                showTimezoneSelect={false}
                maxDate={addYears(new Date(), 5)}
                formatDate={formatDate}
                parseDate={parseDate}
                onChange={handleChangeValue}
            />
        </TaskDetailsSection>
    );
};
