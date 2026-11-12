// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { useEffect, useRef, useState } from "react";
import { endOfDay, startOfDay } from "date-fns";
import { DateEdit, DateRange, GanttRow } from "app/components/common/GanttChart/types";
import { dateAt, editDates } from "app/components/common/GanttChart/geometry";

interface Gesture {
    row: GanttRow;
    kind: DateEdit | "create";
    x: number;
    scroll: number;
    latestX: number;
    start: Date;
    moved: boolean;
    range: DateRange;
}

export function useBarGesture(
    scroller: React.RefObject<HTMLDivElement | null>,
    origin: Date,
    unit: number,
    paneWidth: number,
    save: (id: string, range: DateRange) => Promise<boolean>
) {
    const [preview, setPreview] = useState<{ id: string; range: DateRange } | null>(null);
    const cleanup = useRef<() => void>(() => {
        /* No gesture has started yet. */
    });
    const suppressClick = useRef(false);
    const originTime = origin.getTime();
    useEffect(() => () => cleanup.current(), [originTime, unit, paneWidth]);
    useEffect(() => {
        const reset = () => {
            suppressClick.current = false;
        };
        const key = (event: KeyboardEvent) => {
            if (event.key === "Enter" || event.key === " ") reset();
        };
        // A drag's generated click must not open a task; a new user interaction always can.
        window.addEventListener("pointerdown", reset, true);
        window.addEventListener("click", reset);
        window.addEventListener("keydown", key, true);
        return () => {
            window.removeEventListener("pointerdown", reset, true);
            window.removeEventListener("click", reset);
            window.removeEventListener("keydown", key, true);
        };
    }, []);

    const begin = (event: React.PointerEvent<HTMLElement>, row: GanttRow, kind: DateEdit | "create") => {
        if (event.button !== 0 || !scroller.current) return;
        event.preventDefault();
        event.stopPropagation();
        cleanup.current();
        suppressClick.current = false;
        const element = kind === "create" ? event.currentTarget.parentElement! : event.currentTarget;
        const viewport = scroller.current;
        const start =
            kind === "create"
                ? dateAt(
                      origin,
                      event.clientX - viewport.getBoundingClientRect().left - paneWidth + viewport.scrollLeft,
                      unit
                  )
                : row.startDate!;
        const gesture: Gesture = {
            row,
            kind,
            x: event.clientX,
            scroll: viewport.scrollLeft,
            latestX: event.clientX,
            start,
            moved: false,
            range: { startDate: start, endDate: kind === "create" ? endOfDay(start) : row.endDate! },
        };
        element.setPointerCapture(event.pointerId);
        const oldSelection = document.body.style.userSelect;
        document.body.style.userSelect = "none";
        let frame = 0;
        let ended = false;
        const update = () => {
            const days = Math.round(
                (gesture.latestX - gesture.x + viewport.scrollLeft - gesture.scroll) / unit
            );
            gesture.moved ||=
                Math.abs(gesture.latestX - gesture.x) > 3 || viewport.scrollLeft !== gesture.scroll;
            if (kind === "create") {
                const other = dateAt(start, days * unit, unit);
                gesture.range = {
                    startDate: startOfDay(other < start ? other : start),
                    endDate: endOfDay(other > start ? other : start),
                };
            } else gesture.range = editDates(start, row.endDate!, kind, days);
            setPreview({ id: row.id, range: gesture.range });
        };
        const move = (next: PointerEvent) => {
            if (next.pointerId !== event.pointerId) return;
            gesture.latestX = next.clientX;
            update();
        };
        const autoScroll = () => {
            const rect = viewport.getBoundingClientRect();
            const delta =
                gesture.latestX > rect.right - 32
                    ? 12
                    : gesture.latestX < rect.left + paneWidth + 32
                      ? -12
                      : 0;
            if (delta && gesture.moved) {
                viewport.scrollLeft += delta;
                update();
            }
            frame = requestAnimationFrame(autoScroll);
        };
        const finish = (commit: boolean) => {
            if (ended) return;
            ended = true;
            cancelAnimationFrame(frame);
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
            window.removeEventListener("pointercancel", cancel);
            window.removeEventListener("keydown", key);
            window.removeEventListener("blur", cancel);
            element.removeEventListener("lostpointercapture", cancel);
            if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
            document.body.style.userSelect = oldSelection;
            suppressClick.current = gesture.moved || kind === "create";
            setPreview(null);
            if (
                commit &&
                (kind === "create" ||
                    (gesture.moved &&
                        (gesture.range.startDate.getTime() !== row.startDate?.getTime() ||
                            gesture.range.endDate.getTime() !== row.endDate?.getTime())))
            )
                void save(row.id, gesture.range);
        };
        const up = (next: PointerEvent) => {
            if (next.pointerId === event.pointerId) finish(true);
        };
        const cancel = () => finish(false);
        const key = (next: KeyboardEvent) => {
            if (next.key === "Escape") {
                next.preventDefault();
                finish(false);
            }
        };
        cleanup.current = cancel;
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
        window.addEventListener("pointercancel", cancel);
        window.addEventListener("keydown", key);
        window.addEventListener("blur", cancel);
        element.addEventListener("lostpointercapture", cancel);
        if (kind === "create") update();
        frame = requestAnimationFrame(autoScroll);
    };
    return {
        preview,
        begin,
        consumeClick: () => {
            const suppressed = suppressClick.current;
            suppressClick.current = false;
            return suppressed;
        },
    };
}
