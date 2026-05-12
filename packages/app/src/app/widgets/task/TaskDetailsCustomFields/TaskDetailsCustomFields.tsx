// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent } from "react";

import { useProjectFields } from "app/hooks";
import { FIELDTYPE, ITaskFieldValues } from "@stacks/types";
import { TasksActions } from "app/store/actions";
import {
    FieldTypeCheckboxes,
    FieldTypeDate,
    FieldTypeDropDown,
    FieldTypeNumber,
    FieldTypeRadio,
    FieldTypeSlider,
    FieldTypeSwitch,
    FieldTypeText,
    FieldTypeTextArea,
    FieldTypeUrl,
} from "./fields";

const FIELDS_BY_TYPE = {
    [FIELDTYPE.TEXT]: FieldTypeText,
    [FIELDTYPE.TEXTAREA]: FieldTypeTextArea,
    [FIELDTYPE.NUMBER]: FieldTypeNumber,
    [FIELDTYPE.DATE]: FieldTypeDate,
    [FIELDTYPE.DROPDOWN]: FieldTypeDropDown,
    [FIELDTYPE.CHECKBOXES]: FieldTypeCheckboxes,
    [FIELDTYPE.RADIO]: FieldTypeRadio,
    [FIELDTYPE.SWITCH]: FieldTypeSwitch,
    [FIELDTYPE.SLIDER]: FieldTypeSlider,
    [FIELDTYPE.URL]: FieldTypeUrl,
};

interface TaskDetailsCustomFieldsProps {
    values: ITaskFieldValues | undefined;
    taskId: string;
    projectId: string;
}
export const TaskDetailsCustomFields: FunctionComponent<TaskDetailsCustomFieldsProps> = ({
    values,
    taskId,
    projectId,
}) => {
    const fields = useProjectFields(projectId);

    return (
        <>
            {fields.map(field => {
                const Field = FIELDS_BY_TYPE[field.type];
                const FieldValue = values ? values[field.id] : undefined;

                if (!Field) return null;

                return (
                    <Field
                        key={`${field.id}-${taskId}`}
                        {...field}
                        value={FieldValue}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        onChange={(id: string, value: any) => TasksActions.setFieldValue(taskId, id, value)}
                    />
                );
            })}
        </>
    );
};
