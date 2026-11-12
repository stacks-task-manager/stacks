// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Button } from "@blueprintjs/core";
import { translate } from "@stacks/translations";
import { addDays, differenceInCalendarDays, startOfDay } from "date-fns";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { HierarchyLinks } from "app/components/common/GanttChart/HierarchyLinks";
import { ChartToolbar } from "app/components/common/GanttChart/ChartToolbar";
import { PaneDivider } from "app/components/common/GanttChart/PaneDivider";
import { TimelineHeader } from "app/components/common/GanttChart/TimelineHeader";
import { DateEditor } from "app/components/common/GanttChart/DateEditor";
import {
    barGeometry,
    dateAt,
    flattenRows,
    HEADER_HEIGHT,
    pixelsPerDay,
    ROW_HEIGHT,
    timelineTicks,
    visibleWindow,
} from "app/components/common/GanttChart/geometry";
import { TaskRow } from "app/components/common/GanttChart/TaskRow";
import { ScalePicker } from "app/components/common/GanttChart/ScalePicker";
import { DateRange, GanttChartProps, GanttRow, GanttScale } from "app/components/common/GanttChart/types";
import { useBarGesture } from "app/components/common/GanttChart/useBarGesture";
import "./_GanttChart.scss";

export function GanttChart({ title, rows, onActivate, onDatesChange }: GanttChartProps) {
    const scroller = useRef<HTMLDivElement>(null);
    const [today] = useState(() => startOfDay(new Date()));
    const [scale, setScale] = useState<GanttScale>("day");
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
    const [paneWidth, setPaneWidth] = useState(300);
    const [hidePane, setHidePane] = useState(false);
    const [viewport, setViewport] = useState({ width: 800, height: 400, left: 0, top: 0 });
    const [editing, setEditing] = useState<GanttRow | null>(null);
    const [pending, setPending] = useState<Record<string, DateRange>>({});
    const saving = useRef(new Set<string>());
    const mounted = useRef(true);
    const anchor = useRef<Date | null>(today);
    const initialScroll = useRef(true);
    const unit = pixelsPerDay[scale];
    const taskWidth = hidePane ? 0 : Math.min(paneWidth, Math.max(120, viewport.width - 120));
    const chartWidth = Math.max(80, viewport.width - taskWidth);
    const allRows = useMemo(() => flattenRows(rows, new Set()), [rows]);
    const visibleRows = useMemo(() => flattenRows(rows, collapsed), [rows, collapsed]);
    const expandableIds = useMemo(
        () => allRows.filter(({ row }) => row.children.length).map(({ row }) => row.id),
        [allRows]
    );
    const allCollapsed = expandableIds.length > 0 && expandableIds.every(id => collapsed.has(id));
    const { origin, timelineWidth } = useMemo(() => {
        let first = addDays(today, -3650);
        let last = addDays(today, 3650);
        for (const { row } of allRows) {
            if (row.startDate && row.startDate < first) first = addDays(row.startDate, -366);
            if (row.endDate && row.endDate > last) last = addDays(row.endDate, 366);
        }
        return {
            origin: startOfDay(first),
            timelineWidth: Math.max(chartWidth, differenceInCalendarDays(last, first) * unit),
        };
    }, [allRows, today, unit, chartWidth]);
    const readViewport = useCallback(() => {
        const element = scroller.current;
        if (element)
            setViewport({
                width: element.clientWidth,
                height: element.clientHeight,
                left: element.scrollLeft,
                top: element.scrollTop,
            });
    }, []);
    useLayoutEffect(() => {
        const element = scroller.current;
        if (!element) return;
        const observer = new ResizeObserver(readViewport);
        observer.observe(element);
        readViewport();
        return () => observer.disconnect();
    }, [readViewport]);
    const previousOrigin = useRef(origin);
    useLayoutEffect(() => {
        if (anchor.current && scroller.current) {
            scroller.current.scrollLeft = Math.max(
                0,
                barGeometry(origin, anchor.current, anchor.current, unit).left -
                    (initialScroll.current ? 24 : 0)
            );
            initialScroll.current = false;
            anchor.current = null;
            readViewport();
        } else if (scroller.current && previousOrigin.current.getTime() !== origin.getTime()) {
            scroller.current.scrollLeft =
                viewport.left + differenceInCalendarDays(previousOrigin.current, origin) * unit;
            readViewport();
        }
        previousOrigin.current = origin;
    }, [origin, unit, readViewport, viewport.left]);
    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);
    const save = async (id: string, range: DateRange) => {
        if (saving.current.has(id)) return false;
        saving.current.add(id);
        setPending(current => ({ ...current, [id]: range }));
        try {
            await onDatesChange(id, range);
            return true;
        } catch {
            // The API layer reports the error. Clearing the preview restores persisted dates.
            return false;
        } finally {
            saving.current.delete(id);
            if (mounted.current)
                setPending(current => {
                    const next = { ...current };
                    delete next[id];
                    return next;
                });
        }
    };
    const gesture = useBarGesture(scroller, origin, unit, taskWidth, save);
    const rowWindow = visibleWindow(
        viewport.top,
        Math.max(0, viewport.height - HEADER_HEIGHT),
        visibleRows.length
    );
    const ticks = useMemo(
        () => timelineTicks(origin, viewport.left, chartWidth, scale),
        [origin, viewport.left, chartWidth, scale]
    );
    const todayX = differenceInCalendarDays(today, origin) * unit;
    const reveal = (x: number) => {
        if (scroller.current) scroller.current.scrollLeft = Math.max(0, x - 24);
    };
    return (
        <section className="stacks-gantt" data-testid="gantt-chart" aria-label={translate("Gantt")}>
            <ChartToolbar
                scale={scale}
                paneVisible={!hidePane}
                onToday={() => reveal(todayX)}
                onScale={next => {
                    anchor.current = dateAt(origin, viewport.left, unit);
                    setScale(next);
                }}
                onPane={() => setHidePane(value => !value)}
                onTop={() => {
                    if (scroller.current) scroller.current.scrollTop = 0;
                }}
            />
            <div className="stacks-gantt-body">
                <div
                    className="stacks-gantt-viewport"
                    ref={scroller}
                    data-testid="gantt-viewport"
                    tabIndex={0}
                    aria-label={translate("Gantt")}
                    onScroll={readViewport}
                >
                    <div className="stacks-gantt-content" style={{ width: taskWidth + timelineWidth }}>
                        <div className="stacks-gantt-header">
                            {taskWidth > 0 && (
                                <div className="stacks-gantt-task-heading" style={{ width: taskWidth }}>
                                    <span className="stacks-gantt-task-heading-title">{title}</span>
                                    <Button
                                        size="small"
                                        variant="minimal"
                                        disabled={!expandableIds.length}
                                        icon={
                                            <span className="stacks-gantt-toggle-icon" aria-hidden>
                                                {allCollapsed ? "+" : "−"}
                                            </span>
                                        }
                                        aria-label={translate(allCollapsed ? "Expand all" : "Collapse all")}
                                        data-testid="gantt-toggle-all"
                                        onClick={() =>
                                            setCollapsed(allCollapsed ? new Set() : new Set(expandableIds))
                                        }
                                    />
                                </div>
                            )}
                            <TimelineHeader ticks={ticks} width={timelineWidth} left={viewport.left} />
                            <ScalePicker
                                scale={scale}
                                onScale={next => {
                                    anchor.current = dateAt(origin, viewport.left, unit);
                                    setScale(next);
                                }}
                            />
                        </div>
                        <div
                            className="stacks-gantt-rows"
                            style={{ height: visibleRows.length * ROW_HEIGHT }}
                        >
                            <div
                                className="stacks-gantt-grid"
                                data-testid="gantt-grid"
                                style={{ left: taskWidth, width: timelineWidth }}
                                aria-hidden
                            >
                                {ticks.map(tick => (
                                    <div
                                        key={tick.left}
                                        className={tick.weekend ? "stacks-gantt-weekend" : ""}
                                        style={{ left: tick.left, width: tick.width }}
                                    />
                                ))}
                                <div className="stacks-gantt-today-line" style={{ left: todayX }} />
                            </div>
                            <HierarchyLinks
                                rows={visibleRows}
                                origin={origin}
                                unit={unit}
                                paneWidth={taskWidth}
                                left={viewport.left}
                                width={chartWidth}
                                first={rowWindow.start}
                                last={rowWindow.end}
                                ranges={
                                    gesture.preview
                                        ? { ...pending, [gesture.preview.id]: gesture.preview.range }
                                        : pending
                                }
                            />
                            {visibleRows
                                .slice(rowWindow.start, rowWindow.end)
                                .map(({ row, depth, guides, hasNextSibling }, offset) => (
                                    <TaskRow
                                        key={row.id}
                                        row={row}
                                        depth={depth}
                                        guides={guides}
                                        hasNextSibling={hasNextSibling}
                                        index={rowWindow.start + offset}
                                        collapsed={collapsed.has(row.id)}
                                        paneWidth={taskWidth}
                                        origin={origin}
                                        unit={unit}
                                        left={viewport.left}
                                        viewportWidth={chartWidth}
                                        timelineWidth={timelineWidth}
                                        range={
                                            gesture.preview?.id === row.id
                                                ? gesture.preview.range
                                                : pending[row.id]
                                        }
                                        pending={Boolean(pending[row.id])}
                                        onToggle={() =>
                                            setCollapsed(current => {
                                                const next = new Set(current);
                                                if (next.has(row.id)) next.delete(row.id);
                                                else next.add(row.id);
                                                return next;
                                            })
                                        }
                                        onActivate={() => {
                                            if (!gesture.consumeClick()) onActivate(row.id);
                                        }}
                                        onEdit={() => setEditing(row)}
                                        onReveal={reveal}
                                        onBegin={(event, kind) => {
                                            if (!saving.current.has(row.id)) gesture.begin(event, row, kind);
                                        }}
                                    />
                                ))}
                        </div>
                    </div>
                </div>
                {taskWidth > 0 && (
                    <PaneDivider width={taskWidth} availableWidth={viewport.width} onResize={setPaneWidth} />
                )}
            </div>
            {editing && (
                <DateEditor
                    key={editing.id}
                    row={editing}
                    onClose={() => setEditing(null)}
                    onSave={range => save(editing.id, range)}
                />
            )}
        </section>
    );
}
