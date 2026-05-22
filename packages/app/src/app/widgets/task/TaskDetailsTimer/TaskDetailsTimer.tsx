// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React from "react";

import { TimeTracker } from "app/components/project";
import { useElementHotkey } from "app/hooks";

export const TaskDetailsTimer = ({ taskId, disabled }: { taskId: string; disabled?: boolean }) => {
    useElementHotkey("shift+m", "td-timer");

    return <TimeTracker taskId={taskId} id="td-timer" disabled={disabled} />;
};
