// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { useId } from "react";
import { isValid } from "date-fns";
import { barGeometry, flattenRows, ROW_HEIGHT } from "app/components/common/GanttChart/geometry";
import { DateRange, GanttRow } from "app/components/common/GanttChart/types";

type VisibleRow = ReturnType<typeof flattenRows>[number];

/** Parent links describe the task hierarchy; they never change scheduling constraints. */
export function parentConnections(
    rows: VisibleRow[],
    origin: Date,
    unit: number,
    first: number,
    last: number,
    ranges: Record<string, DateRange> = {}
) {
    const parents: { row: GanttRow; index: number }[] = [];
    const links: { parent: string; child: string; path: string }[] = [];
    const geometry = (row: GanttRow) => {
        const start = ranges[row.id]?.startDate ?? row.startDate;
        const end = ranges[row.id]?.endDate ?? row.endDate;
        return start && end && isValid(start) && isValid(end) && end >= start
            ? barGeometry(origin, start, end, unit)
            : null;
    };
    for (let index = 0; index < Math.min(last, rows.length); index++) {
        const { row, depth } = rows[index];
        const parent = parents[depth - 1];
        parents.length = depth;
        parents.push({ row, index });
        if (!parent || index < first) continue;
        const from = geometry(parent.row);
        const to = geometry(row);
        if (!from || !to) continue;
        const sourceX = from.left + Math.max(28, from.width);
        const sourceY = parent.index * ROW_HEIGHT + 18;
        const targetX = to.left;
        const targetY = index * ROW_HEIGHT + 18;
        const path =
            targetX >= sourceX + 24
                ? `M ${sourceX} ${sourceY} H ${targetX - 12} V ${targetY} H ${targetX}`
                : `M ${sourceX} ${sourceY} H ${sourceX + 12} V ${sourceY + 24} H ${
                      targetX - 12
                  } V ${targetY} H ${targetX}`;
        links.push({ parent: parent.row.id, child: row.id, path });
    }
    return links;
}

export function HierarchyLinks({
    rows,
    origin,
    unit,
    paneWidth,
    left,
    width,
    first,
    last,
    ranges,
}: {
    rows: VisibleRow[];
    origin: Date;
    unit: number;
    paneWidth: number;
    left: number;
    width: number;
    first: number;
    last: number;
    ranges: Record<string, DateRange>;
}) {
    const marker = `gantt-arrow-${useId().replace(/:/g, "")}`;
    const height = Math.max(0, last - first) * ROW_HEIGHT;
    if (!height) return null;
    return (
        <svg
            className="stacks-gantt-links"
            data-testid="gantt-links"
            aria-hidden="true"
            width={width}
            height={height}
            viewBox={`${left} ${first * ROW_HEIGHT} ${width} ${height}`}
            style={{ left: paneWidth + left, top: first * ROW_HEIGHT }}
        >
            <defs>
                <marker
                    id={marker}
                    viewBox="0 0 8 8"
                    refX="8"
                    refY="4"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto"
                >
                    <path d="M 0 0 L 8 4 L 0 8 Z" />
                </marker>
            </defs>
            {parentConnections(rows, origin, unit, first, last, ranges).map(link => (
                <path
                    key={link.child}
                    data-testid={`gantt-link-${link.parent}-${link.child}`}
                    d={link.path}
                    markerEnd={`url(#${marker})`}
                />
            ))}
        </svg>
    );
}
