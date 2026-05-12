// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Popover } from "@blueprintjs/core";
import React, { FunctionComponent } from "react";

import { useSubtasks } from "app/hooks";
import { TaskItems } from "app/widgets";

interface IPopupSubtasksViewProps {
    parentId: string;
    children: React.ReactNode;
    disabled?: boolean;
}

export const PopupSubtasksView: FunctionComponent<IPopupSubtasksViewProps> = ({
    parentId,
    children,
    disabled,
}) => {
    const { subtasks } = useSubtasks(parentId, false);
    return (
        <Popover
            content={<TaskItems tasks={subtasks} parentId={parentId} disabled={disabled} minWidth={300} max={10} />}
            lazy
            placement="bottom-end"
        >
            {children}
        </Popover>
    );
};

