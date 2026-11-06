// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React, { useEffect, useRef } from "react";

export function PaneDivider({
    width,
    availableWidth,
    onResize,
}: {
    width: number;
    availableWidth: number;
    onResize: (width: number) => void;
}) {
    const cleanup = useRef<() => void>(() => {
        /* No gesture has started yet. */
    });
    useEffect(() => () => cleanup.current(), []);
    const clamp = (value: number) => Math.max(120, Math.min(Math.max(120, availableWidth - 120), value));
    return (
        <div
            className="stacks-gantt-divider"
            data-testid="gantt-divider"
            role="separator"
            aria-label={translate("Task pane")}
            aria-orientation="vertical"
            aria-valuemin={120}
            aria-valuemax={Math.max(120, availableWidth - 120)}
            aria-valuenow={Math.round(width)}
            tabIndex={0}
            style={{ left: width - 3 }}
            onPointerDown={event => {
                if (event.button !== 0) return;
                event.preventDefault();
                cleanup.current();
                const x = event.clientX;
                const oldSelection = document.body.style.userSelect;
                document.body.style.userSelect = "none";
                const move = (next: PointerEvent) => onResize(clamp(width + next.clientX - x));
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
            }}
            onKeyDown={event => {
                if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                    event.preventDefault();
                    onResize(clamp(width + (event.key === "ArrowRight" ? 20 : -20)));
                }
            }}
        />
    );
}
