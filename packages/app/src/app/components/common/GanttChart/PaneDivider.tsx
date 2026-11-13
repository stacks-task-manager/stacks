// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React, { useEffect, useRef } from "react";
import { Icon } from "app/components/common/Icon/Icon";
import { clampPaneWidth, MIN_PANE_WIDTH } from "app/components/common/GanttChart/geometry";

export function PaneDivider({
    width,
    availableWidth,
    onResize,
    onTogglePane,
}: {
    width: number;
    availableWidth: number;
    onResize: (width: number) => void;
    onTogglePane: () => void;
}) {
    const cleanup = useRef<() => void>(() => {
        /* No gesture has started yet. */
    });
    useEffect(() => () => cleanup.current(), []);
    const collapsed = width === 0;
    const beginResize = (event: React.PointerEvent<HTMLDivElement>) => {
        if (event.button !== 0) return;
        event.preventDefault();
        cleanup.current();
        const x = event.clientX;
        const oldSelection = document.body.style.userSelect;
        document.body.style.userSelect = "none";
        const move = (next: PointerEvent) =>
            onResize(clampPaneWidth(width + next.clientX - x, availableWidth));
        let ended = false;
        const end = () => {
            if (ended) return;
            ended = true;
            document.body.style.userSelect = oldSelection;
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", end);
            window.removeEventListener("pointercancel", end);
            window.removeEventListener("blur", end);
            window.removeEventListener("keydown", key);
        };
        const key = (next: KeyboardEvent) => {
            if (next.key === "Escape") {
                onResize(width);
                end();
            }
        };
        cleanup.current = end;
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", end);
        window.addEventListener("pointercancel", end);
        window.addEventListener("blur", end);
        window.addEventListener("keydown", key);
    };
    return (
        <div
            className={`stacks-gantt-divider${collapsed ? " stacks-gantt-divider-collapsed" : ""}`}
            data-testid="gantt-divider"
            style={{ left: collapsed ? 0 : width - 3 }}
        >
            {!collapsed && (
                <div
                    className="stacks-gantt-divider-handle"
                    role="separator"
                    aria-label={translate("Task pane")}
                    aria-orientation="vertical"
                    aria-valuemin={MIN_PANE_WIDTH}
                    aria-valuemax={Math.max(MIN_PANE_WIDTH, availableWidth - MIN_PANE_WIDTH)}
                    aria-valuenow={Math.round(width)}
                    tabIndex={0}
                    onPointerDown={beginResize}
                    onKeyDown={event => {
                        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                            event.preventDefault();
                            onResize(
                                clampPaneWidth(
                                    width + (event.key === "ArrowRight" ? 20 : -20),
                                    availableWidth
                                )
                            );
                        }
                    }}
                />
            )}
            <button
                type="button"
                className="stacks-gantt-pane-toggle"
                data-testid="gantt-pane-toggle"
                aria-label={translate("Task pane")}
                aria-pressed={!collapsed}
                onClick={onTogglePane}
            >
                <Icon icon={collapsed ? "chevron-right" : "chevron-left"} size={12} />
            </button>
        </div>
    );
}
