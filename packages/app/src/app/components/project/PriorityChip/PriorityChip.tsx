// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent, useMemo } from "react";
import { Colors, Intent, Tag, Tooltip } from "@blueprintjs/core";
import { TASK_PRIORITY } from "app/locale/dynamic-messages";

import { PRIORITY, PRIORITYICON } from "@stacks/types";
import { Icon } from "app/components/common";

interface IPriorityChipProps {
    priority?: PRIORITY;
    interactive?: boolean;
    short?: boolean;
    id?: string;
    testId?: string;
    onRemove?: () => void;
}
export const PriorityChip: FunctionComponent<IPriorityChipProps> = ({
    priority,
    interactive,
    short,
    id,
    testId,
    onRemove,
}) => {
    const intent = useMemo(() => {
        if (!priority) return Intent.NONE;
        switch (priority) {
            case PRIORITY.LOW:
                return Intent.SUCCESS;
            case PRIORITY.MEDIUM:
                return Intent.WARNING;
            case PRIORITY.HIGH:
            case PRIORITY.CRITICAL:
                return Intent.DANGER;
        }
    }, [priority]);

    const icon = useMemo(() => {
        if (!priority) return undefined;
        switch (priority) {
            case PRIORITY.LOW:
                return PRIORITYICON.LOW;
            case PRIORITY.MEDIUM:
                return PRIORITYICON.MEDIUM;
            case PRIORITY.HIGH:
                return PRIORITYICON.HIGH;
            case PRIORITY.CRITICAL:
                return PRIORITYICON.CRITICAL;
        }
    }, [priority]);

    const color = useMemo(() => {
        if (!priority) return undefined;
        switch (priority) {
            case PRIORITY.LOW:
                return Colors.GREEN3;
            case PRIORITY.MEDIUM:
                return Colors.ORANGE3;
            case PRIORITY.HIGH:
                return Colors.RED3;
            case PRIORITY.CRITICAL:
                return Colors.VERMILION3;
        }
    }, [priority]);

    if (!priority) return null;

    return (
        <Tooltip
            disabled={!short}
            content={TASK_PRIORITY[priority]}
            placement="top"
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            renderTarget={({ isOpen, ...props }) =>
                short ? (
                    <span
                        style={{ position: "relative", width: 20, height: 20, display: "inline-block" }}
                        data-testid={testId || "priority-button"}
                        {...props}
                    >
                        <Icon
                            icon="alert-circle-filled"
                            size={24}
                            color={color}
                            style={{ position: "absolute", top: -2, left: -2 }}
                        />
                    </span>
                ) : (
                    <Tag
                        id={id}
                        intent={intent}
                        minimal
                        icon={<Icon icon={icon} size={12} />}
                        interactive={interactive}
                        onRemove={onRemove}
                        data-testid={testId || "priority-button"}
                        {...props}
                    >
                        {TASK_PRIORITY[priority]}
                    </Tag>
                )
            }
        />
    );
};
