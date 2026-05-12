// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Classes } from "@blueprintjs/core";
import React, { FunctionComponent } from "react";

import { TaskDetailsSection } from "app/components/project";

interface TaskDetailsIdProps {
    id: string;
    vertical?: boolean;
    centered?: boolean;
}
export const TaskDetailsId: FunctionComponent<TaskDetailsIdProps> = ({ id, vertical, centered }) => {
    return (
        <TaskDetailsSection title="Task Id" centered={centered} vertical={vertical}>
            <span className={Classes.TEXT_MUTED}>{id}</span>
        </TaskDetailsSection>
    );
};
