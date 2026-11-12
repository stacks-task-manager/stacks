// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Button } from "@blueprintjs/core";
import { translate } from "@stacks/translations";
import React from "react";
import { GanttScale } from "app/components/common/GanttChart/types";

export function ChartToolbar({
    paneVisible,
    onToday,
    onPane,
    onTop,
}: {
    scale: GanttScale;
    paneVisible: boolean;
    onScale: (scale: GanttScale) => void;
    onToday: () => void;
    onPane: () => void;
    onTop: () => void;
}) {
    return (
        <div className="stacks-gantt-toolbar">
            <Button small intent="primary" data-testid="gantt-today" onClick={onToday}>
                {translate("Today")}
            </Button>

            <Button small minimal data-testid="gantt-pane-toggle" aria-pressed={paneVisible} onClick={onPane}>
                {translate("Task pane")}
            </Button>
            <Button
                small
                minimal
                data-testid="gantt-scroll-top"
                aria-label={translate("Back to top")}
                onClick={onTop}
            >
                ↑
            </Button>
        </div>
    );
}
