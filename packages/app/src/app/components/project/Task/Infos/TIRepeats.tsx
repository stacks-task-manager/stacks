// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React, { FunctionComponent, useMemo } from "react";
import { Intent, Popover, Tag, Tooltip } from "@blueprintjs/core";
import { TasksActions } from "app/store/actions";
import { RoundButton, Icon } from "app/components/common";
import { defaultRepeats, RepeatPicker } from "app/components/project";
import { IRepeats, REPEATTYPE } from "@stacks/types";
import { format, setDay, setDate } from "date-fns";

interface ITIRepeatsProps {
    taskId: string;
    value?: IRepeats;
    disabled?: boolean;
}
export const TIRepeats: FunctionComponent<ITIRepeatsProps> = ({ taskId, value, disabled }) => {
    const repeatsLabel = useMemo(() => {
        if (!value) return disabled ? "No repeat" : translate("Add repeat");

        switch (value.type) {
            case REPEATTYPE.DAILY:
                return translate("Daily");
            case REPEATTYPE.WEEKLY:
                return translate("Weekly");
            case REPEATTYPE.MONTHLY:
                return translate("Monthly");
            case REPEATTYPE.YEARLY:
                return translate("Yearly");
            case REPEATTYPE.PERIODICALLY:
                return translate("Periodically");
        }
    }, [value]);

    const repeatsTooltip = useMemo(() => {
        return RepeatsTooltipContent(value);
    }, [value]);

    const handleRemove = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        TasksActions.setRepeats(taskId);
    };

    const handleSetDefault = () => {
        if (!value) {
            TasksActions.setRepeats(taskId, { ...defaultRepeats });
        }
    };

    return (
        <Popover
            content={
                <RepeatPicker
                    value={value}
                    onChange={(value?: IRepeats) => TasksActions.setRepeats(taskId, value)}
                />
            }
            popoverClassName="popover-padded-medium"
            onOpening={handleSetDefault}
        >
            <>
                {!value && <RoundButton dashed title="Add repeats" disabled={disabled} />}
                {value && (
                    <Tooltip content={repeatsTooltip} disabled={!value} placement="top">
                        <Tag
                            minimal
                            interactive={!disabled}
                            icon={<Icon icon="refresh" size={14} />}
                            intent={Intent.SUCCESS}
                            onRemove={!disabled && value ? handleRemove : undefined}
                        >
                            {repeatsLabel}
                        </Tag>
                    </Tooltip>
                )}
            </>
        </Popover>
    );
};

export const RepeatsTooltipContent = (value?: IRepeats) => {
    if (!value) return "";
    switch (value.type) {
        case REPEATTYPE.DAILY:
            return "Repeats every day after completion";
        case REPEATTYPE.WEEKLY:
            return `Repeats every week on the following days [${value.value.split(",").map((day: string) =>
                format(setDay(new Date(), Number(day)), "eee")
            )}] after completion`;
        case REPEATTYPE.MONTHLY:
            return `Repeats every month on the ${
                value.value === "last"
                    ? "last day"
                    : format(setDate(new Date(), parseInt(value.value, 10)), "d")
            } after completion`;
        case REPEATTYPE.YEARLY:
            return "Every year after completion";
        case REPEATTYPE.PERIODICALLY:
            return `${value.value} days after completion`;
    }
};
