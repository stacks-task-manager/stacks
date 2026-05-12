// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Button, Colors, Intent, Tooltip } from "@blueprintjs/core";
import classNames from "classnames";
import { format, isToday as isTodayFns, getDay, isValid, endOfDay, formatDistanceToNow } from "date-fns";
import React, { FunctionComponent, useMemo } from "react";
import { Icon } from "app/components/common";
import { adjustColor } from "app/utils/colors";
import { TimelineTag } from "./TimelineTag";
import { TimelineComponents } from "./types";

interface TimelineDayProps {
    id: string;
    rowId: string;
    date?: Date;
    hours?: number;
    tint: string;
    disabled?: boolean;
    onAdd?: () => void;
    components?: TimelineComponents;
}
export const TimelineDay: FunctionComponent<TimelineDayProps> = ({
    id,
    rowId,
    date,
    hours,
    tint,
    disabled,
    onAdd,
    components,
}) => {
    const dateObj = useMemo(() => date ? new Date(date) : null, [date]);

    const isToday = useMemo(() => dateObj && isValid(dateObj) && isTodayFns(dateObj), [dateObj]);

    const isWeekend = useMemo(() => {
        if (!dateObj || !isValid(dateObj)) return false;
        const dayOfWeek = getDay(dateObj);
        return dayOfWeek === 0 || dayOfWeek === 6;
    }, [dateObj]);

    const todayProgress = useMemo(() => {
        if (!dateObj || !isValid(dateObj)) return null;

        const currentHour = new Date().getHours();
        const left = (currentHour * 100) / 24;
        const tooltip = formatDistanceToNow(endOfDay(new Date()), { addSuffix: true });
        return isToday ? <TimelineTodayProgress value={left} tooltip={`Ends ${tooltip}`} /> : null;
    }, [isToday, dateObj]);

    const dot = useMemo(() => {
        if ((hours != null && hours > 0) || date == null) return null;
        return (
            <Tooltip
                content="There is no time logged on this date"
                placement="top"
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                renderTarget={({ isOpen, ...props }) => (
                    <div {...props} className="timeline__day--dot" style={{ backgroundColor: tint }} />
                )}
            />
        );
    }, [date, hours]);

    let color = undefined;
    if (isWeekend) {
        if (tint === Colors.DARK_GRAY1 || tint === Colors.LIGHT_GRAY1) {
            color = Colors.ORANGE3;
        } else {
            color = adjustColor(tint, -100);
        }
    }

    return (
        <div
            className={classNames("timeline__day", {
                off: date == null,
                "has-action": onAdd != null,
                "is-today": isToday,
                "is-weekend": isWeekend,
            })}
        >
            {todayProgress}

            <div className="timeline__day--date">
                <span style={{ color }}>{dateObj ? format(dateObj, "d") : ""}</span>
                <span style={{ color }}>{dateObj ? format(dateObj, "eee") : ""}</span>
            </div>
            <div className="timeline__day--time">
                <div className="time-line" style={{ backgroundColor: tint }} />
                {hours != null && hours > 0 && date ? (
                    <TimelineTag
                        id={id}
                        rowId={rowId}
                        value={hours}
                        tint={tint}
                        lighten={isWeekend}
                        popover={components?.dayPopup}
                        date={date}
                    />
                ) : (
                    dot
                )}
            </div>
            {disabled || onAdd == null ? null : (
                <div className="timeline__day--action">
                    <Tooltip
                        content={`Log time on ${date ? format(new Date(date), "MMM d, yyyy") : ""}`}
                        placement="bottom"
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        renderTarget={({ isOpen, ref, ...props }) => (
                            <Button
                                minimal
                                icon={<Icon icon="plus" />}
                                intent={Intent.PRIMARY}
                                ref={ref}
                                {...props}
                                onClick={onAdd}
                            />
                        )}
                    />
                </div>
            )}
        </div>
    );
};

interface TimelineTodayProgressProps {
    value: number;
    tooltip: string;
}
const TimelineTodayProgress: FunctionComponent<TimelineTodayProgressProps> = ({ value, tooltip }) => {
    return (
        <Tooltip
            content={tooltip}
            placement="top"
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            renderTarget={({ isOpen, ...props }) => (
                <div {...props} className="timeline__today-progress" style={{ left: `${value}%` }}>
                    <span>
                        {translate("Today")}
                    </span>
                </div>
            )}
        />
    );
};
