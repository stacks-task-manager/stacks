// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent } from "react";
import classNames from "classnames";

import { TimelineDayPopupProps } from "./types";
import { adjustColor } from "app/utils/colors";
import { Popover } from "@blueprintjs/core";

interface TimelineTagProps {
    id: string;
    rowId: string;
    tint: string;
    value: number;
    date: Date;
    lighten?: boolean;
    popover?: React.ComponentType<TimelineDayPopupProps>;
}
export const TimelineTag: FunctionComponent<TimelineTagProps> = ({
    id,
    rowId,
    value,
    tint,
    date,
    lighten,
    popover,
}) => {
    if (popover == null) {
        return (
            <div
                className="time-tag unclickable"
                style={{ backgroundColor: lighten ? adjustColor(tint, 60) : tint, borderColor: tint }}
            >
                <strong>{value}</strong>
                <small>hrs</small>
            </div>
        );
    }

    const PopupContent = popover;

    return (
        <Popover
            content={<PopupContent id={id} rowId={rowId} date={date} />}
            renderTarget={({ isOpen, className, ...props }) => (
                <div
                    className={classNames("time-tag", [className], { open: isOpen })}
                    style={{ backgroundColor: lighten ? adjustColor(tint, 60) : tint, borderColor: tint }}
                    {...props}
                >
                    <strong>{value}</strong>
                    <small>hrs</small>
                </div>
            )}
        />
    );
};
