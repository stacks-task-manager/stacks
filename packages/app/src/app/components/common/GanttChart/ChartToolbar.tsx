// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Button, HTMLSelect } from "@blueprintjs/core";
import { translate } from "@stacks/translations";
import React from "react";
import { GanttScale } from "app/components/common/GanttChart/types";

export function ChartToolbar({
    scale,
    paneVisible,
    onScale,
    onToday,
    onExpand,
    onCollapse,
    onPane,
    onTop,
}: {
    scale: GanttScale;
    paneVisible: boolean;
    onScale: (scale: GanttScale) => void;
    onToday: () => void;
    onExpand: () => void;
    onCollapse: () => void;
    onPane: () => void;
    onTop: () => void;
}) {
    return (
        <div className="stacks-gantt-toolbar">
            <Button small intent="primary" data-testid="gantt-today" onClick={onToday}>
                {translate("Today")}
            </Button>
            <HTMLSelect
                data-testid="gantt-scale"
                aria-label={translate("Gantt scale")}
                value={scale}
                onChange={event => onScale(event.target.value as GanttScale)}
            >
                <option value="day">{translate("Day")}</option>
                <option value="week">{translate("Week")}</option>
                <option value="month">{translate("Month")}</option>
                <option value="quarter">{translate("Quarter")}</option>
                <option value="halfYear">{translate("Half year")}</option>
            </HTMLSelect>
            <Button small minimal data-testid="gantt-expand-all" onClick={onExpand}>
                {translate("Expand all")}
            </Button>
            <Button small minimal data-testid="gantt-collapse-all" onClick={onCollapse}>
                {translate("Collapse all")}
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
