// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { isSameDay } from "date-fns";
import React from "react";
import { TimelineTick } from "app/components/common/GanttChart/geometry";

export function TimelineHeader({
    ticks,
    width,
    left,
    today,
}: {
    ticks: TimelineTick[];
    width: number;
    left: number;
    today: Date;
}) {
    const groups: { left: number; end: number; label: string }[] = [];
    for (const tick of ticks) {
        const previous = groups[groups.length - 1];
        if (previous?.label === tick.major) previous.end = tick.left + tick.width;
        else groups.push({ left: tick.left, end: tick.left + tick.width, label: tick.major });
    }
    return (
        <div className="stacks-gantt-axis" style={{ width }}>
            {groups.map(group => (
                <small
                    className="stacks-gantt-major"
                    key={group.left}
                    style={{
                        left: Math.max(left, group.left),
                        width: group.end - Math.max(left, group.left),
                    }}
                >
                    {group.label}
                </small>
            ))}
            {ticks.map(tick => {
                const current = isSameDay(tick.date, today);
                return (
                    <span
                        key={tick.left}
                        className={`stacks-gantt-tick${current ? " stacks-gantt-tick-today" : ""}`}
                        style={{ left: tick.left, width: tick.width }}
                    >
                        <span
                            className={`stacks-gantt-tick-label${
                                current ? " stacks-gantt-tick-label-today" : ""
                            }`}
                        >
                            {tick.label}
                        </span>
                    </span>
                );
            })}
        </div>
    );
}
