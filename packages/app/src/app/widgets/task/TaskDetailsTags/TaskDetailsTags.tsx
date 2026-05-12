// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent } from "react";

import { TaskTags } from "app/components/project";
import { TasksActions } from "app/store/actions";
import { useElementHotkey } from "app/hooks";

interface TaskDetailsTagsProps {
    value?: string[];
    disabled?: boolean;
    taskId: string;
}
export const TaskDetailsTags: FunctionComponent<TaskDetailsTagsProps> = ({ value, disabled, taskId }) => {
    useElementHotkey("shift+t", "td-tags");

    return (
        <TaskTags
            value={value || []}
            disabled={disabled}
            id="td-tags"
            max={50}
            onChange={(tags: string[]) => TasksActions.setTags(taskId, tags)}
        />
    );
};
