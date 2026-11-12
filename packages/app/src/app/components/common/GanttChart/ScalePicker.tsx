// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Menu, MenuItem, Popover } from "@blueprintjs/core";
import { translate } from "@stacks/translations";
import React from "react";
import { Icon } from "app/components/common/Icon/Icon";
import { GanttScale } from "app/components/common/GanttChart/types";

const SCALE_OPTIONS: ReadonlyArray<{ value: GanttScale; label: string }> = [
    { value: "day", label: "Day" },
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
    { value: "quarter", label: "Quarter" },
    { value: "halfYear", label: "Half year" },
];

export function ScalePicker({ scale, onScale }: { scale: GanttScale; onScale: (scale: GanttScale) => void }) {
    const selectedLabel = SCALE_OPTIONS.find(option => option.value === scale)?.label ?? scale;

    return (
        <div className="stacks-gantt-scale-wrapper">
            <Popover
                content={
                    <Menu>
                        {SCALE_OPTIONS.map(option => (
                            <MenuItem
                                key={option.value}
                                text={translate(option.label)}
                                onClick={() => onScale(option.value)}
                            />
                        ))}
                    </Menu>
                }
                placement="bottom-end"
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                renderTarget={({ isOpen, ref, ...props }) => (
                    <button
                        data-testid="gantt-scale-picker"
                        aria-label={translate("Gantt scale")}
                        ref={ref}
                        {...props}
                    >
                        <span className="stacks-gantt-scale-label">{translate(selectedLabel)}</span>
                        <Icon className="stacks-gantt-scale-icon" icon="chevron-down" />
                    </button>
                )}
            />
        </div>
    );
}
