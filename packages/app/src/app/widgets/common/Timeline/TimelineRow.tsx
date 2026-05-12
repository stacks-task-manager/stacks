// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Popover, Tag } from "@blueprintjs/core";
import React, { FunctionComponent, useMemo } from "react";

import { TimelineDay } from "./TimelineDay";
import { TimelineComponents, TimelineDay as TimelineDayType, TimelinePopupProps } from "./types";

interface TimelineRowProps {
    id: string;
    rowId: string;
    title: string;
    days: TimelineDayType[];
    tint: string;
    onAdd?: (id: string, date: Date) => void;
    components?: TimelineComponents;
}
export const TimelineRow: FunctionComponent<TimelineRowProps> = ({
    id,
    rowId,
    title,
    days,
    tint,
    onAdd,
    components,
}) => {
    const total = useMemo(() => days.reduce((count, day) => count + day.hours, 0), [days]);

    return (
        <div className="timeline__row">
            <div className="timeline__row--title-wrapper">
                <div className="timeline__row--title">{title}</div>

                <div className="timeline__row--accessory">
                    <TimelineRowTotalTag
                        total={total}
                        id={id}
                        rowId={rowId}
                        popover={components?.totalPopup}
                    />
                </div>
            </div>
            <div className="timeline__days">
                {[...Array(31).keys()].map((index: number) => {
                    const date: TimelineDayType | undefined = days.at(index);
                    return (
                        <TimelineDay
                            id={id}
                            rowId={rowId}
                            key={index}
                            date={date?.date}
                            hours={date?.hours}
                            tint={tint}
                            onAdd={onAdd != null && date != null ? () => onAdd(id, date.date) : undefined}
                            components={components}
                        />
                    );
                })}
                <div className="timeline__days--total-wrapper">
                    <div className="timeline__days--total" style={{ borderColor: tint }}>
                        <strong>{total}</strong>
                        <small>Hrs</small>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface TimelineRowTotalTagProps {
    total: number;
    id: string;
    rowId: string;
    popover?: React.ComponentType<TimelinePopupProps>;
}
const TimelineRowTotalTag: FunctionComponent<TimelineRowTotalTagProps> = ({ total, id, rowId, popover }) => {
    if (popover == null) {
        return <Tag minimal>{total}Hrs</Tag>;
    }

    const PopupContent = popover;

    return (
        <Popover
            content={<PopupContent id={id} rowId={rowId} />}
            renderTarget={({ isOpen, ref, ...props }) => (
                <Tag minimal interactive ref={ref} {...props}>
                    {total}Hrs
                </Tag>
            )}
        />
    );
};
