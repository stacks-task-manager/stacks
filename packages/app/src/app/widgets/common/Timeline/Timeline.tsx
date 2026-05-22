// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Classes, Colors } from "@blueprintjs/core";
import classNames from "classnames";
import React, { FunctionComponent } from "react";

import { Scroller } from "app/components/common";
import { PreferencesStore } from "app/store/preferences";
import { TimelineRow } from "./TimelineRow";
import { TimelineComponents, TimelineData } from "./types";

interface TimelineProps {
    id: string;
    title: string;
    subtitle?: string;
    tint?: string;
    data: TimelineData[];
    children?: React.ReactNode;
    components?: TimelineComponents;
    onAdd?: (id: string, rowId: string, date: Date) => void;
}
export const Timeline: FunctionComponent<TimelineProps> = ({
    id,
    title,
    subtitle,
    data,
    tint,
    children,
    components,
    onAdd,
}) => {
    const handleAddTime = (rowId: string, date: Date) => {
        if (onAdd != null) {
            onAdd(id, rowId, date);
        }
    };

    return (
        <div
            className="timeline"
            style={{
                borderColor:
                    tint ?? (PreferencesStore.get().darkMode ? Colors.DARK_GRAY1 : Colors.LIGHT_GRAY1),
            }}
        >
            <Scroller thin>
                <div className="timeline__header">
                    <div className={classNames("timeline__title", [Classes.HEADING])}>{title}</div>
                    <div className="timeline__accessory">
                        {subtitle ? <div className="timeline__subtitle">{subtitle}</div> : null}
                        {children}
                    </div>
                </div>
                <div className="timeline__rows">
                    {data.map((row, i) => (
                        <TimelineRow
                            key={row.id}
                            id={id}
                            rowId={row.id}
                            days={row.days}
                            title={row.title}
                            tint={
                                tint ??
                                (PreferencesStore.get().darkMode ? Colors.DARK_GRAY1 : Colors.LIGHT_GRAY1)
                            }
                            onAdd={onAdd != null ? handleAddTime : undefined}
                            components={components}
                        />
                    ))}
                </div>
            </Scroller>
        </div>
    );
};
