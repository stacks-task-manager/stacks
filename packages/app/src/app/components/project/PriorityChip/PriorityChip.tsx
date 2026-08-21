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
const PriorityChipInner: FunctionComponent<IPriorityChipProps> = ({
    priority,
    interactive,
    short,
    id,
    testId,
    onRemove,
}) => {
    const visual = useMemo(() => {
        if (!priority) return null;
        switch (priority) {
            case PRIORITY.LOW:
                return { intent: Intent.SUCCESS, icon: PRIORITYICON.LOW, color: Colors.GREEN3 };
            case PRIORITY.MEDIUM:
                return { intent: Intent.WARNING, icon: PRIORITYICON.MEDIUM, color: Colors.ORANGE3 };
            case PRIORITY.HIGH:
                return { intent: Intent.DANGER, icon: PRIORITYICON.HIGH, color: Colors.RED3 };
            case PRIORITY.CRITICAL:
                return { intent: Intent.DANGER, icon: PRIORITYICON.CRITICAL, color: Colors.VERMILION3 };
        }
    }, [priority]);

    if (!priority || !visual) return null;

    const { intent, icon, color } = visual;

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

export const PriorityChip = React.memo(PriorityChipInner);
