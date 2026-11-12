// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Button } from "@blueprintjs/core";
import { translate } from "@stacks/translations";
import { differenceInCalendarDays, format, isValid } from "date-fns";
import React from "react";
import { barGeometry, ROW_HEIGHT } from "app/components/common/GanttChart/geometry";
import { DateEdit, DateRange, GanttRow } from "app/components/common/GanttChart/types";

interface Props {
    row: GanttRow;
    depth: number;
    guides: number[];
    hasNextSibling: boolean;
    index: number;
    collapsed: boolean;
    paneWidth: number;
    origin: Date;
    unit: number;
    left: number;
    viewportWidth: number;
    timelineWidth: number;
    range?: DateRange;
    pending: boolean;
    onToggle: () => void;
    onActivate: () => void;
    onEdit: () => void;
    onReveal: (x: number) => void;
    onBegin: (event: React.PointerEvent<HTMLElement>, kind: DateEdit | "create") => void;
}

const TREE_LINE_OFFSET = 15;
const TREE_LEVEL_GAP = 20;

export function TaskRow({
    row,
    depth,
    guides,
    hasNextSibling,
    index,
    collapsed,
    paneWidth,
    origin,
    unit,
    left,
    viewportWidth,
    timelineWidth,
    range,
    pending,
    onToggle,
    onActivate,
    onEdit,
    onReveal,
    onBegin,
}: Props) {
    const start = range?.startDate ?? row.startDate;
    const end = range?.endDate ?? row.endDate;
    const valid = start && end && isValid(start) && isValid(end) && end >= start;
    const bar = valid ? barGeometry(origin, start, end, unit) : null;
    const offscreen = bar && (bar.left + bar.width < left || bar.left > left + viewportWidth);
    const description = valid
        ? `${format(start, "PP")} – ${format(end, "PP")} · ${
              differenceInCalendarDays(end, start) + 1
          } ${translate("days")}`
        : translate("Edit dates");

    const firstPadding = row.children.length ? 8 : 15;
    const padding = (depth === 0 ? firstPadding : 8) + depth * 20;

    return (
        <div
            className="stacks-gantt-row"
            data-testid={`gantt-row-${row.id}`}
            style={{ top: index * ROW_HEIGHT, height: ROW_HEIGHT }}
        >
            {paneWidth > 0 && (
                <div className="stacks-gantt-task" style={{ width: paneWidth, paddingLeft: padding }}>
                    {guides.map(level => (
                        <svg
                            key={level}
                            className="stacks-gantt-tree-guide"
                            data-testid={`gantt-tree-guide-${row.id}-${level}`}
                            aria-hidden="true"
                            width="1"
                            height={ROW_HEIGHT}
                            style={{ left: TREE_LINE_OFFSET + (level - 1) * TREE_LEVEL_GAP }}
                        >
                            <path d={`M 0.5 0 V ${ROW_HEIGHT}`} />
                        </svg>
                    ))}
                    {row.children.length > 0 && (
                        <svg
                            className="stacks-gantt-tree-child-line"
                            data-testid={`gantt-tree-child-line-${row.id}`}
                            aria-hidden="true"
                            width="1"
                            height={ROW_HEIGHT}
                            style={{ left: TREE_LINE_OFFSET + depth * TREE_LEVEL_GAP }}
                        >
                            <path d="M 0.5 38 V 48" />
                        </svg>
                    )}
                    {depth > 0 && (
                        <svg
                            className="stacks-gantt-tree-arrow"
                            data-testid={`gantt-tree-arrow-${row.id}`}
                            aria-hidden="true"
                            width="32"
                            height="48"
                            style={{ left: TREE_LINE_OFFSET + (depth - 1) * TREE_LEVEL_GAP }}
                        >
                            <path d={`M 0.5 0 V ${hasNextSibling ? ROW_HEIGHT : 24.5} M 0.5 24.5 H 10`} />
                        </svg>
                    )}
                    {row.children.length > 0 ? (
                        <button
                            type="button"
                            className="stacks-gantt-tree-toggle"
                            data-testid={`gantt-toggle-${row.id}`}
                            aria-label={row.name}
                            aria-expanded={!collapsed}
                            onClick={onToggle}
                        >
                            <svg aria-hidden="true" viewBox="0 0 12 12">
                                <path d={collapsed ? "M 4 2 L 8 6 L 4 10" : "M 2 4 L 6 8 L 10 4"} />
                            </svg>
                        </button>
                    ) : (
                        depth === 0 && <span className="stacks-gantt-indent" />
                    )}
                    <button
                        className="stacks-gantt-task-title"
                        data-testid={`gantt-task-${row.id}`}
                        onClick={onActivate}
                        title={row.name}
                    >
                        <span>{row.name}</span>
                        {row.secondaryLabel && (
                            <small>
                                <i
                                    data-testid={`gantt-task-color-${row.id}`}
                                    className={row.color ? undefined : "stacks-gantt-default-tint"}
                                    style={row.color ? { backgroundColor: row.color } : undefined}
                                />
                                {row.secondaryLabel}
                            </small>
                        )}
                    </button>
                    <Button
                        variant="minimal"
                        size="small"
                        disabled={pending}
                        data-testid={`gantt-edit-${row.id}`}
                        aria-label={`${translate("Edit dates")} · ${row.name}`}
                        onClick={onEdit}
                    >
                        …
                    </Button>
                </div>
            )}
            <div className="stacks-gantt-track" style={{ width: timelineWidth }}>
                {!bar && (
                    <button
                        className="stacks-gantt-schedule"
                        data-testid={`gantt-schedule-${row.id}`}
                        aria-label={`${translate("Edit dates")} · ${row.name}`}
                        style={{ left, width: viewportWidth }}
                        disabled={pending}
                        onPointerDown={event => onBegin(event, "create")}
                        onClick={event => {
                            if (event.detail === 0) onEdit();
                        }}
                    >
                        {translate("Edit dates")}
                    </button>
                )}
                {bar && !offscreen && (
                    <div
                        className="stacks-gantt-bar-group"
                        style={{ left: bar.left, width: Math.max(28, bar.width) }}
                        data-pending={pending || undefined}
                    >
                        <button
                            className="stacks-gantt-bar"
                            data-testid={`gantt-bar-${row.id}`}
                            data-start={format(start!, "yyyy-MM-dd")}
                            data-end={format(end!, "yyyy-MM-dd")}
                            style={{ backgroundColor: row.color }}
                            title={`${row.name} · ${description}`}
                            aria-label={`${row.name} · ${description}`}
                            aria-busy={pending}
                            disabled={pending}
                            onPointerDown={event => onBegin(event, "move")}
                            onClick={onActivate}
                            onKeyDown={event => {
                                if (event.key === "F2") {
                                    event.preventDefault();
                                    onEdit();
                                }
                            }}
                        >
                            {row.name}
                        </button>
                        <button
                            tabIndex={-1}
                            className="stacks-gantt-handle stacks-gantt-handle-left"
                            disabled={pending}
                            aria-label={translate("Start date")}
                            data-testid={`gantt-resize-left-${row.id}`}
                            onPointerDown={event => onBegin(event, "left")}
                        />
                        <button
                            tabIndex={-1}
                            className="stacks-gantt-handle stacks-gantt-handle-right"
                            disabled={pending}
                            aria-label={translate("Due date")}
                            data-testid={`gantt-resize-right-${row.id}`}
                            onPointerDown={event => onBegin(event, "right")}
                        />
                        <span
                            className="stacks-gantt-date-text"
                            style={{ left: Math.max(0, left - bar.left) }}
                        >
                            {description}
                        </span>
                    </div>
                )}
                {offscreen && (
                    <Button
                        small
                        minimal
                        className="stacks-gantt-reveal"
                        data-testid={`gantt-reveal-${row.id}`}
                        style={{ left: left + (bar.left < left ? 8 : Math.max(8, viewportWidth - 32)) }}
                        title={description}
                        aria-label={`${translate("Show task")} · ${row.name}`}
                        onClick={() => onReveal(bar.left)}
                    >
                        {bar.left < left ? "‹" : "›"}
                    </Button>
                )}
            </div>
        </div>
    );
}
