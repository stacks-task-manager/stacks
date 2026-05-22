// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Intent, Placement, Tag, Tooltip } from "@blueprintjs/core";
import { format, isThisYear, isToday, isTomorrow, isYesterday } from "date-fns";
import React, { useMemo } from "react";
import { Icon, RoundButton } from "app/components/common";
import { formatDate } from "app/utils/date";

interface IDateChipProps {
    id?: string;
    startDate?: Date;
    dueDate?: Date;
    intent?: Intent;
    icon?: string | false;
    hideTooltip?: boolean;
    disabled?: boolean;
    minimal?: boolean;
    placement?: Placement;
    extendedFormat?: boolean | string;
    simple?: boolean;
    testId?: string;
    onRemove?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}
export const DateChip: React.FC<IDateChipProps> = ({
    id,
    startDate,
    dueDate,
    intent,
    icon,
    hideTooltip,
    disabled,
    minimal,
    placement,
    extendedFormat,
    simple,
    testId,
    onRemove,
}) => {
    const getDate = useMemo(() => {
        if (extendedFormat != null) {
            const dates = [];
            if (startDate) dates.push(startDate);
            if (dueDate) dates.push(dueDate);

            return dates
                .map(date => {
                    if (typeof extendedFormat === "string") {
                        return format(date, extendedFormat);
                    }
                    return format(date, date.allDay ? "PPP" : "PPp");
                })
                .join(" - ");
        }

        let sameYear = true;
        let sameMonth = true;
        let label = "";

        if (startDate != null && dueDate != null) {
            sameYear = !!(startDate && dueDate &&
                startDate.getFullYear() === dueDate.getFullYear() &&
                isThisYear(startDate) &&
                isThisYear(dueDate));

            sameMonth = !!(startDate && dueDate && startDate.getMonth() === dueDate.getMonth());

            if (sameYear) {
                if (sameMonth) {
                    label = `${formatDate(startDate, "d")} - ${formatDate(dueDate, "d MMM")}`;
                } else {
                    label = `${formatDate(startDate, "d MMM")} - ${formatDate(dueDate, "d MMM")}`;
                }
            } else {
                const startCurrentYear = isThisYear(startDate);
                const dueCurrentYear = isThisYear(dueDate);
                const fromFormat = startCurrentYear ? "d MMM" : "d MMM, yy";
                const toFormat = dueCurrentYear ? "d MMM" : "d MMM, yy";
                label = `${formatDate(startDate, fromFormat)} - ${formatDate(dueDate, toFormat)}`;
            }
        } else if (startDate != null && dueDate == null) {
            // is today
            if (isToday(startDate)) return translate("Today");
            // is tomorrow
            if (isTomorrow(startDate)) return translate("Tomorrow");
            // is yesterday
            if (isYesterday(startDate)) return "Yesterday";

            label = formatDate(startDate, isThisYear(startDate) ? "d MMM" : "d MMM, yyyy") || "";
        } else if (startDate == null && dueDate != null) {
            // is today
            if (isToday(dueDate)) return translate("Today");
            // is tomorrow
            if (isTomorrow(dueDate)) return translate("Tomorrow");
            // is yesterday
            if (isYesterday(dueDate)) return translate("Yesterday");

            label = formatDate(dueDate, isThisYear(dueDate) ? "d MMM" : "d MMM, yyyy") || "";
        } else {
            label = translate("No date");
        }

        return label;
    }, [startDate, dueDate, extendedFormat]);

    const getCompleteDate = useMemo(() => {
        if (startDate && dueDate) {
            return (
                format(startDate, startDate.allDay ? "PPP" : "PPPp") +
                " - " +
                format(dueDate, dueDate.allDay ? "PPP" : "PPPp")
            );
        } else if (startDate && !dueDate) {
            return format(startDate, startDate.allDay ? "PPP" : "PPPp");
        } else if (!startDate && dueDate) {
            return format(dueDate, dueDate.allDay ? "PPP" : "PPPp");
        }
        return undefined;
    }, [startDate, dueDate]);

    const hasTime = useMemo(() => {
        if (!startDate && !dueDate) return false;
        return (dueDate && !dueDate.allDay) || (startDate && !startDate.allDay);
    }, [startDate, dueDate]);

    const renderIcon = useMemo(() => {
        if (simple || icon === false) return null;
        if (icon) return <Icon icon={icon} size={14} />;
        return hasTime ? <Icon icon="clock" size={14} /> : <Icon icon="calendar-date" size={14} />;
    }, [hasTime]);

    const handleClearDate = (e: React.MouseEvent<HTMLButtonElement>) => {
        e?.stopPropagation();

        if (onRemove) {
            onRemove(e);
        }
    };

    if (!dueDate && !startDate) {
        return (
            <RoundButton
                id={id}
                dashed
                icon={minimal ? "date-add" : undefined}
                title={minimal ? undefined : translate("Add date")}
                tooltip={minimal ? translate("Add date") : undefined}
                disabled={disabled}
                testId={testId}
            />
        );
    }

    return (
        <Tooltip
            content={!hideTooltip ? getCompleteDate : ""}
            placement={placement || "top"}
            disabled={extendedFormat != null}
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            renderTarget={({ isOpen, ...props }) => (
                <Tag
                    id={id}
                    className={disabled ? "btn" : undefined}
                    minimal
                    intent={intent}
                    interactive={!disabled}
                    icon={renderIcon}
                    onRemove={disabled || simple ? undefined : handleClearDate}
                    style={{
                        backgroundColor: simple ? "transparent" : undefined,
                        padding: simple ? 0 : undefined,
                        fontWeight: simple ? 500 : undefined,
                    }}
                    data-testid={testId}
                    {...props}
                >
                    {getDate}
                </Tag>
            )}
        />
    );
};
